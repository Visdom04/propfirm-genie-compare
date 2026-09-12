#!/usr/bin/env node
/**
 * Add EXTENDED_HEADERS to firm-plans.tsv and seed values.
 * - Account Category: inferred (Challenge | S2F)
 * - Min / Daily / News: scripts/firm-plans-extended-overrides.json (+ planType overrides)
 * - List Price / Discount %: from matching src/data/firms.js plan when available
 *
 * Idempotent: re-run keeps existing non-empty extended cells.
 *
 * Usage: node scripts/extend-firm-plans-cols.mjs [--write]
 * Default dry-run prints summary; --write updates TSV.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXTENDED_HEADERS,
  FIRM_NAME_MAP,
  formatAccountSize,
  inferAccountCategory,
  parseTsv,
} from './lib/firm-plans-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsvPath = path.join(__dirname, 'firm-plans.tsv');
const overridesPath = path.join(__dirname, 'firm-plans-extended-overrides.json');
const write = process.argv.includes('--write');

function loadOverrides() {
  if (!fs.existsSync(overridesPath)) return {};
  const raw = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
  delete raw._comment;
  return raw;
}

function lookupOverride(overrides, firmRaw, planType) {
  const firm = overrides[firmRaw] || overrides[FIRM_NAME_MAP[firmRaw] || firmRaw] || {};
  const fromType = firm.planTypes?.[planType] || {};
  return {
    minTradingDays: fromType.minTradingDays ?? firm.minTradingDays ?? '',
    dailyDrawdown: fromType.dailyDrawdown ?? firm.dailyDrawdown ?? '',
    newsTrading: fromType.newsTrading ?? firm.newsTrading ?? '',
  };
}

async function loadListPriceIndex() {
  const { firms } = await import('../src/data/firms.js');
  const map = new Map();
  for (const f of firms) {
    for (const p of f.plans || []) {
      const key = `${f.name}::${p.planType}::${p.accountSize}`;
      const list = p.listPrice || p.priceWas || null;
      const discountPct =
        list && p.price && list > p.price ? Math.round((1 - p.price / list) * 100) : null;
      map.set(key, { list, discountPct, price: p.price });
    }
  }
  return map;
}

function moneyCell(n) {
  if (n == null || Number.isNaN(n)) return '';
  if (Number.isInteger(n)) return `$${n.toLocaleString('en-US')}`;
  return `$${n}`;
}

function parsePriceCell(raw) {
  const s = String(raw || '').trim();
  const m = s.replace(/,/g, '').match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

const text = fs.readFileSync(tsvPath, 'utf8');
const { headers, rows } = parseTsv(text, { fileLabel: tsvPath });
const overrides = loadOverrides();
const listIndex = await loadListPriceIndex();

const nextHeaders = [...headers];
for (const h of EXTENDED_HEADERS) {
  if (!nextHeaders.includes(h)) nextHeaders.push(h);
}

let filledCategory = 0;
let filledRules = 0;
let filledPrice = 0;
let kept = 0;

const outRows = rows.map(row => {
  const cells = {};
  for (const h of nextHeaders) cells[h] = '';

  // restore core from parsed row fields / original
  const coreMap = {
    Firm: row.firmRaw || row.firmName,
    'Plan Type': row.planType,
    'Account Size': row.accountSize,
    'Drawdown Type': row.drawdownType,
    'Activation Fee': row.activationFee,
    'Profit Target': row.profitTarget,
    'Max Drawdown': row.maxDrawdown,
    'Max Contract': row.maxContract,
    'Consistency Rule Eval, Funded': row.consistency,
    'Payout Freq.': row.payoutFreq,
    'Profit Split': row.profitSplit,
    Price: row.price,
    'Promo CODE': row.promoCode,
    'Account Category': row.accountCategory || '',
    'Min Trading Days': row.minTradingDays || '',
    'Daily Drawdown': row.dailyDrawdown || '',
    'News Trading': row.newsTrading || '',
    'List Price': row.listPrice || '',
    'Discount %': row.discountPct || '',
    'Price Note': row.priceNote || '',
  };

  for (const [k, v] of Object.entries(coreMap)) {
    if (nextHeaders.includes(k)) cells[k] = v == null ? '' : String(v);
  }

  // Account Category
  if (!cells['Account Category'].trim()) {
    cells['Account Category'] = inferAccountCategory(
      row.planType,
      row.profitTarget,
      null
    );
    filledCategory += 1;
  } else {
    kept += 1;
  }

  // Rules from overrides if blank
  const ov = lookupOverride(overrides, row.firmRaw || row.firmName, row.planType);
  if (!cells['Min Trading Days'].trim() && ov.minTradingDays) {
    cells['Min Trading Days'] = ov.minTradingDays;
    filledRules += 1;
  }
  if (!cells['Daily Drawdown'].trim() && ov.dailyDrawdown) {
    cells['Daily Drawdown'] = ov.dailyDrawdown;
    filledRules += 1;
  }
  if (!cells['News Trading'].trim() && ov.newsTrading) {
    cells['News Trading'] = ov.newsTrading;
    filledRules += 1;
  }

  // List price / discount from firms.js
  const sizeFmt = formatAccountSize(row.accountSize);
  const canonFirm = FIRM_NAME_MAP[row.firmName] || row.firmName;
  const hit =
    listIndex.get(`${canonFirm}::${row.planType}::${sizeFmt}`) ||
    listIndex.get(`${row.firmName}::${row.planType}::${sizeFmt}`);

  if (!cells['List Price'].trim() && hit?.list) {
    cells['List Price'] = moneyCell(hit.list);
    filledPrice += 1;
  }
  if (!cells['Discount %'].trim()) {
    const list = parsePriceCell(cells['List Price']) || hit?.list;
    const price = parsePriceCell(row.price);
    if (list && price && list > price) {
      cells['Discount %'] = String(Math.round((1 - price / list) * 100));
      filledPrice += 1;
    } else if (hit?.discountPct != null) {
      cells['Discount %'] = String(hit.discountPct);
      filledPrice += 1;
    }
  }

  return cells;
});

const lines = [
  nextHeaders.join('\t'),
  ...outRows.map(cells => nextHeaders.map(h => String(cells[h] ?? '').replace(/\t/g, ' ')).join('\t')),
];
const out = `${lines.join('\n')}\n`;

console.log(
  JSON.stringify(
    {
      mode: write ? 'write' : 'dry-run',
      rows: outRows.length,
      headersBefore: headers.length,
      headersAfter: nextHeaders.length,
      addedHeaders: EXTENDED_HEADERS.filter(h => !headers.includes(h)),
      filledCategory,
      filledRules,
      filledPrice,
      keptCategoryNonEmpty: kept,
    },
    null,
    2
  )
);

if (write) {
  fs.writeFileSync(tsvPath, out, 'utf8');
  console.log(`Wrote ${tsvPath}`);
} else {
  console.log('Re-run with --write to update firm-plans.tsv');
}
