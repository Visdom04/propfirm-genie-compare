const BASE = 'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/platforms';

function file(name) {
  return `${BASE}/${encodeURIComponent(name)}`;
}

/** Maps firm.platforms names → public logo URLs. */
export const PLATFORM_LOGOS = {
  ATAS: file('ATAS.webp'),
  Bookmap: file('Bookmap.webp'),
  'CQG Web/Desktop': file('CQG Web_Desktop.webp'),
  CQG: file('CQG Web_Desktop.webp'),
  DeepCharts: file('DeepCharts.webp'),
  DeepDOM: file('DeepDOM.webp'),
  EdgeProX: file('EdgeProX.webp'),
  Finamark: file('Finamark.webp'),
  FundX: file('FundX.webp'),
  Jigsaw: file('Jigsaw.webp'),
  'MotiveWave Mobile': file('MotiveWave Mobile.webp'),
  MotiveWave: file('MotiveWave.webp'),
  MultiCharts: file('MultiCharts.webp'),
  NinjaTrader: file('NinjaTrader.webp'),
  ONYX: file('ONYX.webp'),
  Plus500: file('Plus500.webp'),
  'Project X': file('Project X.webp'),
  Quantower: file('Quantower.webp'),
  Rithmic: file('Rithmic.webp'),
  'R|Trader': file('Rithmic.webp'),
  'R|Trader Pro': file('Rithmic.webp'),
  'R Trader': file('Rithmic.webp'),
  'R Trader Pro': file('Rithmic.webp'),
  'Sierra Chart': file('Sierra Chart.webp'),
  TopstepX: file('TopstepX.webp'),
  TradeSea: file('TradeSea.webp'),
  TradingView: file('TradingView.webp'),
  Tradovate: file('Tradovate.webp'),
  'Tradovate Prop': file('Tradovate.webp'),
  VolFix: file('VolFix.webp'),
  Volsys: file('Volsys.webp'),
  Volumetrica: file('Volumetrica.webp'),
  'Volumetrica IQC Trader': file('Volumetrica.webp'),
  WealthCharts: file('WealthCharts.webp'),
};

export const PLATFORM_MARK = {
  NinjaTrader: { abbr: 'NT', tone: 'bg-[#163a5f]' },
  Tradovate: { abbr: 'Td', tone: 'bg-[#0f4a3c]' },
  'Tradovate Prop': { abbr: 'Td', tone: 'bg-[#0f4a3c]' },
  TradingView: { abbr: 'TV', tone: 'bg-[#1c3d4a]' },
  Rithmic: { abbr: 'R', tone: 'bg-[#4a321c]' },
  'R|Trader': { abbr: 'RT', tone: 'bg-[#2d3a1e]' },
  'R|Trader Pro': { abbr: 'RT', tone: 'bg-[#2d3a1e]' },
  'R Trader': { abbr: 'RT', tone: 'bg-[#2d3a1e]' },
  'R Trader Pro': { abbr: 'RT', tone: 'bg-[#2d3a1e]' },
  Quantower: { abbr: 'Q', tone: 'bg-[#2a2450]' },
  ATAS: { abbr: 'A', tone: 'bg-[#3b1f2e]' },
  MotiveWave: { abbr: 'MW', tone: 'bg-[#1f3b32]' },
  'MotiveWave Mobile': { abbr: 'MW', tone: 'bg-[#1f3b32]' },
  Bookmap: { abbr: 'BM', tone: 'bg-[#3a2818]' },
  Jigsaw: { abbr: 'J', tone: 'bg-[#2c2c2c]' },
  'Sierra Chart': { abbr: 'SC', tone: 'bg-[#1e3a2f]' },
  TradeSea: { abbr: 'TS', tone: 'bg-[#1a3344]' },
  DeepCharts: { abbr: 'DC', tone: 'bg-[#1a3d4a]' },
  DeepDOM: { abbr: 'DD', tone: 'bg-[#1a3d4a]' },
  'Volumetrica IQC Trader': { abbr: 'VQ', tone: 'bg-[#2a3a1e]' },
  Volumetrica: { abbr: 'V', tone: 'bg-[#2a3a1e]' },
  'Project X': { abbr: 'PX', tone: 'bg-[#1e2a44]' },
  Plus500: { abbr: 'P5', tone: 'bg-[#2a2418]' },
  'CQG Web/Desktop': { abbr: 'CQ', tone: 'bg-[#3b2a58]' },
  CQG: { abbr: 'CQ', tone: 'bg-[#3b2a58]' },
  EdgeProX: { abbr: 'EX', tone: 'bg-[#2a2450]' },
  Finamark: { abbr: 'FM', tone: 'bg-[#1c3d4a]' },
  FundX: { abbr: 'FX', tone: 'bg-[#1e3a5f]' },
  MultiCharts: { abbr: 'MC', tone: 'bg-[#1a2e44]' },
  ONYX: { abbr: 'OX', tone: 'bg-[#2c2c2c]' },
  TopstepX: { abbr: 'TX', tone: 'bg-[#1a1a1a]' },
  VolFix: { abbr: 'VF', tone: 'bg-[#3a1e1e]' },
  Volsys: { abbr: 'VS', tone: 'bg-[#1e2a44]' },
  WealthCharts: { abbr: 'WC', tone: 'bg-[#1a3d4a]' },
};

