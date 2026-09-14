/**
 * Shared parser + validator for scripts/firm-plans.tsv
 * Header-driven columns so Google Sheet column order stays flexible.
 * No top-level fs — safe to import from Next.js API routes.
 */

import { salePriceOf } from './plan-price.mjs';

export const FIRM_NAME_MAP = {
  FundedNext: 'FundedNext Futures',
  YRM: 'YRM Prop',
  TradersLaunch: 'Traders Launch',
  'Blue Guardian Futures': 'Blue Guardian',
  'The Trading Pit Futures': 'The Trading Pit',
  'Purdia Capital': 'Purdia',
  'FTMO Futures': 'FTMO',
};

export const CORE_HEADERS = [
  'Firm',
  'Plan Type',
  'Account Size',
  'Drawdown Type',
  'Activation Fee',
  'Profit Target',
  'Max Drawdown',
  'Max Contract',
  'Consistency Rule Eval, Funded',
  'Payout Freq.',
  'Profit Split',
  'Price',
  'Promo CODE',
];

export const EXTENDED_HEADERS = [
  'Account Category',
  'Min Trading Days',
  'Daily Drawdown',
  'News Trading',
  'List Price',
  'Discount %',
  'Price Note',
  'Info',
];

/** Firms tab — extra columns after Offer are optional. */
export const FIRMS_META_HEADERS = [
  'Firm',
  'Affiliate Link',
  'Last Verified',
  'Verified By',
  'isPopular',
  'Max Allocation',
  'Rating',
  'Reviews',
  'Offer',
  'Country',
  'Years',
  'Assets',
  'Platforms',
];

const COUNTRY_PARSE = {
  US: 'US',
  USA: 'US',
  'UNITED STATES': 'US',
  AE: 'AE',
  UAE: 'AE',
  'UNITED ARAB EMIRATES': 'AE',
  CY: 'CY',
  CYPRUS: 'CY',
  CZ: 'CZ',
  CZECHIA: 'CZ',
  'CZECH REPUBLIC': 'CZ',
  GB: 'GB',
  UK: 'GB',
  'UNITED KINGDOM': 'GB',
  CA: 'CA',
  CANADA: 'CA',
  AU: 'AU',
  AUSTRALIA: 'AU',
  LC: 'LC',
  'SAINT LUCIA': 'LC',
  'ST LUCIA': 'LC',
};

export const ACCOUNT_CATEGORIES = new Set(['Challenge', 'S2F']);
export const NEWS_TRADING_VALUES = new Set(['both', 'eval', 'none']);

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function formatAccountSize(raw) {
  const m = String(raw).trim().match(/([\d.]+)\s*k/i);
  if (m) return `$${m[1]}K`;
  const n = String(raw).trim().match(/([\d,]+)/);
  if (n) {
    const v = Number(n[1].replace(/,/g, ''));
    if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  }
  return String(raw).trim();
}

