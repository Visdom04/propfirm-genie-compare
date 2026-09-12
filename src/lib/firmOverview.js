import { categoryBucket, newsLabel, parseMoney, discountBadge } from '@/lib/compareHighlights';
import { genieFirmUrl } from '@/lib/firmGenie';
import { displayPriceOf, listPriceOf as listPrice, salePriceOf } from '@/lib/planPrice';

function uniq(list) {
  return [...new Set(list.filter(v => v != null && String(v).trim() !== ''))];
}

function moneyLabel(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return `$${n.toLocaleString('en-US')}`;
  return `$${n.toFixed(2)}`;
}

function rangeLabel(nums, fmt = moneyLabel) {
  const clean = nums.filter(n => n != null && Number.isFinite(n));
  if (!clean.length) return '—';
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  if (min === max) return fmt(min);
  return `${fmt(min)}–${fmt(max)}`;
}

function sizeRank(raw) {
  const n = Number(String(raw || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function activationDollars(raw) {
  const s = String(raw || '').trim();
  if (!s || /^none$/i.test(s) || s === '—' || s === '-') return 0;
  const m = s.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function salePrice(plan, applyDiscount) {
  return displayPriceOf(plan, applyDiscount);
}

/**
 * Overview shows cadence, not every plan’s size-specific dollar note.
 * Sheet column is `Payout Freq.` — Challenges still shows the raw cell.
 */
function compactPayout(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/not\s*fixed/i.test(s)) return 'Not fixed';
  if (/on[- ]?demand/i.test(s)) return 'On-demand';
  if (/on\s*request/i.test(s)) return 'On request';
  if (/live after bonus/i.test(s)) return 'Live after bonus';
  if (/daily/i.test(s) || /every\s*1\s*day/i.test(s)) return 'Daily';
  const every = s.match(/every\s+(\d+)\s*(?:calendar\s+)?days?/i);
  if (every) return `Every ${every[1]} days`;
  const winning = s.match(/(\d+)\s*winning\s*days/i);
  if (winning) return `${winning[1]} winning days`;
  const trading = s.match(/(\d+)\s*trading\s*days/i);
  if (trading) return `${trading[1]} trading days`;
  if (/weekly/i.test(s)) {
    const n = s.match(/(\d+)\s*days?/i);
    return n ? `${n[1]} days (weekly)` : 'Weekly';
  }
  const hours = s.match(/every\s+(\d+)\s*hours?/i);
  if (hours) return `Every ${hours[1]} hours`;
  if (/\b24h\b/i.test(s)) return '24h after first trade';
  const days = s.match(/(\d+)\s*days?/i);
  if (days) return `${days[1]} days`;
  return s;
}

/** One overview row per firm, rolled up from its plans. */
export function summarizeFirm(firm, { applyDiscount = true } = {}) {
  const plans = firm?.plans || [];
  const comingSoon = Boolean(firm?.comingSoon) && !plans.length;
  const challenge = plans.filter(p => categoryBucket(p) === 'Challenge');
  const s2f = plans.filter(p => categoryBucket(p) === 'S2F');
  const priced = [...challenge, ...plans].filter(p => salePriceOf(p) > 0);
  const cheapest = priced.reduce((best, p) => {
    const a = salePrice(p, applyDiscount);
    const b = best ? salePrice(best, applyDiscount) : Infinity;
    return a < b ? p : best;
  }, null);

  const evalPlan = (challenge.length ? challenge : priced).reduce((best, p) => {
    const a = salePrice(p, applyDiscount);
    const b = best ? salePrice(best, applyDiscount) : Infinity;
    return a < b ? p : best;
  }, null);

  const sizes = uniq((firm.accountSizes || []).concat(plans.map(p => p.accountSize))).sort(
    (a, b) => sizeRank(a) - sizeRank(b)
  );
  const sizeLabel = sizes.length
    ? sizes[0] === sizes[sizes.length - 1]
      ? String(sizes[0]).replace(/^\$/, '')
      : `${String(sizes[0]).replace(/^\$/, '')}–${String(sizes[sizes.length - 1]).replace(/^\$/, '')}`
    : '—';

  const evalPrice = evalPlan ? salePrice(evalPlan, applyDiscount) : null;
  const evalWas = evalPlan ? listPrice(evalPlan) : null;
  const act = evalPlan ? activationDollars(evalPlan.activationFee) : null;
  const allIn = evalPrice != null && act != null ? evalPrice + act : evalPrice;

  const newsValues = uniq(plans.map(p => newsLabel(p.newsTrading)));
  const news =
    !newsValues.length || newsValues.every(v => v === '—')
      ? '—'
      : newsValues.every(v => v === 'Allowed')
        ? 'Allowed'
        : newsValues.every(v => v === 'Not Allowed')
          ? 'Not Allowed'
          : 'Varies';

  const splits = uniq(
    plans.map(p => (typeof p.profitSplit === 'number' ? `${p.profitSplit}%` : null))
  );
  const drawdowns = uniq(plans.map(p => p.maxLossType));
  const payouts = uniq(plans.map(p => compactPayout(p.payoutFreq))).filter(Boolean);
  const minDays = plans.map(p => p.minTradingDays).filter(d => d != null);
  const maxLosses = plans.map(p => parseMoney(p.maxLoss)).filter(n => n != null);
  const types = uniq(plans.map(p => p.planType));
  const badge = discountBadge(firm, cheapest);

  const planGroups = [];
  {
    const byType = new Map();
    for (const p of plans) {
      const type = p.planType || 'Plan';
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type).push(p.accountSize);
    }
    for (const [type, sizes] of byType) {
      planGroups.push({
        type,
        sizes: uniq(sizes).sort((a, b) => sizeRank(a) - sizeRank(b)),
      });
    }
  }

  const activationGroups = [];
  {
    const byFee = new Map();
    for (const p of plans) {
      const fee = p.activationFee && p.activationFee !== 'None' ? p.activationFee : 'None';
      if (!byFee.has(fee)) byFee.set(fee, []);
      byFee.get(fee).push(`${p.planType || 'Plan'} · ${p.accountSize}`);
    }
    for (const [fee, lines] of byFee) {
      activationGroups.push({ fee, lines: uniq(lines) });
    }
  }

  const paidFees = activationGroups.filter(g => g.fee !== 'None');
  const paidAmounts = paidFees.map(g => parseMoney(g.fee)).filter(n => n != null);
  let activationSummary = '—';
  if (!activationGroups.length) activationSummary = '—';
  else if (!paidFees.length) activationSummary = 'None';
  else if (paidFees.length === 1) {
    const fee = paidFees[0].fee;
    const n = parseMoney(fee);
    activationSummary = n != null && /[a-z]/i.test(fee) ? moneyLabel(n) : fee;
  }
  else if (paidAmounts.length >= 2) activationSummary = rangeLabel(paidAmounts);
  else activationSummary = 'Varies';

  return {
    firm,
    comingSoon,
    planCount: plans.length,
    sizeLabel,
    sizes,
    platforms: firm.platforms || [],
    types,
    planGroups,
    straightToFunded: s2f.length > 0,
    evalPrice,
    evalWas,
    evalPlan,
    activationLabel: activationSummary,
    activationGroups,
    allIn,
    allInNote: act == null && evalPrice != null ? 'Eval only' : null,
    drawdownLabel: drawdowns.length ? drawdowns.join(' · ') : '—',
    maxLossLabel: rangeLabel(maxLosses),
    daysToPass: minDays.length ? rangeLabel(minDays, n => (n === 1 ? '1 day' : `${n} days`)) : '—',
    news,
    maxAccounts: firm.maxAccounts || '—',
    profitSplit: splits.length ? splits.join(' · ') : '—',
    payoutLabel: payouts.length ? payouts.join(' · ') : '—',
    discountLabel: badge ? `${badge.replace('-', '')} OFF` : firm.discount || '—',
    cheapest,
    fromPrice: cheapest ? salePrice(cheapest, applyDiscount) : null,
    fromWas: cheapest ? listPrice(cheapest) : null,
    promoCode: cheapest?.promoCode || firm.promoCode || 'KAGE',
    website: firm.affiliateLink || (firm.website ? `https://${String(firm.website).replace(/^https?:\/\//, '')}` : ''),
    genieUrl: genieFirmUrl(firm.name),
  };
}
