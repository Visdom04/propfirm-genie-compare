'use client';

import { createPortal } from 'react-dom';
import { useMemo, useState, useCallback, useEffect, useRef, useId } from 'react';
import { Bookmark, Star } from 'lucide-react';
import { firms, ACCOUNT_SIZE_OPTIONS, PRICE_OPTIONS } from '@/data/firms';
import CompareFilterSidebar, {
  createEmptyFacet,
  cloneFacet,
  countActiveFilters,
  isRangeActive,
  normalizeDrawdown,
} from '@/components/CompareFilterSidebar';
import { PfgPrimary } from '@/components/green/PfgControls';
import { firmLogo } from '@/lib/firmLogos';
import { listPriceOf, salePriceOf } from '@/lib/planPrice';
import './FirmCompareDemoGreen.edges.css';

const MAX_FAVORITES = 5;
const PAGE_SIZE = 10;
const COLS_STORAGE_KEY = 'cmp-green-visible-cols-v4';

/** Instant / Direct / STF grouped; 1 Step is the other eval path */
const STEP_FILTER_OPTIONS = ['Instant / Direct / STF', '1 Step'];

function planMatchesStepFilter(planSteps, selected) {
  if (!selected?.length) return true;
  return selected.some(label => {
    if (label === 'Instant / Direct / STF') {
      return planSteps === 'Instant' || planSteps === 'Direct / STF';
    }
    return planSteps === label;
  });
}

const DEFAULT_FIRM_ORDER = [
  'Lucid Trading',
  'Tradeify',
  'Take Profit Trader',
  'My Funded Futures',
  'Apex Trader Funding',
  'Legends Trading',
  'Phidias Propfirm',
  'E8 Futures',
  'Nexgen ProTrader Funding',
  'Bulenox',
  'Purdia',
  'YRM Prop',
  'DayTraders',
  'FundedNext Futures',
  'Top One Futures',
  'Blue Guardian',
];

const firmOrderIndex = name => {
  const i = DEFAULT_FIRM_ORDER.indexOf(name);
  return i === -1 ? DEFAULT_FIRM_ORDER.length + 1 : i;
};

/** Stable per-plan hash so default rows mix sizes without hydration flicker */
function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickHighlightPlans(plans, firmName) {
  if (!plans.length) return { primary: null, secondary: null };
  const ranked = [...plans].sort((a, b) => {
    const ha = stableHash(`${firmName}:${a.id}`);
    const hb = stableHash(`${firmName}:${b.id}`);
    if (ha !== hb) return ha - hb;
    return String(a.id).localeCompare(String(b.id));
  });
  return { primary: ranked[0] || null, secondary: ranked[1] || null };
}

function buildCuratedDefaultRows(rows) {
  const byFirm = new Map();
  rows.forEach(r => {
    const list = byFirm.get(r.firm.name);
    if (list) list.push(r);
    else byFirm.set(r.firm.name, [r]);
  });

  const firmNames = [...byFirm.keys()].sort((a, b) => firmOrderIndex(a) - firmOrderIndex(b));
  const primaries = [];
  const secondaries = [];
  const used = new Set();

  firmNames.forEach(name => {
    const firmRows = byFirm.get(name);
    const { primary, secondary } = pickHighlightPlans(
      firmRows.map(r => r.plan),
      name
    );
    if (primary) {
      const row = firmRows.find(r => r.plan.id === primary.id);
      if (row) {
        primaries.push(row);
        used.add(primary.id);
      }
    }
    if (secondary) {
      const row = firmRows.find(r => r.plan.id === secondary.id);
      if (row) {
        secondaries.push(row);
        used.add(secondary.id);
      }
    }
  });

  const rest = rows
    .filter(r => !used.has(r.plan.id))
    .sort((a, b) => {
      const byFirmCmp = firmOrderIndex(a.firm.name) - firmOrderIndex(b.firm.name);
      if (byFirmCmp !== 0) return byFirmCmp;
      return sortValue('accountSize', b.plan, b.firm) - sortValue('accountSize', a.plan, a.firm);
    });

  return [...primaries, ...secondaries, ...rest];
}

const INFO_COPY = {
  accountSize:
    'Starting simulated balance for this challenge (e.g. 25k / 50k / 100k). Larger size usually means bigger targets and drawdown.',
  maxLossType:
    'How drawdown is measured: EOD (end of day), Intraday (live trailing), Static (fixed floor), or Trailing. Check firm rules for DLL add-ons.',
  activationFee:
    'One-time fee when you move from evaluation to a funded account. “None” means no activation fee (sometimes waived with promo).',
  profitTarget:
    'Profit you must hit to pass the evaluation. “—” / Instant / Straight to Funded means no eval target (direct or instant funded).',
  maxLoss:
    'Maximum drawdown / loss limit before the account fails (sometimes shown with TDA, DLL, or add-on options in brackets).',
  maxLots:
    'Maximum contracts allowed — shown as minis | micros when both apply. Scaling plans may raise size after profit milestones.',
  consistency:
    'Consistency rule on Eval | Funded (e.g. None / 40%). Caps how much of your profit can come from a single day.',
  payoutFreq:
    'How often you can request a payout once funded (daily, every N days, winning-day rules, buffers, or min profit per cycle).',
  profitSplit:
    'Share of profits you keep once funded (e.g. 90%). Progressive splits (75%→100%) increase after payout milestones.',
  price:
    'Challenge price. With Apply discounts on, this is the promo price (strikethrough = regular price). With it off, this is the regular list price.',
  planType: 'The named path for this row (Flex, Select, Test, Instant, and so on).',
  steps: 'How many evaluation stages this path uses (1 Step, Instant / Direct / STF).',
};

const MID_COLS = [
  { key: 'planType', label: 'Plan', tip: 'planType', sort: true, min: 112 },
  { key: 'steps', label: 'Steps', tip: 'steps', sort: true, min: 96 },
  { key: 'accountSize', label: 'Account', label2: 'size', tip: 'accountSize', sort: true, min: 92 },
  { key: 'maxLossType', label: 'Drawdown', label2: 'type', tip: 'maxLossType', sort: true, min: 96 },
  { key: 'activationFee', label: 'Activation fee', tip: 'activationFee', sort: false, min: 144 },
  { key: 'profitTarget', label: 'Profit', label2: 'target', tip: 'profitTarget', sort: true, min: 96 },
  { key: 'maxLoss', label: 'Max', label2: 'drawdown', tip: 'maxLoss', sort: true, min: 96 },
  { key: 'maxLots', label: 'Max', label2: 'contract', sub: 'Minis / Micros', tip: 'maxLots', sort: false, min: 108 },
  {
    key: 'consistency',
    label: 'Consistency rule',
    sub: 'Eval / Funded',
    tip: 'consistency',
    sort: false,
    min: 176,
  },
  { key: 'payoutFreq', label: 'Payout freq.', tip: 'payoutFreq', sort: true, min: 208 },
  { key: 'profitSplit', label: 'Profit split', tip: 'profitSplit', sort: true, min: 144 },
];

