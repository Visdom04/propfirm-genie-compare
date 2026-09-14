const BASE = 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms';
const PUBLIC = 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/public';

function asset(file) {
  return `${BASE}/${file}`;
}

export const GENIE_LOGO = asset('PROP_FIRM_GENIE.svg');

export const RANK_TROPHIES = {
  1: `${PUBLIC}/Golden.webp`,
  2: `${PUBLIC}/Silver.webp`,
  3: `${PUBLIC}/Bronze.webp`,
};

/** Public firm marks in `genie-assets/firms`. Fallback to local `/firm/*` when missing. */
export const FIRM_LOGOS = {
  'Apex Trader Funding': asset('Apex%20Trader%20Funding.webp'),
  'Blue Guardian': asset('Blue%20Guardian.webp'),
  Bulenox: asset('Bulenox.webp'),
  DayTraders: asset('DayTraders.webp'),
  'E8 Futures': asset('E8%20Futures.webp'),
  'FundedNext Futures': asset('FundedNext%20Futures.webp'),
  'Legends Trading': asset('Legends%20Trading.webp'),
  'Lucid Trading': asset('Lucid%20Trading.webp'),
  'My Funded Futures': asset('My%20Funded%20Futures.webp'),
  'Nexgen ProTrader Funding': asset('Nexgen%20ProTrader%20Funding.webp'),
  'Phidias Propfirm': asset('Phidias%20Propfirm.webp'),
  Purdia: asset('Purdia.webp'),
  'Take Profit Trader': asset('Take%20Profit%20Trader.webp'),
  'Top One Futures': asset('Top%20One%20Futures.webp'),
  Topstep: asset('Topstep.webp'),
  Tradeify: asset('Tradeify_new.webp'),
  'Traders Launch': asset('Traders%20Launch.webp'),
  'YRM Prop': asset('YRM%20Prop.webp'),
  'IQ Capital': asset('IQ%20Capital.webp'),
  FundedSeat: asset('FundedSeat.webp'),
  FTMO: asset('FTMO.webp'),
  'The Trading Pit': asset('The%20Trading%20Pit.webp'),
  'Funded Futures Network': asset('Funded%20Futures%20Network.webp'),
};

export function firmLogo(name, fallback) {
  const extra = String(fallback || '').trim();
  if (/^https?:\/\//i.test(extra)) return extra;
  return FIRM_LOGOS[name] || extra || null;
}
