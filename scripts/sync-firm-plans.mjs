#!/usr/bin/env node
/**
 * Sync src/data/firms.js plan rows from scripts/firm-plans.tsv
 * Validates first; preserves firm-level metadata for existing firms.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadFirmPlans,
  parseFirmsMetaTsv,
  rowToPlan,
} from './lib/firm-plans-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tsvPath = path.join(__dirname, 'firm-plans.tsv');
const metaPath = path.join(__dirname, 'firms-meta.tsv');
const firmsPath = path.join(root, 'src/data/firms.js');

const NEW_FIRM_META = {
  'Nexgen ProTrader Funding': {
    name: 'Nexgen ProTrader Funding',
    logo: '/firm/nexgen-protrader.svg',
    rating: 4.2,
    reviews: 28,
    description:
      'Futures prop firm with Evaluation and Instant funded paths, progressive profit split to 100%.',
    platforms: ['NinjaTrader', 'Tradovate'],
    maxAccounts: '5',
    maxAlloc: '$150K',
    promoCode: 'KAGE',
    discount: 'KAGE promo pricing',
    website: 'nexgenfunding.com',
    type: 'Challenge',
    countryCode: 'US',
    likes: 1200,
    years: 2,
    yearsLabel: '2',
    assets: ['Futures'],
    allocPct: 0.52,
    isNew: true,
    isPopular: false,
  },
  DayTraders: {
    name: 'DayTraders',
    logo: '/firm/daytraders.png',
    rating: 4.3,
    reviews: 42,
    description:
      'Futures prop firm with Trailing, EOD, Static, S2L, and Instant (S2F) account paths.',
    platforms: ['NinjaTrader', 'Tradovate'],
    maxAccounts: '5',
    maxAlloc: '$300K',
    promoCode: 'KAGE',
    discount: 'KAGE promo pricing',
    website: 'daytraders.com',
    type: 'Challenge',
    countryCode: 'US',
    likes: 2100,
    years: 2,
    yearsLabel: '2',
    assets: ['Futures'],
    allocPct: 0.6,
    isNew: true,
    isPopular: true,
  },
  'IQ Capital': {
    name: 'IQ Capital',
    logo: 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms/IQ%20Capital.webp',
    rating: 0,
    reviews: 0,
    description:
      'Futures prop firm with Core, Core DLL, Rapid, Instant, and Instant DLL paths. 80/90% profit split, news trading allowed.',
    platforms: ['Volumetrica IQC Trader', 'DeepCharts', 'ATAS', 'Quantower'],
    maxAccounts: '10',
    maxAlloc: '$2,000,000',
    promoCode: 'KAGE',
    discount: '80% OFF',
    website: 'iqcapital.io',
    type: 'Challenge',
    countryCode: 'LC',
    likes: 0,
    years: 0,
    yearsLabel: 'N/A',
    assets: ['Futures'],
    allocPct: 0.85,
    isNew: true,
    isPopular: false,
  },
  Topstep: {
    name: 'Topstep',
    logo: 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms/Topstep.webp',
    rating: 3.4,
    reviews: 39,
    description:
      'Futures prop firm since 2012 with Standard and No Activation Fee paths. 90% profit split, payouts every 5 trading days, news trading allowed.',
    platforms: ['Project X', 'Plus500'],
    maxAccounts: '—',
    maxAlloc: '$750,000',
    promoCode: 'KAGE',
    discount: 'No verified offer',
    website: 'topstep.com',
    type: 'Challenge',
    countryCode: 'US',
    likes: 0,
    years: 14,
    yearsLabel: '14',
    assets: ['Futures'],
    allocPct: 0.72,
    isNew: true,
    isPopular: false,
  },
  'Traders Launch': {
    name: 'Traders Launch',
    logo: 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms/Traders%20Launch.webp',
    rating: 4.8,
    reviews: 7,
    description:
      'Futures prop firm with NYC and 22-Hour sessions at 55% or 80% split. Monthly evaluation, daily payouts, news trading allowed.',
    platforms: ['Quantower', 'TradingView', 'Volumetrica'],
    maxAccounts: '5',
    maxAlloc: '$1,500,000',
    promoCode: 'KAGE',
    discount: 'No verified offer',
    website: 'traderslaunch.com',
    type: 'Challenge',
    countryCode: 'US',
    likes: 0,
    years: 3,
    yearsLabel: '3',
    assets: ['Futures'],
    allocPct: 0.8,
    isNew: true,
    isPopular: false,
  },
};

function loadFirmMeta() {
  if (!fs.existsSync(metaPath)) return new Map();
  return parseFirmsMetaTsv(fs.readFileSync(metaPath, 'utf8'));
}

function jsString(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function jsArray(arr) {
  return `[${arr.map(v => (typeof v === 'string' ? jsString(v) : String(v))).join(', ')}]`;
}

function serializePlan(plan, indent = 6) {
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 2);
  const lines = [`${pad}plan({`];
  for (const [k, v] of Object.entries(plan)) {
    if (v === undefined) continue;
    let val;
    if (typeof v === 'string') val = jsString(v);
    else if (v === null) val = 'null';
    else val = String(v);
    lines.push(`${pad2}${k}: ${val},`);
  }
  lines.push(`${pad}}),`);
  return lines.join('\n');
}

function serializeFirm(meta, plans, indent = 2) {
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 2);
  const sizes = [...new Set(plans.map(p => p.accountSize))].sort(
    (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
  );
  const steps = [...new Set(plans.map(p => p.steps))];
  const priceTypes = [...new Set(plans.map(p => p.priceType))];

  const lines = [];
  lines.push(`${pad}{`);
  for (const [k, v] of Object.entries(meta)) {
    if (k === 'plans' || k === 'accountSizes' || k === 'steps' || k === 'priceType') continue;
    let val;
    if (Array.isArray(v)) val = jsArray(v);
    else if (typeof v === 'string') val = jsString(v);
    else val = String(v);
    lines.push(`${pad2}${k}: ${val},`);
  }
  lines.push(`${pad2}accountSizes: ${jsArray(sizes)},`);
  lines.push(`${pad2}steps: ${jsArray(steps)},`);
  lines.push(`${pad2}priceType: ${jsArray(priceTypes)},`);
  lines.push(`${pad2}plans: [`);
  for (const p of plans) lines.push(serializePlan(p, indent + 4));
  lines.push(`${pad2}],`);
  lines.push(`${pad}},`);
  return lines.join('\n');
}

function extractFirmBlocks(src) {
  const start = src.indexOf('export const firms = [');
  if (start < 0) throw new Error('firms array not found');
  const arrStart = src.indexOf('[', start);
  const found = [];
  const nameRe = /\n  \{\n    name: ['"]([^'"]+)['"]/g;
  let m;
  while ((m = nameRe.exec(src))) {
    const name = m[1];
    const startBrace = src.indexOf('{', m.index);
    let d = 0;
    let end = startBrace;
    for (let j = startBrace; j < src.length; j += 1) {
      if (src[j] === '{') d += 1;
      else if (src[j] === '}') {
        d -= 1;
        if (d === 0) {
          end = j + 1;
          break;
        }
      }
    }
    found.push({ name, start: startBrace, end, block: src.slice(startBrace, end) });
  }
  return { found, arrStart, header: src.slice(0, arrStart + 1) };
}

function replacePlansInBlock(block, plans) {
  const plansIdx = block.indexOf('plans: [');
  if (plansIdx < 0) throw new Error('plans not found in block');
  const open = block.indexOf('[', plansIdx);
  let d = 0;
  let close = -1;
  for (let i = open; i < block.length; i += 1) {
    if (block[i] === '[') d += 1;
    else if (block[i] === ']') {
      d -= 1;
      if (d === 0) {
        close = i;
        break;
      }
    }
  }
  const planBody = plans.map(p => serializePlan(p, 6)).join('\n');
  let next = `${block.slice(0, open + 1)}\n${planBody}\n    ${block.slice(close)}`;

  const sizes = [...new Set(plans.map(p => p.accountSize))].sort(
    (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
  );
  const stepOpts = [...new Set(plans.map(p => p.steps))];
  const priceTypes = [...new Set(plans.map(p => p.priceType))];
  next = next.replace(/accountSizes:\s*\[[^\]]*\]/, `accountSizes: ${jsArray(sizes)}`);
  next = next.replace(/steps:\s*\[[^\]]*\]/, `steps: ${jsArray(stepOpts)}`);
  next = next.replace(/priceType:\s*\[[^\]]*\]/, `priceType: ${jsArray(priceTypes)}`);
  if (plans.length) {
    next = next.replace(/comingSoon:\s*true/, 'comingSoon: false');
  }
  return next;
}

function applyFirmMeta(block, meta) {
  if (!meta) return block;
  let next = block;
  if (meta.affiliateLink) {
    if (/affiliateLink:/.test(next)) {
      next = next.replace(/affiliateLink:\s*'[^']*'/, `affiliateLink: ${jsString(meta.affiliateLink)}`);
    } else {
      next = next.replace(/website:\s*'[^']*',/, m => `${m}\n    affiliateLink: ${jsString(meta.affiliateLink)},`);
    }
  }
  if (meta.lastVerified) {
    if (/lastVerified:/.test(next)) {
      next = next.replace(/lastVerified:\s*'[^']*'/, `lastVerified: ${jsString(meta.lastVerified)}`);
    } else {
      next = next.replace(/website:\s*'[^']*',/, m => `${m}\n    lastVerified: ${jsString(meta.lastVerified)},`);
    }
  }
  if (meta.verifiedBy) {
    if (/verifiedBy:/.test(next)) {
      next = next.replace(/verifiedBy:\s*'[^']*'/, `verifiedBy: ${jsString(meta.verifiedBy)}`);
    } else if (meta.lastVerified) {
      next = next.replace(/lastVerified:\s*'[^']*',/, m => `${m}\n    verifiedBy: ${jsString(meta.verifiedBy)},`);
    }
  }
  if (typeof meta.isPopular === 'boolean') {
    next = next.replace(/isPopular:\s*(true|false)/, `isPopular: ${meta.isPopular}`);
  }
  if (meta.maxAlloc) {
    if (/maxAlloc:/.test(next)) {
      next = next.replace(/maxAlloc:\s*(?:'[^']*'|"[^"]*")/, `maxAlloc: ${jsString(meta.maxAlloc)}`);
    }
  }
  if (typeof meta.rating === 'number') {
    next = next.replace(/rating:\s*[\d.]+/, `rating: ${meta.rating}`);
  }
  if (typeof meta.reviews === 'number') {
    next = next.replace(/reviews:\s*\d+/, `reviews: ${meta.reviews}`);
  }
  return next;
}

async function main() {
  const loaded = await loadFirmPlans(tsvPath);
  const { validation, rows } = loaded;

  if (validation.errors.length) {
    console.error('Validation failed — fix firm-plans.tsv before sync:\n');
    for (const e of validation.errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  for (const w of validation.warnings) console.warn(`⚠ ${w}`);

  const parsed = rows.map(rowToPlan);
  const firmMeta = loadFirmMeta();
  const byFirm = new Map();
  for (const { firmName, plan } of parsed) {
    if (!byFirm.has(firmName)) byFirm.set(firmName, []);
    byFirm.get(firmName).push(plan);
  }

  let src = fs.readFileSync(firmsPath, 'utf8');
  src = src.replace(
    /Synced from[^\n]*/,
    'Synced from scripts/firm-plans.tsv + scripts/firms-meta.tsv — promo KAGE.'
  );

  let { found } = extractFirmBlocks(src);
  const seen = new Set();
  const dupes = [];
  for (const f of found) {
    if (seen.has(f.name)) dupes.push(f);
    else seen.add(f.name);
  }
  for (const f of dupes.sort((a, b) => b.start - a.start)) {
    let from = f.start;
    while (from > 0 && /[\s,]/.test(src[from - 1])) from -= 1;
    src = `${src.slice(0, from)}\n${src.slice(f.end)}`;
    console.log('Removed duplicate firm', f.name);
  }

  ({ found } = extractFirmBlocks(src));
  const existingNames = new Set(found.map(f => f.name));

  const updates = found.filter(f => byFirm.has(f.name)).sort((a, b) => b.start - a.start);

  for (const f of updates) {
    const plans = byFirm.get(f.name);
    const popMatch = f.block.match(/popularity:\s*(\d+)/);
    const likesMatch = f.block.match(/likes:\s*(\d+)/);
    const pop = Number(popMatch?.[1] || likesMatch?.[1] || 1000);
    for (const p of plans) p.popularity = pop;
    let newBlock = replacePlansInBlock(f.block, plans);
    newBlock = applyFirmMeta(newBlock, firmMeta.get(f.name));
    src = src.slice(0, f.start) + newBlock + src.slice(f.end);
  }

  ({ found } = extractFirmBlocks(src));
  const namesNow = new Set(found.map(f => f.name));
  for (const [name, plans] of byFirm) {
    if (namesNow.has(name) || existingNames.has(name)) continue;
    const meta = NEW_FIRM_META[name];
    if (!meta) {
      console.warn('No meta for new firm', name);
      continue;
    }
    const sheetMeta = firmMeta.get(name);
    if (sheetMeta?.isPopular) meta.isPopular = true;
    if (sheetMeta?.affiliateLink) meta.affiliateLink = sheetMeta.affiliateLink;
    if (sheetMeta?.lastVerified) meta.lastVerified = sheetMeta.lastVerified;
    if (sheetMeta?.verifiedBy) meta.verifiedBy = sheetMeta.verifiedBy;
    if (sheetMeta?.maxAlloc) meta.maxAlloc = sheetMeta.maxAlloc;
    if (typeof sheetMeta?.rating === 'number') meta.rating = sheetMeta.rating;
    if (typeof sheetMeta?.reviews === 'number') meta.reviews = sheetMeta.reviews;
    for (const p of plans) p.popularity = meta.likes;
    const block = serializeFirm(meta, plans, 2);
    const insertAt = src.lastIndexOf('\n];');
    if (insertAt < 0) throw new Error('cannot find end of firms array');
    const before = src.slice(0, insertAt).replace(/\}\s*$/, '},');
    src = `${before}\n${block}${src.slice(insertAt)}`;
    namesNow.add(name);
    console.log('Added firm', name, plans.length, 'plans');
  }

  fs.writeFileSync(firmsPath, src);
  console.log(
    'Updated firms:',
    [...byFirm.keys()].join(', '),
    `\nTotal plan rows: ${parsed.length}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