const ALL_COL_KEYS = MID_COLS.map(c => c.key);

const ROW =
  'cmp-edge-row relative grid items-stretch grid-cols-[280px_minmax(0,1fr)_216px] max-md:grid-cols-[244px_minmax(0,1fr)_184px]';
const PIN_FIRM =
  'cmp-edge-pin-firm flex min-w-0 items-center self-stretch bg-transparent';
const PIN_PRICE =
  'cmp-edge-pin-price flex min-w-0 items-center self-stretch bg-transparent';
const PIN_HEAD = 'cmp-edge-head py-3';
const MID =
  'cmp-mid relative min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none bg-transparent';
const MID_CELL =
  'relative box-border flex min-h-[64px] shrink-0 items-center justify-center border-r border-white/[0.06] last:border-r-0 px-3 py-2.5';
const TH =
  'flex min-h-[44px] flex-col items-center justify-center gap-0.5 whitespace-nowrap text-center text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-slate-500';
const CHIP_ON = 'border-[#3FB185]/50 bg-[#3FB185]/15 text-[#3FB185]';
const CHIP_OFF = 'border-white/10 bg-black/20 text-slate-200 hover:border-emerald-500/35';

function loadVisibleCols() {
  if (typeof window === 'undefined') return new Set(ALL_COL_KEYS);
  try {
    const raw = window.localStorage.getItem(COLS_STORAGE_KEY);
    if (!raw) return new Set(ALL_COL_KEYS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return new Set(ALL_COL_KEYS);
    const next = new Set(parsed.filter(k => ALL_COL_KEYS.includes(k)));
    return next.size ? next : new Set(ALL_COL_KEYS);
  } catch {
    return new Set(ALL_COL_KEYS);
  }
}

function sortValue(key, plan, firm) {
  if (key === 'planType' || key === 'steps') {
    return String(plan[key] || '').toLowerCase();
  }
  if (key === 'profitSplit' || key === 'price' || key === 'rating') {
    const v = key === 'rating' ? firm.rating : plan[key];
    return typeof v === 'number' ? v : Number(v) || 0;
  }
  if (key === 'accountSize') {
    const m = String(plan.accountSize || '').match(/([\d.]+)/);
    return m ? Number(m[1]) * (String(plan.accountSize).includes('K') ? 1000 : 1) : 0;
  }
  if (key === 'profitTarget' || key === 'maxLoss' || key === 'activationFee') {
    const raw = String(plan[key] ?? '');
    if (/none/i.test(raw)) return -1;
    const m = raw.replace(/,/g, '').match(/-?[\d.]+/);
    return m ? Number(m[0]) : 0;
  }
  if (key === 'ptDd') {
    const parts = String(plan.ptDd || '').split(':');
    if (parts.length === 2) return Number(parts[1]) || 0;
    return 0;
  }
  return plan[key] ?? firm[key] ?? '';
}

function buildPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [];
  const push = n => {
    if (items[items.length - 1] !== n) items.push(n);
  };
  push(1);
  if (current > 3) push('…');
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n += 1) {
    push(n);
  }
  if (current < total - 2) push('…');
  push(total);
  return items;
}

function formatMultiLabel(selected, fallback) {
  if (!selected?.length) return fallback;
  if (selected.length === 1) return selected[0];
  return 'Multiple';
}

function computeFilterBounds() {
  const prices = [];
  const splits = [];
  const ratings = [];
  const years = [];
  const drawdown = new Set();
  firms.forEach(f => {
    ratings.push(Number(f.rating) || 0);
    years.push(Number(f.years) || 0);
    (f.plans || []).forEach(p => {
      const sale = salePriceOf(p);
      if (sale > 0) prices.push(sale);
      const split =
        typeof p.profitSplit === 'number'
          ? p.profitSplit
          : Number(String(p.profitSplitLabel || p.profitSplit).match(/[\d.]+/)?.[0] || 0);
      if (Number.isFinite(split)) splits.push(split);
      drawdown.add(normalizeDrawdown(p.maxLossType));
    });
  });
  const priceMin = Math.max(1, Math.floor(Math.min(...prices, 1)));
  const priceMax = Math.ceil(Math.max(...prices, 100));
  return {
    price: { min: priceMin, max: priceMax, step: 1 },
    split: {
      min: Math.max(1, Math.floor(Math.min(...splits, 70))),
      max: Math.min(100, Math.ceil(Math.max(...splits, 100))),
    },
    rating: {
      min: 0,
      max: Math.max(1, Math.ceil((Math.max(...ratings.filter(r => r > 0), 5) || 5) * 10) / 10),
    },
    years: { min: 0, max: Math.max(1, Math.ceil(Math.max(...years, 1))) },
    drawdownTypes: ['EOD', 'Intraday', 'Static', 'Trailing'].filter(t => drawdown.has(t)),
  };
}

const FILTER_BOUNDS = computeFilterBounds();
const EMPTY_FACET = createEmptyFacet(FILTER_BOUNDS);

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  return `$${v.toFixed(2)}`;
}

function SortArrows({ active, direction }) {
  const upStrong = active && direction === 'asc';
  const downStrong = active && direction === 'desc';
  return (
    <span aria-hidden className="inline-flex text-current">
      <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
        <path d="M3.5 0L6.5 4H0.5L3.5 0Z" fill="currentColor" opacity={upStrong ? 1 : 0.3} />
        <path d="M3.5 10L0.5 6H6.5L3.5 10Z" fill="currentColor" opacity={downStrong ? 1 : 0.3} />
      </svg>
    </span>
  );
}