export function parseMoney(raw) {
  const s = String(raw || '').trim();
  if (!s || /^none$/i.test(s) || s === '—' || s === '-') return null;
  const m = s.match(/([\d,]+(?:\.\d+)?)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

export function parseOptionalNumber(raw) {
  const s = String(raw || '').trim();
  if (!s || /^none$/i.test(s) || s === '—' || s === '-') return null;
  const m = s.match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

export function normalizeNewsTrading(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (NEWS_TRADING_VALUES.has(s)) return s;
  if (/^(both|allowed|yes|all|any)$/.test(s)) return 'both';
  if (/^eval(uation)?(\s*only)?$/.test(s)) return 'eval';
  if (/^(none|no|n\/a|forbidden|prohibited|not allowed)$/.test(s)) return 'none';
  return '';
}

export function inferAccountCategory(planType, profitTarget, explicit) {
  if (explicit && ACCOUNT_CATEGORIES.has(explicit)) return explicit;
  const t = `${planType} ${profitTarget}`.toLowerCase();
  if (
    /direct|lightning|instant|s2f|straight to funded|express to live/.test(t) ||
    /straight to funded|instant funded/.test(String(profitTarget).toLowerCase()) ||
    String(profitTarget).trim().toLowerCase() === 'none'
  ) {
    return 'S2F';
  }
  return 'Challenge';
}

export function inferSteps(planType, profitTarget) {
  const t = `${planType} ${profitTarget}`.toLowerCase();
  if (
    /direct|lightning|instant|s2f|straight to funded|express to live/.test(t) ||
    /—\s*\(|instant funded|straight to funded/.test(String(profitTarget).toLowerCase()) ||
    String(profitTarget).trim().toLowerCase() === 'none'
  ) {
    if (/direct|s2f|straight/.test(t)) return 'Direct / STF';
    return 'Instant';
  }
  return '1 Step';
}

export function parseConsistency(raw) {
  const s = String(raw || '').trim();
  if (!s || /^none$/i.test(s)) return { eval: 'None', funded: 'None' };
  if (s.includes(' / ')) {
    const [a, ...rest] = s.split(' / ');
    const funded = rest.join(' / ').trim();
    return { eval: a.trim() || 'None', funded: funded || 'None' };
  }
  return { eval: s, funded: 'None' };
}

export function parseMaxLots(raw) {
  const s = String(raw || '').trim();
  const pair = s.match(/^(\d+)\s*[\/|]\s*(\d+)(.*)$/);
  if (pair) {
    return {
      maxLots: `${pair[1]} | ${pair[2]}`,
      maxLotsNote: pair[3].trim() || undefined,
    };
  }
  const withMicros = s.match(/^(\d+)\s*\((\d+)\s*micros?\)(.*)$/i);
  if (withMicros) {
    return {
      maxLots: `${withMicros[1]} | ${withMicros[2]}`,
      maxLotsNote: withMicros[3].trim() || undefined,
    };
  }
  const withNote = s.match(/^(\d+)\s*(\(.+\))$/);
  if (withNote) return { maxLots: withNote[1], maxLotsNote: withNote[2] };
  return { maxLots: s, maxLotsNote: undefined };
}

export function parsePrice(raw) {
  const s = String(raw || '').trim();
  const priceMatch = s.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
  const wasMatch = s.match(/was\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  const priceWas = wasMatch ? Number(wasMatch[1].replace(/,/g, '')) : null;
  let priceType = 'One Time';
  if (/monthly/i.test(s)) priceType = 'Monthly';
  else if (/one[- ]?time/i.test(s)) priceType = 'One Time';
  return { price, priceWas, priceType, priceNote: s };
}

export function parseProfitSplit(raw) {
  const s = String(raw || '').trim();
  if (/^\d+(\.\d+)?%$/.test(s)) {
    return { profitSplit: Number(s.replace('%', '')), profitSplitLabel: undefined };
  }
  const first = s.match(/([\d.]+)\s*%/);
  return {
    profitSplit: first ? Number(first[1]) : 0,
    profitSplitLabel: s,
  };
}

export function computePtDd(profitTarget, maxLoss) {
  const pt = Number(String(profitTarget).replace(/,/g, '').match(/[\d.]+/)?.[0] || 0);
  const dd = Number(String(maxLoss).replace(/,/g, '').match(/[\d.]+/)?.[0] || 0);
  if (!pt || !dd) return '—';
  return `1:${(dd / pt).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function headerIndex(headers) {
  const map = new Map();
  headers.forEach((h, i) => map.set(h.trim(), i));
  return map;
}

function parseBoolCell(raw) {
  const s = String(raw || '').trim();
  if (/^(true|yes|1|on|y)$/i.test(s)) return true;
  if (/^(false|no|0|off|n)$/i.test(s)) return false;
  return undefined;
}

function parseEnabledCell(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return undefined;
  if (/^(false|no|0|off|n|disabled|hide|hidden)$/.test(s)) return false;
  if (/^(true|yes|1|on|y|enabled|live|show)$/.test(s)) return true;
  return undefined;
}

function parseLogoCell(raw) {
  const s = String(raw || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function parseNumberCell(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/,/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseListCell(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '—' || s === '-') return [];
  return s
    .split(/[,;]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function parseCountryCell(raw) {
  const s = String(raw || '').trim();
  if (!s) return undefined;
  return COUNTRY_PARSE[s.toUpperCase()] || (s.length === 2 ? s.toUpperCase() : undefined);
}

function parseYearsCell(raw) {
  const s = String(raw || '').trim();
  if (!s) return {};
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return { years: 0, yearsLabel: s };
  return { years: Number(m[1]), yearsLabel: s };
}

function colAny(cols, idxMap, names, fallbackIdx) {
  for (const name of names) {
    if (idxMap.has(name)) return col(cols, idxMap, name, fallbackIdx);
  }
  return col(cols, idxMap, names[0], fallbackIdx);
}

/** Header-driven Firms tab. Unknown extra columns are ignored. */
export function parseFirmsMetaTsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter(l => l.trim());
  const map = new Map();
  if (lines.length < 2) return map;
  const headers = lines[0].split('\t').map(h => h.trim());
  const idxMap = headerIndex(headers);
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split('\t');
    const firm = col(cols, idxMap, 'Firm', 0);
    if (!firm) continue;
    const name = FIRM_NAME_MAP[firm] || firm;
    const isPopular = parseBoolCell(col(cols, idxMap, 'isPopular', 4));
    const maxAlloc = col(cols, idxMap, 'Max Allocation', 5);
    const rating = parseNumberCell(col(cols, idxMap, 'Rating', 6));
    const reviews = parseNumberCell(col(cols, idxMap, 'Reviews', 7));
    const countryCode = parseCountryCell(colAny(cols, idxMap, ['Country', 'Country Code'], 9));
    const yearsMeta = parseYearsCell(colAny(cols, idxMap, ['Years', 'Years in operation'], 10));
    const assets = parseListCell(col(cols, idxMap, 'Assets', 11));
    const platforms = parseListCell(col(cols, idxMap, 'Platforms', 12));
    const enabled = parseEnabledCell(colAny(cols, idxMap, ['Enabled', 'Live', 'Active', 'Show'], 13));
    const logo = parseLogoCell(colAny(cols, idxMap, ['Logo', 'Logo URL', 'Image'], 14));
    map.set(name, {
      affiliateLink: col(cols, idxMap, 'Affiliate Link', 1) || undefined,
      lastVerified: col(cols, idxMap, 'Last Verified', 2) || undefined,
      verifiedBy: col(cols, idxMap, 'Verified By', 3) || undefined,
      ...(typeof isPopular === 'boolean' ? { isPopular } : {}),
      ...(maxAlloc ? { maxAlloc } : {}),
      ...(typeof rating === 'number' ? { rating } : {}),
      ...(typeof reviews === 'number' ? { reviews } : {}),
      ...(col(cols, idxMap, 'Offer') ? { discount: col(cols, idxMap, 'Offer') } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(typeof yearsMeta.years === 'number' ? yearsMeta : {}),
      ...(assets.length ? { assets } : {}),
      ...(platforms.length ? { platforms } : {}),
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(logo ? { logo } : {}),
    });
  }
  return map;
}

function col(cols, idxMap, name, fallbackIdx) {
  const idx = idxMap.has(name) ? idxMap.get(name) : fallbackIdx;
  if (idx == null || idx >= cols.length) return '';
  return (cols[idx] || '').trim();
}

export function parseTsv(text, { fileLabel = 'firm-plans.tsv' } = {}) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error(`${fileLabel}: file must have a header row and at least one data row`);
  }

  const headers = lines[0].split('\t').map(h => h.trim());
  const idxMap = headerIndex(headers);

  for (const required of CORE_HEADERS) {
    if (!idxMap.has(required)) {
      throw new Error(`${fileLabel}: missing required column "${required}"`);
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split('\t');
    const firmRaw = col(cols, idxMap, 'Firm', 0);
    const planType = col(cols, idxMap, 'Plan Type', 1);
    if (!firmRaw || !planType) continue;

    const row = {
      line: i + 1,
      firmRaw,
      firmName: FIRM_NAME_MAP[firmRaw] || firmRaw,
      planType,
      accountSize: col(cols, idxMap, 'Account Size', 2),
      drawdownType: col(cols, idxMap, 'Drawdown Type', 3),
      activationFee: col(cols, idxMap, 'Activation Fee', 4),
      profitTarget: col(cols, idxMap, 'Profit Target', 5),
      maxDrawdown: col(cols, idxMap, 'Max Drawdown', 6),
      maxContract: col(cols, idxMap, 'Max Contract', 7),
      consistency: col(cols, idxMap, 'Consistency Rule Eval, Funded', 8),
      payoutFreq: col(cols, idxMap, 'Payout Freq.', 9),
      profitSplit: col(cols, idxMap, 'Profit Split', 10),
      price: col(cols, idxMap, 'Price', 11),
      promoCode: col(cols, idxMap, 'Promo CODE', 12) || 'KAGE',
      accountCategory: col(cols, idxMap, 'Account Category'),
      minTradingDays: col(cols, idxMap, 'Min Trading Days'),
      dailyDrawdown: col(cols, idxMap, 'Daily Drawdown'),
      newsTrading: normalizeNewsTrading(col(cols, idxMap, 'News Trading')),
      listPrice: col(cols, idxMap, 'List Price'),
      discountPct: col(cols, idxMap, 'Discount %'),
      priceNote: col(cols, idxMap, 'Price Note'),
      info: col(cols, idxMap, 'Info'),
    };

    row.accountCategory = inferAccountCategory(
      row.planType,
      row.profitTarget,
      row.accountCategory || null
    );
    row.accountSizeFormatted = formatAccountSize(row.accountSize);
    row.planKey = `${row.firmName}::${row.planType}::${row.accountSizeFormatted}`;
    row.planId = `${slugify(row.firmName)}-${slugify(row.planType)}-${slugify(row.accountSizeFormatted)}`;

    rows.push(row);
  }

  return { headers, rows, fileLabel };
}

export function validateFirmPlans({ headers, rows, fileLabel }) {
  const errors = [];
  const warnings = [];
  const keys = new Map();

  for (const row of rows) {
    const prefix = `${fileLabel}:${row.line} (${row.firmName} / ${row.planType} / ${row.accountSizeFormatted})`;

    if (!row.accountSize) errors.push(`${prefix}: Account Size is required`);
    if (!row.drawdownType) errors.push(`${prefix}: Drawdown Type is required`);
    if (!row.profitSplit) errors.push(`${prefix}: Profit Split is required`);

    const price = parsePrice(row.price);
    const listPrice = row.listPrice ? parsePrice(row.listPrice).price : price.priceWas;
    const discountPct = row.discountPct ? parseOptionalNumber(row.discountPct) : null;
    const canCompute = Boolean(listPrice > 0 && discountPct != null && discountPct >= 0 && discountPct <= 100);
    const sale = salePriceOf({
      listPrice,
      priceWas: listPrice,
      discountPct,
      price: price.price,
    });

    if (row.discountPct && (discountPct == null || discountPct < 0 || discountPct > 100)) {
      warnings.push(`${prefix}: Discount % must be between 0 and 100 — ignored`);
    }
    if (row.discountPct && !(listPrice > 0) && (!price.price || price.price <= 0)) {
      errors.push(`${prefix}: Discount % needs List Price so the site can compute the sale`);
    }
    if (!canCompute && (!price.price || price.price <= 0)) {
      errors.push(`${prefix}: set List Price + Discount %, or Price`);
    }
    if (canCompute && (!sale || sale <= 0)) {
      errors.push(`${prefix}: List Price × Discount % must produce a sale greater than 0`);
    }

    const split = parseProfitSplit(row.profitSplit);
    if (!split.profitSplit || split.profitSplit <= 0 || split.profitSplit > 100) {
      errors.push(`${prefix}: Profit Split must be between 1 and 100`);
    }

    if (row.accountCategory && !ACCOUNT_CATEGORIES.has(row.accountCategory)) {
      warnings.push(`${prefix}: Account Category must be Challenge or S2F — inferred from plan type`);
      row.accountCategory = inferAccountCategory(row.planType, row.profitTarget, null);
    }

    if (row.newsTrading && !NEWS_TRADING_VALUES.has(row.newsTrading.toLowerCase())) {
      warnings.push(`${prefix}: News Trading must be both, eval, or none — ignored`);
      row.newsTrading = '';
    }

    if (row.minTradingDays) {
      const n = parseOptionalNumber(row.minTradingDays);
      if (n != null && (!Number.isFinite(n) || n < 0)) {
        errors.push(`${prefix}: Min Trading Days must be None or a non-negative number`);
      }
    }

    if (keys.has(row.planKey)) {
      errors.push(`${prefix}: duplicate plan row (same firm + plan type + size)`);
    } else {
      keys.set(row.planKey, row.line);
    }

    const steps = inferSteps(row.planType, row.profitTarget);
    if (row.accountCategory === 'S2F' && steps === '1 Step') {
      warnings.push(`${prefix}: S2F category but steps inferred as 1 Step — check profit target text`);
    }
    if (row.accountCategory === 'Challenge' && (steps === 'Instant' || steps === 'Direct / STF')) {
      warnings.push(`${prefix}: Challenge category but steps inferred as ${steps}`);
    }
  }

  const missingExtended = EXTENDED_HEADERS.filter(h => !headers.includes(h));
  if (missingExtended.length) {
    warnings.push(
      `${fileLabel}: missing extended compare columns (${missingExtended.join(', ')}). Run: node scripts/extend-firm-plans-cols.mjs --write`
    );
  } else {
    let emptyRules = 0;
    for (const row of rows) {
      if (!row.minTradingDays || !row.dailyDrawdown || !row.newsTrading) emptyRules += 1;
    }
    if (emptyRules > 0) {
      warnings.push(
        `${fileLabel}: ${emptyRules}/${rows.length} rows missing Min Trading Days, Daily Drawdown, or News Trading — H2H shows — until filled`
      );
    }
  }

  return { errors, warnings, stats: { rows: rows.length, firms: new Set(rows.map(r => r.firmName)).size } };
}

export function rowToPlan(row) {
  const cons = parseConsistency(row.consistency);
  const lots = parseMaxLots(row.maxContract);
  const price = parsePrice(row.price);
  const split = parseProfitSplit(row.profitSplit);
  const steps = inferSteps(row.planType, row.profitTarget);
  const listPrice = row.listPrice ? parsePrice(row.listPrice).price : price.priceWas;
  const discountPct = row.discountPct ? parseOptionalNumber(row.discountPct) : null;
  const sale = salePriceOf({
    listPrice,
    priceWas: listPrice,
    discountPct,
    price: price.price,
  });

  let maxLoss = row.maxDrawdown;
  if (/^\$?\d+$/.test(maxLoss.replace(/,/g, ''))) {
    const n = Number(maxLoss.replace(/[$,]/g, ''));
    maxLoss = `$${n.toLocaleString('en-US')}`;
  } else if (/^\d+$/.test(maxLoss)) {
    maxLoss = `$${Number(maxLoss).toLocaleString('en-US')}`;
  }

  let profitTarget = row.profitTarget;
  if (profitTarget === 'None') profitTarget = '— (Instant)';

  const hasDaily = Boolean(String(row.dailyDrawdown || '').trim());
  const hasMinDays = Boolean(String(row.minTradingDays || '').trim());
  const hasNews = Boolean(String(row.newsTrading || '').trim());
  const priceNote = String(row.priceNote || '').trim();
  const info = String(row.info || '').trim();
  const dailyDrawdown = hasDaily ? parseMoney(row.dailyDrawdown) : undefined;
  const minTradingDays = hasMinDays ? parseOptionalNumber(row.minTradingDays) : undefined;
  const newsTrading = hasNews ? row.newsTrading.toLowerCase() : undefined;

  return {
    firmName: row.firmName,
    plan: {
      id: row.planId,
      planType: row.planType,
      accountSize: row.accountSizeFormatted,
      accountCategory: row.accountCategory,
      steps,
      activationFee: row.activationFee,
      maxLots: lots.maxLots,
      ...(lots.maxLotsNote ? { maxLotsNote: lots.maxLotsNote } : {}),
      profitTarget,
      maxLoss,
      maxLossType: row.drawdownType,
      ptDd: computePtDd(profitTarget, maxLoss),
      profitSplit: split.profitSplit,
      ...(split.profitSplitLabel ? { profitSplitLabel: split.profitSplitLabel } : {}),
      // null = explicit None; omit key = unknown (show — in H2H)
      ...(hasDaily ? { dailyDrawdown: dailyDrawdown === 0 ? null : dailyDrawdown } : {}),
      ...(hasMinDays ? { minTradingDays } : {}),
      ...(hasNews ? { newsTrading } : {}),
      ...(listPrice ? { listPrice } : {}),
      ...(discountPct != null ? { discountPct } : {}),
      ...(priceNote ? { priceNote } : {}),
      ...(info ? { info } : {}),
      maxPayout: '—',
      minPayout: '—',
      consistencyEval: cons.eval,
      consistencyFunded: cons.funded,
      payoutFreq: row.payoutFreq,
      loyaltyPts: Math.round((sale || 0) * 1.2),
      popularity: 1000,
      price: sale,
      priceWas: listPrice || price.priceWas,
      priceType: price.priceType,
      promoCode: row.promoCode || 'KAGE',
      discount: listPrice && listPrice > sale ? 'Promo price with KAGE' : 'KAGE',
    },
  };
}

export async function loadFirmPlans(tsvPath) {
  const fs = await import('node:fs');
  const text = fs.readFileSync(tsvPath, 'utf8');
  const parsed = parseTsv(text, { fileLabel: tsvPath });
  const validation = validateFirmPlans(parsed);
  return { ...parsed, validation, parsedPlans: parsed.rows.map(rowToPlan) };
}
