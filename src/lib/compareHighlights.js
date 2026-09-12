/** Head-to-head highlight helpers for /compare-firms */

export function parseMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s || /^none$/i.test(s) || s === '—' || s === '-' || /instant/i.test(s)) return null;
  const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function isNoneValue(value) {
  if (value == null || value === '') return true;
  if (typeof value === 'number') return false;
  const s = String(value).trim().toLowerCase();
  return s === 'none' || s === '—' || s === '-' || s === 'n/a' || s === 'na';
}

export function parsePercent(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (isNoneValue(value)) return null;
  const m = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseDays(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (isNoneValue(value)) return null;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Challenge vs Instant/S2F bucket for apples-to-apples warning */
export function categoryBucket(plan) {
  const cat = (plan?.accountCategory || '').toLowerCase();
  if (cat === 's2f' || cat === 'instant') return 'S2F';
  const steps = String(plan?.steps || '').toLowerCase();
  if (steps.includes('instant') || steps.includes('stf') || steps.includes('direct')) return 'S2F';
  const type = String(plan?.planType || '').toLowerCase();
  if (/\b(instant|direct|s2f|stf)\b/.test(type)) return 'S2F';
  if (/none|—|instant/i.test(String(plan?.profitTarget || ''))) return 'S2F';
  return 'Challenge';
}

export function newsLabel(value) {
  if (value == null || value === '') return '—';
  const v = String(value).toLowerCase();
  if (v === 'both' || v === 'allowed' || v === 'funded') return 'Allowed';
  if (v === 'eval') return 'Eval only';
  if (v === 'none' || v === 'not allowed' || v === 'not_allowed') return 'Not Allowed';
  return String(value);
}

export function isNewsAllowed(value) {
  const v = String(value || '').toLowerCase();
  return v === 'both' || v === 'allowed' || v === 'funded';
}

/**
 * @param {'lower'|'higher'|'none-or-lower'|'none-or-higher'|'news'} mode
 * @returns {0|1|null} winning side index, or null if tie / no highlight
 */
export function pickWinner(a, b, mode) {
  if (mode === 'news') {
    const aOk = isNewsAllowed(a);
    const bOk = isNewsAllowed(b);
    if (aOk === bOk) return null;
    return aOk ? 0 : 1;
  }

  const aNone = isNoneValue(a);
  const bNone = isNoneValue(b);

  if (mode === 'none-or-lower' || mode === 'none-or-higher') {
    if (aNone && bNone) return null;
    if (aNone && !bNone) return 0;
    if (bNone && !aNone) return 1;
  }

  const na = typeof a === 'number' ? a : parseMoney(a) ?? parsePercent(a) ?? parseDays(a);
  const nb = typeof b === 'number' ? b : parseMoney(b) ?? parsePercent(b) ?? parseDays(b);
  if (na == null || nb == null || Number.isNaN(na) || Number.isNaN(nb)) return null;
  if (na === nb) return null;

  if (mode === 'lower' || mode === 'none-or-lower') return na < nb ? 0 : 1;
  if (mode === 'higher' || mode === 'none-or-higher') return na > nb ? 0 : 1;
  return null;
}

export function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Number(n).toLocaleString('en-US')}`;
}

export function formatDays(value) {
  if (isNoneValue(value)) return 'None';
  const n = parseDays(value);
  if (n == null) return String(value);
  return n === 1 ? '1 day' : `${n} days`;
}

export function formatDailyLoss(plan) {
  if (!plan || !('dailyDrawdown' in plan)) return '—';
  if (plan.dailyDrawdown == null || plan.dailyDrawdown === 0) return 'None';
  return formatUsd(plan.dailyDrawdown);
}

export function formatMinDays(plan) {
  if (!plan || !('minTradingDays' in plan)) return '—';
  if (plan.minTradingDays == null) return 'None';
  return formatDays(plan.minTradingDays);
}

export function discountBadge(firm, plan) {
  if (plan?.discountPct != null) return `-${Math.round(plan.discountPct)}%`;
  const d = String(firm?.discount || '');
  const m = d.match(/(\d+)\s*%/);
  if (m) return `-${m[1]}%`;
  if (plan?.priceWas && plan?.price && plan.priceWas > plan.price) {
    const pct = Math.round((1 - plan.price / plan.priceWas) * 100);
    if (pct > 0) return `-${pct}%`;
  }
  return null;
}

/** Auto-fill only when the trader has no real choice. */
export function onlyPlanType(firm) {
  const seen = [];
  for (const p of firm?.plans || []) {
    if (p.planType && !seen.includes(p.planType)) seen.push(p.planType);
  }
  return seen.length === 1 ? seen[0] : null;
}

export function onlyAccountSize(firm, planType) {
  const sizes = (firm?.plans || [])
    .filter(p => p.planType === planType)
    .map(p => p.accountSize);
  return sizes.length === 1 ? sizes[0] : null;
}

export function pickDefaultPlanType(firm) {
  const plans = firm?.plans || [];
  if (!plans.length) return null;
  const byType = new Map();
  for (const p of plans) {
    const cur = byType.get(p.planType) || { popularity: 0, count: 0 };
    cur.popularity += p.popularity || 0;
    cur.count += 1;
    byType.set(p.planType, cur);
  }
  let best = null;
  let bestScore = -1;
  for (const [type, meta] of byType) {
    const score = meta.popularity + meta.count * 10;
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}

export function pickDefaultSize(firm, planType) {
  const sizes = (firm?.plans || [])
    .filter(p => p.planType === planType)
    .map(p => p.accountSize);
  if (!sizes.length) return null;
  const preferred = ['$50K', '$100K', '$25K', '$150K'];
  for (const s of preferred) {
    if (sizes.includes(s)) return s;
  }
  return sizes[0];
}

export function findPlan(firm, planType, accountSize) {
  if (!firm || !planType || !accountSize) return null;
  return (firm.plans || []).find(p => p.planType === planType && p.accountSize === accountSize) || null;
}
