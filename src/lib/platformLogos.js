const BASE = 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/platforms';

/** Maps firm.platforms names → public logo URLs. */
export const PLATFORM_LOGOS = {
  ATAS: `${BASE}/ATAS.webp`,
  Bookmap: `${BASE}/Bookmap.webp`,
  MotiveWave: `${BASE}/MotiveWave.webp`,
  NinjaTrader: `${BASE}/NinjaTrader.webp`,
  Quantower: `${BASE}/Quantower.webp`,
  Rithmic: `${BASE}/Rithmic.webp`,
  'Sierra Chart': `${BASE}/Sierra%20Chart.webp`,
  TradeSea: `${BASE}/TradeSea.webp`,
  TradingView: `${BASE}/TradingView.webp`,
  Tradovate: `${BASE}/Tradovate.webp`,
  'Tradovate Prop': `${BASE}/Tradovate.webp`,
  DeepCharts: `${BASE}/DeepCharts.webp`,
  Volumetrica: `${BASE}/Volumetrica.webp`,
  'Volumetrica IQC Trader': `${BASE}/Volumetrica.webp`,
  'Project X': `${BASE}/Project%20X.webp`,
  Plus500: `${BASE}/Plus500.webp`,
};

export const PLATFORM_MARK = {
  NinjaTrader: { abbr: 'NT', tone: 'bg-[#163a5f]' },
  Tradovate: { abbr: 'Td', tone: 'bg-[#0f4a3c]' },
  'Tradovate Prop': { abbr: 'Td', tone: 'bg-[#0f4a3c]' },
  TradingView: { abbr: 'TV', tone: 'bg-[#1c3d4a]' },
  Rithmic: { abbr: 'R', tone: 'bg-[#4a321c]' },
  Quantower: { abbr: 'Q', tone: 'bg-[#2a2450]' },
  ATAS: { abbr: 'A', tone: 'bg-[#3b1f2e]' },
  MotiveWave: { abbr: 'MW', tone: 'bg-[#1f3b32]' },
  Bookmap: { abbr: 'BM', tone: 'bg-[#3a2818]' },
  Jigsaw: { abbr: 'J', tone: 'bg-[#2c2c2c]' },
  'Sierra Chart': { abbr: 'SC', tone: 'bg-[#1e3a2f]' },
  'R|Trader Pro': { abbr: 'RT', tone: 'bg-[#2d3a1e]' },
  TradeSea: { abbr: 'TS', tone: 'bg-[#1a3344]' },
  DeepCharts: { abbr: 'DC', tone: 'bg-[#1a3d4a]' },
  'Volumetrica IQC Trader': { abbr: 'VQ', tone: 'bg-[#2a3a1e]' },
  Volumetrica: { abbr: 'V', tone: 'bg-[#2a3a1e]' },
  'Project X': { abbr: 'PX', tone: 'bg-[#1e2a44]' },
  Plus500: { abbr: 'P5', tone: 'bg-[#2a2418]' },
};

export function platformLogo(name) {
  return PLATFORM_LOGOS[name] || null;
}