function firmWebsiteUrl(website) {
  if (!website || typeof website !== 'string') return null;
  const t = website.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const STAR_PATH =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27 6.2 20.37l1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';

function VerifiedBadge() {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 z-[2] grid size-4 place-items-center rounded-full border-[1.5px] border-[#080c0a] bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700 text-white shadow"
      title="Verified firm"
      aria-label="Verified"
    >
      <Star size={9} strokeWidth={0} fill="#fff" aria-hidden />
    </span>
  );
}

function RatingChip({ rating, reviews, idPrefix }) {
  if (reviews < 10) {
    return <span className="text-[0.68rem] font-semibold text-[#3FB185]">Less than 10 reviews</span>;
  }
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#3FB185]/35 bg-[#3FB185]/10 px-2 py-[3px]"
      aria-label={`Rated ${rating} from ${reviews} reviews`}
    >
      <span className="shrink-0 text-[0.72rem] font-bold tabular-nums text-white">{Number(rating).toFixed(1)}</span>
      <RatingStars rating={rating} idPrefix={idPrefix} />
      <span className="shrink-0 text-[0.68rem] font-bold tabular-nums text-[#3FB185]">[{reviews}]</span>
    </span>
  );
}

function splitDrawdown(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (raw.includes('/')) return raw.split('/').map(s => s.trim()).filter(Boolean);
  const m = raw.match(/^(EOD|Intraday|Static|Trailing)\s+(.+)$/i);
  if (m) return [m[1], m[2]];
  return [raw];
}

function RatingStars({ rating, idPrefix = 'star' }) {
  const rounded = Math.round(Math.min(5, Math.max(0, Number(rating) || 0)) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5 leading-none" aria-hidden>
      {[1, 2, 3, 4, 5].map(n => {
        const state = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
        const clipId = `${idPrefix}-half-${n}`;
        return (
          <span key={n} className="inline-flex size-[11px] shrink-0">
            <svg viewBox="0 0 24 24" width="11" height="11">
              <path d={STAR_PATH} className="fill-[#3FB185]/25" />
              {state === 'full' && <path d={STAR_PATH} className="fill-[#3FB185]" />}
              {state === 'half' && (
                <>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x="0" y="0" width="12" height="24" />
                    </clipPath>
                  </defs>
                  <path d={STAR_PATH} className="fill-[#3FB185]" clipPath={`url(#${clipId})`} />
                </>
              )}
            </svg>
          </span>
        );
      })}
    </span>
  );
}

