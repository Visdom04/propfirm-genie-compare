/**
 * Directory rank from Kage Discord #prop-firm-discounts-info (top → bottom).
 * Firms not in the sheet stay at the end in this same file’s leftover list.
 */
export const FIRM_RANK_ORDER = [
  'Lucid Trading',
  'Tradeify',
  'Bulenox',
  'Take Profit Trader',
  'My Funded Futures',
  'Legends Trading',
  'Nexgen ProTrader Funding',
  'FundedNext Futures',
  'Phidias Propfirm',
  'Top One Futures',
  'E8 Futures',
  'Purdia',
  'YRM Prop',
  'DayTraders',
  'Funded Futures Network',
  'The Trading Pit',
  'Blue Guardian',
  'Traders Launch',
  'FundedSeat',
  'IQ Capital',
  'FTMO',
  'Topstep',
];

export function firmRankMap(catalog) {
  const map = new Map();
  FIRM_RANK_ORDER.forEach((name, i) => map.set(name, i + 1));
  const leftovers = catalog
    .map(f => f.name)
    .filter(name => !map.has(name))
    .sort((a, b) => a.localeCompare(b));
  leftovers.forEach((name, i) => map.set(name, FIRM_RANK_ORDER.length + i + 1));
  return map;
}
