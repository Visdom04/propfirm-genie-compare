/** Shared List Price × Discount % math. Safe for Node scripts and the Next client. */

export function roundMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function listAmount(plan) {
  const list = Number(plan?.listPrice);
  if (Number.isFinite(list) && list > 0) return list;
  const was = Number(plan?.priceWas);
  if (Number.isFinite(was) && was > 0) return was;
  return 0;
}

/** Retail / strikethrough price. Falls back to typed Price when List Price is empty. */
export function listPriceOf(plan) {
  const list = listAmount(plan);
  if (list > 0) return list;
  return Number(plan?.price) || 0;
}

/**
 * Sale price: List Price × (1 − Discount % / 100) when both exist.
 * Otherwise the typed Price cell.
 */
export function salePriceOf(plan) {
  const list = listAmount(plan);
  const pct = Number(plan?.discountPct);
  const typed = Number(plan?.price) || 0;
  if (list > 0 && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
    return roundMoney(list * (1 - pct / 100));
  }
  return typed;
}

export function displayPriceOf(plan, applyDiscount = true) {
  const sale = salePriceOf(plan);
  const list = listPriceOf(plan);
  if (!applyDiscount && list > sale) return list;
  return sale;
}