function ProfitSplitBar({ pct }) {
  const raw = pct == null ? '' : String(pct).trim();
  const numericOnly = /^\d+(\.\d+)?$/.test(raw);
  const fillNum = numericOnly ? Number(raw) : Number(String(raw).match(/[\d.]+/)?.[0] || 0);
  if (!numericOnly && raw) {
    return <span className="font-bold text-white">{raw.includes('%') ? raw : `${raw}%`}</span>;
  }
  const fill = Math.min(100, Math.max(0, fillNum || 0));
  const segs = 10;
  const lit = Math.round((fill / 100) * segs);
  return (
    <div className="flex min-w-[110px] items-center gap-2.5">
      <span className="text-[0.95rem] font-extrabold text-white">{fill}%</span>
      <div className="flex min-w-14 flex-1 items-center gap-0.5" role="presentation" aria-hidden>
        {Array.from({ length: segs }, (_, i) => (
          <span
            key={i}
            className={`h-[7px] flex-1 rounded-sm ${
              i < lit
                ? 'bg-gradient-to-b from-[#3FB185] via-[#2d8a68] to-[#1B4B38]'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function InfoTip({ tipKey, text: textProp, label = 'More info' }) {
  const text = textProp || INFO_COPY[tipKey];
  const tipId = useId();
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, place: 'above' });

  const placeTip = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const place = r.top < 140 ? 'below' : 'above';
    setPos({
      top: place === 'above' ? r.top - 10 : r.bottom + 10,
      left: Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120),
      place,
    });
  }, []);

  const show = useCallback(() => {
    placeTip();
    setOpen(true);
  }, [placeTip]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onReposition = () => placeTip();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, placeTip]);

  if (!text) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        className="btn-bare inline-flex size-[18px] items-center justify-center rounded-full text-slate-400 hover:bg-[#3FB185]/15 hover:text-[#3FB185] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FB185]/55"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <ToolbarIcon name="info" />
      </button>
      {open &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className={`pointer-events-none fixed z-[10050] w-[min(240px,70vw)] rounded-[10px] border border-[#3FB185]/35 bg-gradient-to-b from-[#122018] to-[#0a1410] px-3 py-2.5 text-[0.72rem] font-medium leading-snug normal-case tracking-normal text-slate-200 shadow-[0_14px_32px_rgba(0,0,0,0.55)] ${
              pos.place === 'above' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'
            }`}
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}

function renderMidCell(col, p) {
  const style = { flex: `0 0 ${col.min}px`, minWidth: col.min };
  const wrap = `${MID_CELL} text-center text-[0.82rem] font-semibold leading-snug text-slate-50`;
  switch (col.key) {
    case 'planType':
      return (
        <div key={col.key} className={`${wrap} px-2 text-[0.78rem] leading-snug`} style={style}>
          <span className="line-clamp-2">{p.planType || '—'}</span>
        </div>
      );
    case 'steps':
      return (
        <div key={col.key} className={`${MID_CELL} px-2 whitespace-nowrap text-[0.82rem] font-semibold text-slate-50`} style={style}>
          {p.steps || '—'}
        </div>
      );
    case 'accountSize':
      return (
        <div key={col.key} className={`${MID_CELL} whitespace-nowrap text-[0.82rem] font-bold tabular-nums text-slate-50`} style={style}>
          {String(p.accountSize).replace('$', '')}
        </div>
      );
    case 'activationFee':
      return (
        <div key={col.key} className={`${wrap} text-slate-400`} style={style}>
          {p.activationFee}
        </div>
      );
    case 'maxLots':
      return (
        <div key={col.key} className={wrap} style={style}>
          {String(p.maxLots).includes('|') || String(p.maxLots).includes('/') ? (
            <>
              {String(p.maxLots)
                .split(/[|/]/)
                .map((part, i) => (
                  <span key={`${part}-${i}`}>
                    {i > 0 ? <span className="mx-0.5 text-slate-500"> | </span> : null}
                    {part.trim()}
                  </span>
                ))}
            </>
          ) : (
            p.maxLots
          )}
        </div>
      );
    case 'profitTarget':
    case 'maxLoss':
      return (
        <div key={col.key} className={wrap} style={style}>
          {p[col.key]}
        </div>
      );
    case 'maxLossType': {
      const lines = splitDrawdown(p.maxLossType);
      return (
        <div key={col.key} className={`${wrap} flex-col gap-0.5`} style={style}>
          {lines.map(line => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </div>
      );
    }
    case 'profitSplit':
      return (
        <div key={col.key} className={MID_CELL} style={style}>
          <ProfitSplitBar pct={p.profitSplitLabel || p.profitSplit} />
        </div>
      );
    case 'consistency':
      return (
        <div key={col.key} className={wrap} style={style}>
          <span className={p.consistencyEval === 'None' ? 'text-slate-500' : undefined}>
            {p.consistencyEval}
          </span>
          <span className="mx-0.5 text-slate-500"> | </span>
          <span className={p.consistencyFunded === 'None' ? 'text-slate-500' : undefined}>
            {p.consistencyFunded}
          </span>
        </div>
      );
    case 'payoutFreq':
      return (
        <div key={col.key} className={wrap} style={style}>
          {p.payoutFreq}
        </div>
      );
    default:
      return null;
  }
}

function ToolbarIcon({ name }) {
  const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true };
  const stroke = 'currentColor';
  switch (name) {
    case 'filter':
      return (
        <svg {...s}>
          <path d="M4 5h16l-5.5 7v6.5L10 17v-5L4 5z" stroke={stroke} strokeWidth="1.65" strokeLinejoin="round" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...s}>
          <path d="M7 4h10v17l-5-3.2L7 21V4z" stroke={stroke} strokeWidth="1.65" strokeLinejoin="round" />
        </svg>
      );
    case 'chevron':
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'info':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...s}>
          <rect x="4" y="4" width="6" height="6" rx="1.2" stroke={stroke} strokeWidth="1.65" />
          <rect x="14" y="4" width="6" height="6" rx="1.2" stroke={stroke} strokeWidth="1.65" />
          <rect x="4" y="14" width="6" height="6" rx="1.2" stroke={stroke} strokeWidth="1.65" />
          <rect x="14" y="14" width="6" height="6" rx="1.2" stroke={stroke} strokeWidth="1.65" />
        </svg>
      );
    default:
      return null;
  }
}

function FilterDropdown({ id, label, valueLabel, open, onToggle, options, selected, onToggleOption }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onToggle(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={`btn-bare inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[0.78rem] font-semibold ${
          selected.length ? `border-[#3FB185]/50 bg-[#3FB185]/12 text-[#3FB185]` : 'border-white/10 bg-white/5 text-white/80'
        } ${open ? 'border-[#3FB185]/60' : ''}`}
        onClick={() => onToggle(open ? null : id)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-slate-400">{label}:</span>
        <span className="font-bold text-white">{valueLabel}</span>
        <ToolbarIcon name="chevron" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-xl border border-white/10 bg-[#0c1612] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          role="listbox"
          aria-label={`${label} options`}
        >
          <p className="mb-2 text-[0.68rem] text-slate-500">Select one or multiple options</p>
          <div className="flex flex-wrap gap-2">
            {options.map(opt => {
              const on = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`min-h-8 rounded-full border px-2.5 py-1.5 text-[0.7rem] font-semibold ${on ? CHIP_ON : CHIP_OFF}`}
                  onClick={() => onToggleOption(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'default', label: 'Popularity' },
  { key: 'price', label: 'Price' },
  { key: 'accountSize', label: 'Account size' },
  { key: 'profitSplit', label: 'Profit split' },
  { key: 'profitTarget', label: 'Profit target' },
];

function sortLabel(sort) {
  return SORT_OPTIONS.find(o => o.key === sort.key)?.label || MID_COLS.find(c => c.key === sort.key)?.label || 'Popularity';
}

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <label className="inline-flex shrink-0 items-center gap-2">
      <button
        type="button"
        className={`btn-bare relative h-6 w-11 rounded-full border transition-colors ${
          checked ? 'border-[#3FB185]/60 bg-[#3FB185]' : 'border-white/15 bg-white/10'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-[3px] grid size-[18px] place-items-center rounded-full bg-white text-[#1B4B38] transition-[left] ${
            checked ? 'left-[22px]' : 'left-[3px]'
          }`}
        >
          {checked ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : null}
        </span>
      </button>
      <span className="whitespace-nowrap text-[0.78rem] font-semibold text-white/75">{label}</span>
    </label>
  );
}

function HeadLabel({ label, label2 }) {
  if (!label2) return <span>{label}</span>;
  return (
    <span className="flex flex-col items-center leading-[1.15] text-center">
      <span>{label}</span>
      <span>{label2}</span>
    </span>
  );
}

function SortHead({ label, label2, sortKey, sort, onSort, className = '', sub, tip, style }) {
  return (
    <div
      role="columnheader"
      className={`${TH} ${label2 || sub ? 'whitespace-normal' : ''} ${className}`.trim()}
      style={style}
      aria-sort={sort.key === sortKey ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="btn-bare inline-flex items-center gap-0.5 uppercase"
          onClick={() => onSort(sortKey)}
        >
          <HeadLabel label={label} label2={label2} />
          <SortArrows active={sort.key === sortKey} direction={sort.dir} />
        </button>
        {tip ? <InfoTip tipKey={tip} /> : null}
      </div>
      {sub ? <span className="text-[0.62rem] font-medium normal-case tracking-normal text-slate-500">{sub}</span> : null}
    </div>
  );
}

function StaticHead({ label, label2, sub, tip, className = '', style }) {
  return (
    <div role="columnheader" className={`${TH} ${label2 || sub ? 'whitespace-normal' : ''} ${className}`.trim()} style={style}>
      <div className="flex items-center gap-0.5">
        <span className="uppercase">
          <HeadLabel label={label} label2={label2} />
        </span>
        {tip ? <InfoTip tipKey={tip} /> : null}
      </div>
      {sub ? <span className="text-[0.62rem] font-medium normal-case tracking-normal text-slate-500">{sub}</span> : null}
    </div>
  );
}

function TableScrollSlider({ getMidPanes, masterRef }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const [metrics, setMetrics] = useState({ thumbPct: 40, leftPct: 0, needed: false });

  const measure = useCallback(() => {
    const el = masterRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    const needed = scrollWidth > clientWidth + 2;
    const thumbPct = needed ? Math.max(12, (clientWidth / scrollWidth) * 100) : 100;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const leftPct = needed ? (scrollLeft / maxScroll) * (100 - thumbPct) : 0;
    setMetrics({ thumbPct, leftPct, needed });
  }, [masterRef]);

  useEffect(() => {
    const el = masterRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [masterRef, measure]);

  const setAllScroll = useCallback(
    left => {
      getMidPanes().forEach(pane => {
        if (pane) pane.scrollLeft = left;
      });
      measure();
    },
    [getMidPanes, measure]
  );

  const scrollFromClientX = useCallback(
    clientX => {
      const el = masterRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const rect = track.getBoundingClientRect();
      const thumbW = (metrics.thumbPct / 100) * rect.width;
      const usable = Math.max(1, rect.width - thumbW);
      const x = Math.min(Math.max(clientX - rect.left - thumbW / 2, 0), usable);
      const ratio = x / usable;
      const maxScroll = el.scrollWidth - el.clientWidth;
      setAllScroll(ratio * maxScroll);
    },
    [masterRef, metrics.thumbPct, setAllScroll]
  );

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return;
      scrollFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [scrollFromClientX]);

  if (!metrics.needed) {
    return (
      <div className="relative h-2 min-w-0 flex-1" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute inset-x-[8%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-linear-to-r from-transparent via-[#3FB185] to-transparent shadow-[0_0_12px_rgba(63,177,133,0.45)]" />
      </div>
    );
  }

  return (
    <div
      className="relative h-2 min-w-[120px] flex-1 cursor-pointer"
      ref={trackRef}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-controls="cmp-mid-scroller"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(metrics.leftPct)}
      onPointerDown={e => {
        dragging.current = true;
        scrollFromClientX(e.clientX);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" aria-hidden />
      <div
        className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1B4B38] via-[#3FB185] to-[#3FB185]/70 shadow-[0_0_12px_rgba(63,177,133,0.35)]"
        style={{ width: `${metrics.thumbPct}%`, left: `${metrics.leftPct}%` }}
      />
    </div>
  );
}

export default function FirmCompareDemo() {
  const [topMode, setTopMode] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());
  const [facet, setFacet] = useState(() => cloneFacet(EMPTY_FACET));
  const [draft, setDraft] = useState(() => cloneFacet(EMPTY_FACET));
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [search, setSearch] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() => new Set(ALL_COL_KEYS));
  const [colsHydrated, setColsHydrated] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sort, setSort] = useState({ key: 'default', dir: 'asc' });
  const [page, setPage] = useState(1);
  const toolbarRef = useRef(null);
  const boardRef = useRef(null);
  const masterMidRef = useRef(null);
  const midScrollLeft = useRef(0);
  const syncingScroll = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const visibleMidCols = useMemo(() => MID_COLS.filter(c => visibleCols.has(c.key)), [visibleCols]);

  useEffect(() => {
    setVisibleCols(loadVisibleCols());
    setColsHydrated(true);
  }, []);

  useEffect(() => {
    if (!colsHydrated) return;
    try {
      window.localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify([...visibleCols]));
    } catch {
      /* ignore */
    }
  }, [visibleCols, colsHydrated]);

  const toggleCol = useCallback(key => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 3) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getMidPanes = useCallback(() => {
    const root = boardRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll('.cmp-mid'));
  }, []);

  const setMasterMidRef = useCallback(el => {
    masterMidRef.current = el;
  }, []);

  const applyMidScroll = useCallback(
    (left, source) => {
      midScrollLeft.current = left;
      getMidPanes().forEach(pane => {
        if (pane !== source && pane.scrollLeft !== left) pane.scrollLeft = left;
      });
    },
    [getMidPanes]
  );

  const onMidScroll = useCallback(
    e => {
      if (syncingScroll.current) return;
      syncingScroll.current = true;
      applyMidScroll(e.currentTarget.scrollLeft, e.currentTarget);
      requestAnimationFrame(() => {
        syncingScroll.current = false;
      });
    },
    [applyMidScroll]
  );

  const uniqueCountries = useMemo(
    () => [...new Set(firms.map(f => f.countryCode).filter(Boolean))].sort(),
    []
  );
  const uniquePlatforms = useMemo(() => {
    const s = new Set();
    firms.forEach(f => (f.platforms || []).forEach(p => s.add(p)));
    return [...s].sort();
  }, []);
  const firmList = useMemo(
    () =>
      [...firms]
        .filter(f => (f.plans || []).length)
        .sort((a, b) => firmOrderIndex(a.name) - firmOrderIndex(b.name)),
    []
  );
  const availableSizes = useMemo(() => {
    const present = new Set();
    firms.forEach(f => (f.plans || []).forEach(p => present.add(p.accountSize)));
    return ACCOUNT_SIZE_OPTIONS.filter(s => present.has(s));
  }, []);

  const filterOptions = useMemo(
    () => ({
      assets: [],
      sizes: availableSizes,
      steps: STEP_FILTER_OPTIONS,
      priceTypes: PRICE_OPTIONS,
      drawdownTypes: FILTER_BOUNDS.drawdownTypes,
      platforms: uniquePlatforms,
      countries: uniqueCountries,
    }),
    [uniquePlatforms, uniqueCountries, availableSizes]
  );

  useEffect(() => {
    if (!openDropdown && !customizeOpen) return undefined;
    const onPointer = e => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setCustomizeOpen(false);
      }
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setCustomizeOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [openDropdown, customizeOpen]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen || !isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, isMobile]);

  const toggleFavorite = useCallback(name => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_FAVORITES) next.add(name);
      return next;
    });
  }, []);

  const openSidebar = useCallback(() => {
    setDraft(cloneFacet(facet));
    setSidebarOpen(true);
    setOpenDropdown(null);
    setCustomizeOpen(false);
  }, [facet]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    if (isMobile) setDraft(cloneFacet(facet));
  }, [facet, isMobile]);

  const applyDraftFacet = useCallback(
    next => {
      setDraft(next);
      if (!isMobile) setFacet(cloneFacet(next));
    },
    [isMobile]
  );

  const applyMobileFilters = useCallback(() => {
    setFacet(cloneFacet(draft));
    setSidebarOpen(false);
  }, [draft]);

  const resetFacets = useCallback(() => {
    const empty = cloneFacet(EMPTY_FACET);
    setDraft(empty);
    setFacet(empty);
    setSearch('');
    setOpenDropdown(null);
    setSort({ key: 'default', dir: 'asc' });
  }, []);

  const toggleMulti = useCallback(
    (key, value) => {
      setFacet(prev => {
        const list = prev[key];
        const nextList = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
        const next = { ...prev, [key]: nextList };
        if (sidebarOpen) setDraft(cloneFacet(next));
        return next;
      });
    },
    [sidebarOpen]
  );

  const cycleSort = useCallback(key => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'desc' };
      return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
    });
  }, []);

  const filtered = useMemo(() => {
    let rows = [];
    firms.forEach(f => {
      (f.plans || []).forEach(p => {
        rows.push({ firm: f, plan: p });
      });
    });

    if (topMode === 'favorites') {
      rows = rows.filter(r => favorites.has(r.firm.name));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r => {
        const name = r.firm.name.toLowerCase();
        const planType = String(r.plan.planType || '').toLowerCase();
        return name.includes(q) || planType.includes(q) || `${name} ${planType}`.includes(q);
      });
    }

    if (facet.sizes.length) {
      rows = rows.filter(r => facet.sizes.includes(r.plan.accountSize));
    }
    if (facet.steps.length) {
      rows = rows.filter(r => planMatchesStepFilter(r.plan.steps, facet.steps));
    }
    if (facet.prices.length) {
      rows = rows.filter(r => facet.prices.includes(r.plan.priceType));
    }
    if (facet.firms.length) {
      rows = rows.filter(r => facet.firms.includes(r.firm.name));
    }
    if (facet.drawdownTypes.length) {
      rows = rows.filter(r => facet.drawdownTypes.includes(normalizeDrawdown(r.plan.maxLossType)));
    }
    if (facet.platforms.length) {
      rows = rows.filter(r => facet.platforms.some(p => r.firm.platforms.includes(p)));
    }
    if (facet.countries.length) {
      rows = rows.filter(r => facet.countries.includes(r.firm.countryCode));
    }
    if (isRangeActive(facet.priceRange, FILTER_BOUNDS.price)) {
      const { min, max } = facet.priceRange;
      rows = rows.filter(r => {
        const price = applyDiscount ? salePriceOf(r.plan) : listPriceOf(r.plan);
        return price >= min && price <= max;
      });
    }
    if (isRangeActive(facet.splitRange, FILTER_BOUNDS.split)) {
      const { min, max } = facet.splitRange;
      rows = rows.filter(r => {
        const split =
          typeof r.plan.profitSplit === 'number'
            ? r.plan.profitSplit
            : Number(String(r.plan.profitSplitLabel || r.plan.profitSplit).match(/[\d.]+/)?.[0] || 0);
        return split >= min && split <= max;
      });
    }
    if (isRangeActive(facet.ratingRange, FILTER_BOUNDS.rating)) {
      const { min, max } = facet.ratingRange;
      rows = rows.filter(r => {
        const rating = Number(r.firm.rating) || 0;
        return rating >= min && rating <= max;
      });
    }
    if (isRangeActive(facet.yearsRange, FILTER_BOUNDS.years)) {
      const { min, max } = facet.yearsRange;
      rows = rows.filter(r => {
        const y = Number(r.firm.years) || 0;
        return y >= min && y <= max;
      });
    }

    const mul = sort.dir === 'desc' ? -1 : 1;
    const isDefaultSort = !sort.key || sort.key === 'default';
    const hasBrowseFilters =
      topMode === 'favorites' || Boolean(search.trim()) || countActiveFilters(facet, FILTER_BOUNDS) > 0;

    if (isDefaultSort && !hasBrowseFilters) {
      return buildCuratedDefaultRows(rows);
    }

    rows = [...rows].sort((a, b) => {
      if (isDefaultSort) {
        const byFirm = firmOrderIndex(a.firm.name) - firmOrderIndex(b.firm.name);
        if (byFirm !== 0) return byFirm;
        return sortValue('accountSize', b.plan, b.firm) - sortValue('accountSize', a.plan, a.firm);
      }

      const av = sortValue(sort.key, a.plan, a.firm);
      const bv = sortValue(sort.key, b.plan, b.firm);
      let primary = 0;
      if (typeof av === 'number' && typeof bv === 'number') primary = (av - bv) * mul;
      else primary = String(av ?? '').localeCompare(String(bv ?? '')) * mul;
      if (primary !== 0) return primary;
      return firmOrderIndex(a.firm.name) - firmOrderIndex(b.firm.name);
    });

    return rows;
  }, [topMode, favorites, facet, sort, search, applyDiscount]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [topMode, facet, sort, search]);

  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    const left = midScrollLeft.current;
    const id = requestAnimationFrame(() => applyMidScroll(left, null));
    return () => cancelAnimationFrame(id);
  }, [pageRows, visibleMidCols, applyMidScroll]);

  useEffect(() => {
    const root = boardRef.current;
    if (!root) return undefined;

    const onWheel = e => {
      const mid = e.target instanceof Element ? e.target.closest('.cmp-mid') : null;
      if (!mid || !root.contains(mid)) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const shiftVertical = e.shiftKey && Math.abs(e.deltaY) > 0;
      if (!horizontal && !shiftVertical) return;
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      const max = Math.max(0, mid.scrollWidth - mid.clientWidth);
      const next = Math.min(Math.max(mid.scrollLeft + delta, 0), max);
      syncingScroll.current = true;
      applyMidScroll(next, null);
      requestAnimationFrame(() => {
        syncingScroll.current = false;
      });
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      root.removeEventListener('wheel', onWheel);
    };
  }, [applyMidScroll]);

  const favCount = favorites.size;
  const activeFilterCount = countActiveFilters(facet, FILTER_BOUNDS);
  const draftFilterCount = countActiveFilters(draft, FILTER_BOUNDS);

  return (
    <div className="relative w-full font-[family-name:var(--font-body)]">
      <div className="flex w-full items-start">
        <CompareFilterSidebar
          open={sidebarOpen}
          draft={draft}
          bounds={FILTER_BOUNDS}
          options={filterOptions}
          firmList={firmList}
          onChange={applyDraftFacet}
          onApply={applyMobileFilters}
          onReset={resetFacets}
          onClose={closeSidebar}
          activeCount={isMobile ? draftFilterCount : activeFilterCount}
        />

        <div className="min-w-0 flex-1">
          <div className="w-full">
            <div
              className="relative z-[3] flex flex-col gap-3 rounded-t-2xl border border-white/10 border-b-[#3FB185]/25 bg-[#08120e]/90 px-4 py-3 sm:px-[18px] sm:py-3.5"
              ref={toolbarRef}
            >
              <div
                className={`scrollbar-none relative flex min-w-0 flex-nowrap items-center gap-2 ${
                  openDropdown ? 'overflow-visible' : 'overflow-x-auto'
                }`}
                role="toolbar"
                aria-label="Quick filters"
              >
                <button
                  type="button"
                  className={`btn-bare relative grid size-10 shrink-0 place-items-center rounded-xl border ${
                    sidebarOpen
                      ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]'
                      : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                  onClick={() => {
                    if (sidebarOpen) closeSidebar();
                    else openSidebar();
                  }}
                  aria-pressed={sidebarOpen}
                  aria-expanded={sidebarOpen}
                  aria-controls="cmp-filters"
                  aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
                >
                  <ToolbarIcon name="filter" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#3FB185] px-1 text-[9px] font-bold text-[#0a0f0d]">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>

                <FilterDropdown
                  id="sizes"
                  label="Size"
                  valueLabel={formatMultiLabel(facet.sizes, 'All')}
                  open={openDropdown === 'sizes'}
                  onToggle={setOpenDropdown}
                  options={availableSizes.length ? availableSizes : ACCOUNT_SIZE_OPTIONS}
                  selected={facet.sizes}
                  onToggleOption={opt => toggleMulti('sizes', opt)}
                />
                <FilterDropdown
                  id="steps"
                  label="Steps"
                  valueLabel={formatMultiLabel(facet.steps, 'All')}
                  open={openDropdown === 'steps'}
                  onToggle={setOpenDropdown}
                  options={STEP_FILTER_OPTIONS}
                  selected={facet.steps}
                  onToggleOption={opt => toggleMulti('steps', opt)}
                />
                <FilterDropdown
                  id="prices"
                  label="Price"
                  valueLabel={formatMultiLabel(facet.prices, 'All')}
                  open={openDropdown === 'prices'}
                  onToggle={setOpenDropdown}
                  options={PRICE_OPTIONS}
                  selected={facet.prices}
                  onToggleOption={opt => toggleMulti('prices', opt)}
                />

                <ToggleSwitch label="Apply discounts" checked={applyDiscount} onChange={setApplyDiscount} />

                <button
                  type="button"
                  className={`btn-bare inline-flex h-10 shrink-0 items-center rounded-full px-5 text-[0.82rem] font-bold ${
                    topMode === 'all'
                      ? 'bg-[#3FB185] text-[#0a0f0d]'
                      : 'border border-white/10 bg-white/5 text-white/80'
                  }`}
                  onClick={() => setTopMode('all')}
                  aria-pressed={topMode === 'all'}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn-bare inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[0.78rem] font-semibold ${
                    topMode === 'favorites'
                      ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]'
                      : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                  onClick={() => setTopMode('favorites')}
                  aria-pressed={topMode === 'favorites'}
                >
                  <ToolbarIcon name="bookmark" />
                  {favCount}/{MAX_FAVORITES}
                </button>

                <label className="ml-auto flex h-10 w-[min(100%,280px)] min-w-[200px] shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[#3FB185]/45">
                  <svg className="shrink-0 text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    className="min-w-0 flex-1 border-0 bg-transparent text-[0.82rem] text-white outline-none placeholder:text-white/35"
                    placeholder="Search for challenges..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search for challenges"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {search ? (
                    <button
                      type="button"
                      className="btn-bare text-white/40 hover:text-white"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  ) : null}
                </label>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <p className="m-0 shrink-0 text-[0.92rem] font-semibold text-[#3FB185]">
                  {filtered.length.toLocaleString('en-US')} prop firm challenges
                </p>
                <TableScrollSlider getMidPanes={getMidPanes} masterRef={masterMidRef} />
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="btn-bare inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-white/70 hover:text-white"
                    onClick={() => {
                      setOpenDropdown(openDropdown === 'sort' ? null : 'sort');
                      setCustomizeOpen(false);
                    }}
                    aria-expanded={openDropdown === 'sort'}
                    aria-haspopup="listbox"
                  >
                    <span>
                      Sorted by: <span className="text-white">{sortLabel(sort)}</span>
                    </span>
                    <span className="inline-flex flex-col text-[7px] leading-[0.65]" aria-hidden>
                      <span>▲</span>
                      <span>▼</span>
                    </span>
                  </button>
                  {openDropdown === 'sort' ? (
                    <div
                      className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] rounded-xl border border-white/10 bg-[#0c1612] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                      role="listbox"
                      aria-label="Sort challenges"
                    >
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          role="option"
                          aria-selected={sort.key === opt.key}
                          className={`btn-bare flex w-full rounded-lg px-2.5 py-2 text-left text-[0.78rem] font-semibold ${
                            sort.key === opt.key ? 'bg-[#3FB185]/15 text-[#3FB185]' : 'text-white/75 hover:bg-white/5'
                          }`}
                          onClick={() => {
                            setSort({ key: opt.key, dir: opt.key === 'default' ? 'asc' : 'desc' });
                            setOpenDropdown(null);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className={`btn-bare grid size-9 place-items-center rounded-xl border ${
                      customizeOpen
                        ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]'
                        : 'border-white/10 bg-white/5 text-white/70'
                    }`}
                    onClick={() => {
                      setCustomizeOpen(v => !v);
                      setOpenDropdown(null);
                    }}
                    aria-pressed={customizeOpen}
                    aria-expanded={customizeOpen}
                    aria-label="Customize columns"
                  >
                    <ToolbarIcon name="grid" />
                  </button>
                  {customizeOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-xl border border-white/10 bg-[#0c1612] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                      role="dialog"
                      aria-label="Customize columns"
                    >
                      <p className="mb-2 text-[0.72rem] font-semibold text-white/70">Show or hide columns</p>
                      <div className="flex flex-col gap-1.5">
                        {MID_COLS.map(col => (
                          <label key={col.key} className="flex items-center gap-2 text-[0.75rem] text-white/80">
                            <input
                              type="checkbox"
                              className="accent-[#3FB185]"
                              checked={visibleCols.has(col.key)}
                              onChange={() => toggleCol(col.key)}
                            />
                            <span>{col.label2 ? `${col.label} ${col.label2}` : col.label}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn-bare mt-2 text-[0.72rem] font-semibold text-[#3FB185] hover:underline"
                        onClick={() => setVisibleCols(new Set(ALL_COL_KEYS))}
                      >
                        Reset columns
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="cmp-edge-board relative z-[1] mt-0 flex w-full min-w-0 flex-col overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-[#060c0a]"
              ref={boardRef}
              role="table"
              aria-label="Compare prop firm challenges: size, drawdown, contracts, payouts, and price"
            >
              <div className={`${ROW} cmp-edge-row--head m-0`} role="row">
                <div className={`${PIN_FIRM} ${PIN_HEAD}`} role="columnheader">
                  <span className={`${TH} w-full items-start pl-4 text-left`}>Firm</span>
                </div>
                <div className={`${MID} flex items-center`} id="cmp-mid-scroller" ref={setMasterMidRef} onScroll={onMidScroll} role="presentation">
                  <div className="flex min-h-[52px] w-max items-center">
                    {visibleMidCols.map(col =>
                      col.sort ? (
                        <SortHead
                          key={col.key}
                          label={col.label}
                          label2={col.label2}
                          sub={col.sub}
                          tip={col.tip}
                          sortKey={col.key}
                          sort={sort}
                          onSort={cycleSort}
                          className={MID_CELL}
                          style={{ flex: `0 0 ${col.min}px`, minWidth: col.min }}
                        />
                      ) : (
                        <StaticHead
                          key={col.key}
                          label={col.label}
                          label2={col.label2}
                          sub={col.sub}
                          tip={col.tip}
                          className={MID_CELL}
                          style={{ flex: `0 0 ${col.min}px`, minWidth: col.min }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className={`${PIN_PRICE} ${PIN_HEAD} justify-end`} role="columnheader">
                  <SortHead
                    label="Price"
                    tip="price"
                    sortKey="price"
                    sort={sort}
                    onSort={cycleSort}
                    className="w-full items-end text-right"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="block px-6 py-10 text-center text-sm text-slate-400" role="row">
                  <div role="cell">
                    No challenges match these filters. Try{' '}
                    <button
                      type="button"
                      className="btn-bare font-semibold text-[#3FB185] underline"
                      onClick={() => {
                        resetFacets();
                        setTopMode('all');
                      }}
                    >
                      resetting
                    </button>{' '}
                    or switching to <strong>All</strong>.
                  </div>
                </div>
              ) : (
                pageRows.map(({ firm: f, plan: p }, i) => {
                  const websiteHref = firmWebsiteUrl(f.website);
                  const salePrice = salePriceOf(p);
                  const listPrice = listPriceOf(p);
                  const displayPrice = applyDiscount ? salePrice : listPrice;
                  const showWas = applyDiscount && listPrice > salePrice;
                  const even = i % 2 === 1;
                  const logoSrc = firmLogo(f.name, f.logo);
                  return (
                    <div
                      key={p.id}
                      className={`${ROW} group ${even ? 'cmp-edge-row--even' : ''}`}
                      role="row"
                      style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
                    >
                      <div className={`${PIN_FIRM}`} role="cell">
                        <div className="flex w-full min-w-0 items-start gap-3">
                          <div className="relative mt-0.5 shrink-0" style={{ width: 40, height: 40 }}>
                            <div className="size-10 overflow-hidden rounded-full bg-black ring-1 ring-white/15">
                              {logoSrc ? (
                                <img
                                  src={logoSrc}
                                  alt=""
                                  width={80}
                                  height={80}
                                  className="size-full object-cover object-center"
                                />
                              ) : (
                                <span className="grid size-full place-items-center text-[0.58rem] font-bold text-white/50">
                                  {f.name.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            {f.reviews >= 10 && f.rating >= 4 ? <VerifiedBadge /> : null}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1 pt-0.5">
                            <span className="block w-full truncate text-[0.92rem] font-bold leading-tight tracking-tight text-slate-50">
                              {f.name}
                            </span>
                            <RatingChip rating={f.rating} reviews={f.reviews} idPrefix={`r-${p.id}`} />
                          </div>
                          <button
                            type="button"
                            className={`btn-bare grid size-7 shrink-0 place-items-center rounded-md ${
                              favorites.has(f.name)
                                ? 'text-[#3FB185]'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                            onClick={() => toggleFavorite(f.name)}
                            aria-label={
                              favorites.has(f.name)
                                ? `Remove ${f.name} from bookmarks`
                                : `Bookmark ${f.name}`
                            }
                            aria-pressed={favorites.has(f.name)}
                            disabled={!favorites.has(f.name) && favorites.size >= MAX_FAVORITES ? true : undefined}
                          >
                            <Bookmark
                              size={15}
                              strokeWidth={1.85}
                              fill={favorites.has(f.name) ? 'currentColor' : 'transparent'}
                              aria-hidden
                            />
                          </button>
                        </div>
                      </div>

                      <div className={`${MID}`} onScroll={onMidScroll} role="presentation">
                        <div className="flex min-h-full w-max items-stretch">
                          {visibleMidCols.map(col => renderMidCell(col, p))}
                        </div>
                      </div>

                      <div className={`${PIN_PRICE}`} role="cell">
                        <div className="flex w-full items-center justify-end gap-2.5">
                          <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[1.05rem] font-extrabold tracking-tight tabular-nums text-white">
                                {formatMoney(displayPrice)}
                              </span>
                              {p.priceNote ? (
                                <InfoTip text={p.priceNote} label="Other price options for this plan" />
                              ) : null}
                            </span>
                            {showWas ? (
                              <span className="text-[0.72rem] text-slate-500 line-through tabular-nums">
                                {formatMoney(listPrice)}
                              </span>
                            ) : null}
                            <span className="text-[0.65rem] lowercase text-slate-500">
                              {String(p.priceType || 'One Time').toLowerCase()}
                            </span>
                          </div>
                          {websiteHref ? (
                            <PfgPrimary
                              href={websiteHref}
                              compact
                              className="h-8 rounded-full! px-3.5"
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                            >
                              KAGE
                            </PfgPrimary>
                          ) : (
                            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-white/5 px-3 text-[0.75rem] font-bold text-slate-500">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {filtered.length > 0 && (
              <nav className="mt-3 flex flex-wrap items-center justify-center gap-2.5" aria-label="Table pagination">
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <button
                    type="button"
                    className="inline-flex min-h-7 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1 ? true : undefined}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  {pageItems.map((item, idx) =>
                    item === '…' ? (
                      <span key={`e-${idx}`} className="inline-flex h-7 w-5 items-center justify-center text-[0.75rem] font-bold text-slate-500" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`size-7 rounded-[7px] text-[0.72rem] font-semibold ${
                          page === item
                            ? 'bg-[#3FB185] text-[#0a0f0d]'
                            : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                        onClick={() => setPage(item)}
                        aria-label={`Page ${item}`}
                        aria-current={page === item ? 'page' : undefined}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="inline-flex min-h-7 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                    onClick={() => setPage(p => Math.min(p, totalPages))}
                    disabled={page >= totalPages ? true : undefined}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
                <span className="text-[0.72rem] text-slate-500" aria-live="polite">
                  {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