const ALIASES = {
  nt: 'NinjaTrader',
  ninjatrader: 'NinjaTrader',
  ninja: 'NinjaTrader',
  tv: 'TradingView',
  tradingview: 'TradingView',
  td: 'Tradovate',
  tradovate: 'Tradovate',
  tradovateprop: 'Tradovate',
  rithmic: 'Rithmic',
  rtrader: 'R|Trader',
  rtraderpro: 'R|Trader Pro',
  rt: 'Rithmic',
  quantower: 'Quantower',
  sierra: 'Sierra Chart',
  sierrachart: 'Sierra Chart',
  projectx: 'Project X',
  volumetrica: 'Volumetrica',
  volumetricaiqctrader: 'Volumetrica',
  cqg: 'CQG Web/Desktop',
  cqgwebdesktop: 'CQG Web/Desktop',
  cqgweb: 'CQG Web/Desktop',
  deepdom: 'DeepDOM',
  deepchart: 'DeepCharts',
  deepcharts: 'DeepCharts',
  edgeprox: 'EdgeProX',
  finamark: 'Finamark',
  fundx: 'FundX',
  jigsaw: 'Jigsaw',
  motivewavemobile: 'MotiveWave Mobile',
  motivewave: 'MotiveWave',
  multicharts: 'MultiCharts',
  onyx: 'ONYX',
  topstepx: 'TopstepX',
  tradesea: 'TradeSea',
  volfix: 'VolFix',
  volsys: 'Volsys',
  wealthcharts: 'WealthCharts',
  atas: 'ATAS',
  bookmap: 'Bookmap',
  plus500: 'Plus500',
};

function norm(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

const KEYS_BY_LENGTH = Object.keys(PLATFORM_LOGOS).sort((a, b) => norm(b).length - norm(a).length);

export function canonicalPlatform(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  if (PLATFORM_LOGOS[raw] || PLATFORM_MARK[raw]) return raw;
  const n = norm(raw);
  if (ALIASES[n]) return ALIASES[n];
  for (const key of KEYS_BY_LENGTH) {
    if (norm(key) === n) return key;
  }
  for (const key of KEYS_BY_LENGTH) {
    const kn = norm(key);
    if (kn.length >= 4 && (n.includes(kn) || kn.includes(n))) return key;
  }
  return raw;
}

export function platformMark(name) {
  const key = canonicalPlatform(name);
  return PLATFORM_MARK[key] || { abbr: String(name || '?').slice(0, 2).toUpperCase(), tone: 'bg-[#1a2e24]' };
}

export function platformLogo(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  if (PLATFORM_LOGOS[raw]) return PLATFORM_LOGOS[raw];
  const key = canonicalPlatform(raw);
  if (PLATFORM_LOGOS[key]) return PLATFORM_LOGOS[key];
  return `${BASE}/${encodeURIComponent(raw)}.webp`;
}
