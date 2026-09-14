'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bookmark, Search, Star } from 'lucide-react';
import CompareFilterSidebar, {
  cloneFacet,
  countActiveFilters,
  createEmptyFacet,
  isRangeActive,
  normalizeDrawdown,
} from '@/components/CompareFilterSidebar';
import { PfgPrimary } from '@/components/green/PfgControls';
import { firmLogo } from '@/lib/firmLogos';
import { summarizeFirm } from '@/lib/firmOverview';
import PlatformMarks from '@/components/green/PlatformMarks';
import { compareFirmNames, defaultSortDir } from '@/lib/firmSort';
import { salePriceOf } from '@/lib/planPrice';
import './FirmOverviewTable.css';

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MAX_FAVORITES = 5;
const FAV_KEY = 'cmp-overview-favs';
const COLS_KEY = 'cmp-overview-cols-v2';

const MID_COLS = [
  { key: 'size', label: 'Account size', min: 120 },
  { key: 'platforms', label: 'Platforms', min: 160 },
  { key: 's2f', label: 'Straight to funded', min: 128 },
  { key: 'evalPrice', label: 'Eval from', min: 104 },
  { key: 'activation', label: 'Activation fee', min: 132 },
  { key: 'allIn', label: 'All-in from', min: 104 },
  { key: 'drawdown', label: 'Drawdown type', min: 140 },
  { key: 'maxLoss', label: 'Max loss', min: 104 },
  { key: 'days', label: 'Days to pass', min: 112 },
  { key: 'news', label: 'News trading', min: 112 },
  { key: 'split', label: 'Profit split', min: 104 },
  { key: 'payout', label: 'Payout freq.', min: 132 },
  { key: 'accounts', label: 'Max funded', min: 104 },
  { key: 'discount', label: 'Discount', min: 168 },
  { key: 'description', label: 'Overview', min: 200 },
];

const ALL_COL_KEYS = MID_COLS.map(c => c.key);

const SORT_OPTIONS = [
  { key: 'default', label: 'Popularity' },
  { key: 'firm', label: 'A–Z' },
  { key: 'rating', label: 'Rating' },
  { key: 'evalPrice', label: 'Eval price' },
  { key: 'allIn', label: 'All-in cost' },
];

function sortLabel(sort) {
  if (sort.key === 'firm' && sort.dir === 'desc') return 'Z–A';
  return (
    SORT_OPTIONS.find(o => o.key === sort.key)?.label ||
    MID_COLS.find(c => c.key === sort.key)?.label ||
    'Popularity'
  );
}

const ROW =
  'ov-row grid w-max min-w-full items-stretch grid-cols-[var(--ov-firm)_max-content_var(--ov-price)]';
const PIN_FIRM =
  'ov-pin-firm flex min-w-0 items-center self-stretch border-r border-white/[0.06]';
const PIN_ACTION =
  'ov-pin-price flex min-w-0 items-center justify-center self-stretch border-l border-white/[0.06]';
const PIN_HEAD = 'py-3';
const MID =
  'cmp-mid relative flex min-w-0 items-stretch overflow-visible bg-transparent';
const MID_CELL_BASE =
  'relative box-border flex h-full shrink-0 self-stretch border-r border-white/[0.06] last:border-r-0 px-3 py-2.5';
const MID_CELL = `${MID_CELL_BASE} items-center justify-center`;
const TH =
  'min-h-[40px] flex-col items-center justify-center gap-0.5 whitespace-nowrap text-center text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-slate-400/90';
const CHIP_ON = 'border-[#3FB185]/50 bg-[#3FB185]/15 text-[#3FB185]';
const CHIP_OFF = 'border-white/10 bg-black/20 text-slate-200 hover:border-emerald-500/35';

const STAR_PATH =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27 6.2 20.37l1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';

const INFO = {
  size: 'Account sizes this firm offers, from smallest to largest.',
  platforms: 'Trading platforms this firm supports.',
  s2f: 'Whether the firm sells a skip-the-eval / instant funded path.',
  evalPrice: 'Lowest evaluation price after the KAGE promo, when discounts are on.',
  activation: 'Compact fee in the cell (None, one fee, or a range). Open the row’s i button for every plan.',
  allIn: 'Cheapest eval plus that path’s activation fee, when the fee is a number.',
  drawdown: 'Drawdown styles across this firm’s plans.',
  maxLoss: 'Max loss range across account sizes.',
  days: 'Minimum trading days required to pass, if the firm sets one.',
  news: 'News trading: allowed, not allowed, or mixed by plan.',
  split: 'Trader profit split across plans.',
  payout: 'Cadence from the sheet Payout Freq. column, rolled up across plans (not size-by-size dollar notes).',
  accounts: 'Maximum funded accounts per trader.',
  discount: 'Current advertised offer with KAGE.',
  description: 'Short firm summary. Expand for the full blurb.',
};

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  return `$${v.toFixed(2)}`;
}

function HeadLabel({ label, label2 }) {
  return <span className="whitespace-nowrap">{label2 ? `${label} ${label2}` : label}</span>;
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

function CellTip({ label, children }) {
  const tipId = useId();
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, place: 'below' });

  const placeTip = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const place = r.bottom + 280 > window.innerHeight && r.top > 160 ? 'above' : 'below';
    setPos({
      top: place === 'above' ? r.top - 8 : r.bottom + 8,
      left: Math.min(Math.max(r.left + r.width / 2, 160), window.innerWidth - 160),
      place,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    placeTip();
    const onDoc = event => {
      const t = event.target;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => placeTip();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, placeTip]);

  if (!children) return null;

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <button
        ref={btnRef}
        type="button"
        className={`btn-bare inline-flex size-5 items-center justify-center rounded-full ${
          open ? 'bg-[#3FB185]/20 text-[#3FB185]' : 'text-slate-400 hover:bg-[#3FB185]/15 hover:text-[#3FB185]'
        }`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        onClick={event => {
          event.stopPropagation();
          setOpen(v => !v);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={tipId}
              role="dialog"
              aria-label={label}
              className={`fixed z-[10050] w-[min(320px,86vw)] max-h-[min(280px,70vh)] overflow-y-auto scrollbar-pfg rounded-[12px] border border-[#3FB185]/35 bg-[#0c1612] px-3.5 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.55)] ${
                pos.place === 'above' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'
              }`}
              style={{ top: pos.top, left: pos.left }}
            >
              <p className="m-0 mb-2 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[#3FB185]/85">{label}</p>
              {children}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}

function ActivationTip({ groups }) {
  if (!groups?.length) return null;
  return (
    <CellTip label="Activation fees">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {groups.map(g => (
          <li key={g.fee}>
            <p className="m-0 text-[0.8rem] font-bold leading-snug text-white">{g.fee}</p>
            <p className="m-0 mt-0.5 text-[0.72rem] font-medium leading-snug text-slate-400">
              {g.lines.join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </CellTip>
  );
}

function InfoTip({ text }) {
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

  if (!text) return null;
  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        className="btn-bare inline-flex size-[18px] items-center justify-center rounded-full text-slate-400 hover:bg-[#3FB185]/15 hover:text-[#3FB185]"
        aria-label="More info"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => {
          placeTip();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          placeTip();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
      {open &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className={`pointer-events-none fixed z-[10050] w-[min(240px,70vw)] rounded-[10px] border border-[#3FB185]/35 bg-gradient-to-b from-[#122018] to-[#0a1410] px-3 py-2.5 text-[0.72rem] font-medium leading-snug text-slate-200 shadow-[0_14px_32px_rgba(0,0,0,0.55)] ${
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

function RatingStars({ rating, idPrefix = 'ov' }) {
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

function ToolbarIcon({ name }) {
  const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true };
  if (name === 'filter') {
    return (
      <svg {...s}>
        <path d="M4 5h16l-5.5 7v6.5L10 17v-5L4 5z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'grid') {
    return (
      <svg {...s}>
        <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.65" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.65" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.65" />
        <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.65" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FirmSpot({ label, value, firms, other, onPick, onClear }) {
  const wrapRef = useRef(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });
  const matches = firms
    .filter(f => f.name !== other)
    .filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()));
  const selected = firms.find(f => f.name === value);

  const placeMenu = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, 220),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onWin = () => placeMenu();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open, placeMenu]);

  return (
    <div className="relative min-w-[150px] flex-1 max-md:min-w-0">
      <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[#3FB185]/70 max-md:mb-0.5 max-md:text-[0.52rem]">{label}</span>
      <div
        ref={wrapRef}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2.5 focus-within:border-[#3FB185]/45 max-md:h-8 max-md:gap-1 max-md:rounded-lg max-md:px-1.5"
      >
        {selected ? (
          <img src={firmLogo(selected.name, selected.logo)} alt="" className="size-6 rounded-md object-cover" />
        ) : null}
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-[0.8rem] text-white outline-none placeholder:text-white/35"
          placeholder="Any firm"
          value={open ? q : selected?.name || q}
          autoComplete="off"
          spellCheck={false}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
            if (!e.target.value) onPick(null);
          }}
          onFocus={() => {
            setQ(selected?.name || '');
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
        />
        {value ? (
          <button
            type="button"
            className="btn-bare text-white/40 hover:text-white"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setQ('');
              onClear();
            }}
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
        ) : null}
      </div>
      {open && matches.length
        ? createPortal(
            <div
              className="fixed z-[10040] max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-[#3FB185]/35 bg-[#0c1612] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.65)]"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              role="listbox"
              aria-label={`${label} matches`}
            >
              {matches.map(f => (
                <button
                  key={f.name}
                  type="button"
                  className="btn-bare flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.78rem] text-white/80 hover:bg-[#3FB185]/12"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    onPick(f.name);
                    setQ('');
                    setOpen(false);
                  }}
                >
                  <img src={firmLogo(f.name, f.logo)} alt="" className="size-6 rounded-md object-cover" />
                  {f.name}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function computeBounds(catalog) {
  const prices = [];
  const splits = [];
  const ratings = [];
  const years = [];
  const drawdown = new Set();
  catalog.forEach(f => {
    ratings.push(Number(f.rating) || 0);
    years.push(Number(f.years) || 0);
    (f.plans || []).forEach(p => {
      const sale = salePriceOf(p);
      if (sale > 0) prices.push(sale);
      if (typeof p.profitSplit === 'number') splits.push(p.profitSplit);
      drawdown.add(normalizeDrawdown(p.maxLossType));
    });
  });
  return {
    price: { min: Math.max(1, Math.floor(Math.min(...prices, 1))), max: Math.ceil(Math.max(...prices, 100)), step: 1 },
    split: {
      min: Math.max(1, Math.floor(Math.min(...splits, 70))),
      max: Math.min(100, Math.ceil(Math.max(...splits, 100))),
    },
    rating: { min: 0, max: 5 },
    years: { min: 0, max: Math.max(1, Math.ceil(Math.max(...years, 1))) },
    drawdownTypes: ['EOD', 'Intraday', 'Static', 'Trailing'].filter(t => drawdown.has(t)),
  };
}

function numFrom(raw) {
  const s = String(raw ?? '').trim();
  if (!s || /^none$/i.test(s) || s === '—' || s === '-') return 0;
  const m = s.replace(/,/g, '').match(/-?[\d.]+/);
  return m ? Number(m[0]) : 0;
}

function sortValue(key, row) {
  const f = row.firm;
  if (key === 'firm') return f?.name || '';
  if (key === 'rating') return Number(f.rating) || 0;
  if (key === 'size') return numFrom(row.sizes?.[row.sizes.length - 1] || row.sizeLabel);
  if (key === 'platforms') return (row.platforms || []).length;
  if (key === 's2f') return row.straightToFunded ? 1 : 0;
  if (key === 'evalPrice') return row.evalPrice || 0;
  if (key === 'activation') {
    if (/^none$/i.test(String(row.activationLabel || ''))) return 0;
    const n = numFrom(row.activationLabel);
    return n || 0;
  }
  if (key === 'allIn') return row.allIn || 0;
  if (key === 'drawdown') return String(row.drawdownLabel || '');
  if (key === 'maxLoss') return numFrom(row.maxLossLabel);
  if (key === 'days') return numFrom(row.daysToPass);
  if (key === 'news') {
    if (row.news === 'Allowed') return 2;
    if (row.news === 'Varies') return 1;
    return 0;
  }
  if (key === 'split') return Number(String(row.profitSplit).match(/\d+/)?.[0] || 0);
  if (key === 'payout') return String(row.payoutLabel || '');
  if (key === 'accounts') return numFrom(row.maxAccounts);
  if (key === 'discount') return numFrom(row.discountLabel);
  if (key === 'description') return String(f?.description || '');
  return Number(f?.likes) || 0;
}

export default function FirmOverviewTable({ firms: catalog = [] }) {
  const bounds = useMemo(() => computeBounds(catalog), [catalog]);
  const emptyFacet = useMemo(() => createEmptyFacet(bounds), [bounds]);
  const [facet, setFacet] = useState(emptyFacet);
  const [draft, setDraft] = useState(emptyFacet);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [spotA, setSpotA] = useState(null);
  const [spotB, setSpotB] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [topMode, setTopMode] = useState('all');
  const [sort, setSort] = useState({ key: 'default', dir: 'desc' });
  const [expanded, setExpanded] = useState(new Set());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() => new Set(ALL_COL_KEYS));
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const workbenchRef = useRef(null);
  const boardRef = useRef(null);
  const headRailRef = useRef(null);

  useEffect(() => {
    const board = boardRef.current;
    const rail = headRailRef.current;
    if (!board || !rail) return undefined;
    const sync = () => {
      rail.scrollLeft = board.scrollLeft;
    };
    sync();
    board.addEventListener('scroll', sync, { passive: true });
    return () => board.removeEventListener('scroll', sync);
  }, []);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      if (Array.isArray(raw)) setFavorites(new Set(raw));
    } catch {
      /* ignore */
    }
    try {
      const cols = JSON.parse(localStorage.getItem(COLS_KEY) || 'null');
      if (Array.isArray(cols) && cols.length) setVisibleCols(new Set(cols.filter(k => ALL_COL_KEYS.includes(k))));
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(COLS_KEY, JSON.stringify([...visibleCols]));
  }, [visibleCols]);

  const firmList = useMemo(
    () => catalog.filter(f => (f.plans || []).length || f.comingSoon),
    [catalog]
  );

  const filterOptions = useMemo(() => {
    const sizes = new Set();
    const platforms = new Set();
    const countries = new Set();
    catalog.forEach(f => {
      (f.accountSizes || []).forEach(s => sizes.add(s));
      (f.platforms || []).forEach(p => platforms.add(p));
      if (f.countryCode) countries.add(f.countryCode);
    });
    return {
      assets: [],
      sizes: [...sizes].sort((a, b) => Number(String(a).replace(/\D/g, '')) - Number(String(b).replace(/\D/g, ''))),
      steps: ['1 Step', 'Instant / Direct / STF'],
      priceTypes: ['One Time', 'Monthly'],
      drawdownTypes: bounds.drawdownTypes,
      platforms: [...platforms].sort(),
      countries: [...countries],
    };
  }, [catalog, bounds]);

  const rows = useMemo(
    () => firmList.map(f => summarizeFirm(f, { applyDiscount })),
    [firmList, applyDiscount]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const spots = [spotA, spotB].filter(Boolean);
    return rows.filter(row => {
      const f = row.firm;
      if (spots.length && !spots.includes(f.name)) return false;
      if (topMode === 'favorites' && !favorites.has(f.name)) return false;
      if (q && !`${f.name} ${(f.platforms || []).join(' ')} ${(row.types || []).join(' ')}`.toLowerCase().includes(q)) {
        return false;
      }
      if (facet.firms.length && !facet.firms.includes(f.name)) return false;
      if (facet.sizes.length && !facet.sizes.some(s => row.sizes.includes(s))) return false;
      if (facet.platforms.length && !facet.platforms.some(p => (f.platforms || []).includes(p))) return false;
      if (facet.countries.length && !facet.countries.includes(f.countryCode)) return false;
      if (facet.prices.length && !(f.priceType || []).some(t => facet.prices.includes(t))) return false;
      if (facet.steps.length) {
        const hasS2f = (f.steps || []).some(s => /instant|direct|stf/i.test(s));
        const hasStep = (f.steps || []).some(s => s === '1 Step');
        const ok = facet.steps.some(label =>
          label === 'Instant / Direct / STF' ? hasS2f : hasStep && label === '1 Step'
        );
        if (!ok) return false;
      }
      if (facet.drawdownTypes.length) {
        const types = (f.plans || []).map(p => normalizeDrawdown(p.maxLossType));
        if (!facet.drawdownTypes.some(t => types.includes(t))) return false;
      }
      if (isRangeActive(facet.priceRange, bounds.price)) {
        const p = row.fromPrice || 0;
        if (p < facet.priceRange.min || p > facet.priceRange.max) return false;
      }
      if (isRangeActive(facet.splitRange, bounds.split)) {
        const split = Number(String(row.profitSplit).match(/\d+/)?.[0] || 0);
        if (split < facet.splitRange.min || split > facet.splitRange.max) return false;
      }
      if (isRangeActive(facet.ratingRange, bounds.rating)) {
        const r = Number(f.rating) || 0;
        if (r < facet.ratingRange.min || r > facet.ratingRange.max) return false;
      }
      return true;
    });
  }, [rows, search, spotA, spotB, topMode, favorites, facet, bounds]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sort.key === 'default') return (Number(b.firm.likes) || 0) - (Number(a.firm.likes) || 0);
      if (sort.key === 'firm') return compareFirmNames(a.firm.name, b.firm.name, sort.dir);
      const va = sortValue(sort.key, a);
      const vb = sortValue(sort.key, b);
      if (typeof va === 'number' && typeof vb === 'number') {
        const cmp = va - vb;
        if (cmp !== 0) return sort.dir === 'asc' ? cmp : -cmp;
        return compareFirmNames(a.firm.name, b.firm.name);
      }
      return compareFirmNames(va, vb, sort.dir);
    });
    return copy;
  }, [filtered, sort]);

  const visibleMidCols = MID_COLS.filter(c => visibleCols.has(c.key));
  const colMin = col => (isMobile ? Math.max(108, Math.round(col.min * 0.9)) : col.min);

  const cycleSort = key => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: defaultSortDir(key) };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleFavorite = name => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_FAVORITES) next.add(name);
      if (next.size === 0) queueMicrotask(() => setTopMode('all'));
      return next;
    });
  };

  const activeFilterCount = countActiveFilters(facet, bounds);
  const draftFilterCount = countActiveFilters(draft, bounds);
  const h2hHref =
    spotA && spotB ? `/compare?a=${slugify(spotA)}&b=${slugify(spotB)}` : null;

  const renderMid = (col, row) => {
    const style = { flex: `0 0 ${colMin(col)}px`, minWidth: colMin(col) };
    const wrap = `${MID_CELL_BASE} min-h-[88px] items-center justify-center text-center text-[0.82rem] font-bold leading-snug text-slate-50`;
    switch (col.key) {
      case 'size':
        return (
          <div key={col.key} className={`${MID_CELL} min-h-[88px] whitespace-nowrap text-[0.82rem] font-bold text-slate-50`} style={style}>
            {row.sizeLabel}
          </div>
        );
      case 'platforms':
        return (
          <div key={col.key} className={`${MID_CELL} min-h-[88px]`} style={style}>
            <PlatformMarks names={row.platforms} />
          </div>
        );
      case 's2f':
        return (
          <div key={col.key} className={wrap} style={style}>
            {row.comingSoon ? '—' : row.straightToFunded ? <span className="text-[#3FB185]">Yes</span> : 'No'}
          </div>
        );
      case 'evalPrice':
        return (
          <div key={col.key} className={`${wrap} flex-col items-center justify-center`} style={style}>
            {row.evalWas && row.evalPrice && row.evalWas > row.evalPrice ? (
              <span className="text-[0.68rem] font-medium text-slate-500 line-through">{formatMoney(row.evalWas)}</span>
            ) : null}
            <span>{formatMoney(row.evalPrice)}</span>
          </div>
        );
      case 'activation':
        return (
          <div
            key={col.key}
            className={`${MID_CELL_BASE} min-h-[88px] items-center justify-center gap-1.5 text-center text-[0.82rem] font-bold leading-snug text-slate-300`}
            style={style}
          >
            <span className="min-w-0 truncate">{row.activationLabel}</span>
            {row.comingSoon ? null : <ActivationTip groups={row.activationGroups} />}
          </div>
        );
      case 'allIn':
        return (
          <div key={col.key} className={`${wrap} flex-col items-center justify-center text-[#3FB185]`} style={style}>
            <span>{formatMoney(row.allIn)}</span>
            {row.allInNote ? <span className="text-[0.62rem] font-medium text-slate-500">{row.allInNote}</span> : null}
          </div>
        );
      case 'drawdown':
        return (
          <div key={col.key} className={wrap} style={style}>
            <span className="whitespace-normal break-words text-center">{row.drawdownLabel}</span>
          </div>
        );
      case 'maxLoss':
        return (
          <div key={col.key} className={wrap} style={style}>
            <span className="whitespace-normal break-words text-center">{row.maxLossLabel}</span>
          </div>
        );
      case 'days':
        return (
          <div key={col.key} className={wrap} style={style}>
            {row.daysToPass}
          </div>
        );
      case 'news':
        return (
          <div key={col.key} className={wrap} style={style}>
            {row.news === 'Allowed' ? <span className="text-[#3FB185]">Allowed</span> : row.news}
          </div>
        );
      case 'split':
        return (
          <div key={col.key} className={wrap} style={style}>
            {row.profitSplit}
          </div>
        );
      case 'payout':
        return (
          <div key={col.key} className={wrap} style={style}>
            <span className="whitespace-normal break-words text-center">{row.payoutLabel}</span>
          </div>
        );
      case 'accounts':
        return (
          <div key={col.key} className={wrap} style={style}>
            {row.maxAccounts}
          </div>
        );
      case 'discount':
        return (
          <div key={col.key} className={`${wrap} text-[#3FB185]`} style={style}>
            <span className="whitespace-normal break-words text-center">{row.discountLabel}</span>
          </div>
        );
      case 'description': {
        const open = expanded.has(row.firm.name);
        const text = row.firm.description || '—';
        return (
          <div key={col.key} className={`${MID_CELL} min-h-[88px] max-w-72 flex-col items-center justify-center text-center`} style={style}>
            <p className={`m-0 text-[0.75rem] font-medium leading-snug text-slate-300 ${open ? '' : 'line-clamp-2'}`}>
              {text}
            </p>
            {text.length > 70 ? (
              <button
                type="button"
                className="btn-bare mt-1 text-[0.68rem] font-bold text-[#3FB185] hover:underline"
                onClick={() =>
                  setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(row.firm.name)) next.delete(row.firm.name);
                    else next.add(row.firm.name);
                    return next;
                  })
                }
              >
                {open ? 'Show less' : 'Read more'}
              </button>
            ) : null}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full font-[family-name:var(--font-body)]">
      <div className="flex w-full items-start">
        <div className="ov-no-print">
        <CompareFilterSidebar
          open={sidebarOpen}
          draft={isMobile ? draft : facet}
          bounds={bounds}
          options={filterOptions}
          firmList={firmList}
          onChange={next => (isMobile ? setDraft(next) : setFacet(next))}
          onApply={() => {
            setFacet(cloneFacet(draft));
            setSidebarOpen(false);
          }}
          onReset={() => {
            setFacet(createEmptyFacet(bounds));
            setDraft(createEmptyFacet(bounds));
          }}
          onClose={() => setSidebarOpen(false)}
          activeCount={isMobile ? draftFilterCount : activeFilterCount}
        />
        </div>

        <div className="min-w-0 flex-1">
          <div className="ov-workbench" ref={workbenchRef}>
          <div className="ov-sticky-top">
          <div className="ov-chrome ov-no-print flex flex-col gap-3 rounded-t-2xl border border-white/10 border-b-[#3FB185]/25 px-4 py-3 sm:px-[18px] sm:py-3.5 max-md:gap-1.5 max-md:px-1.5 max-md:py-1.5">
            <div className="ov-spotlight flex min-w-0 flex-wrap items-end gap-2 rounded-2xl border border-[#3FB185]/40 bg-[#07140f] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.35)] max-md:gap-1 max-md:rounded-lg max-md:px-1.5 max-md:py-1.5">
              <p className="m-0 w-full text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#3FB185]/80 max-md:hidden">Spotlight two firms</p>
              <FirmSpot
                label="Firm 1"
                value={spotA}
                other={spotB}
                firms={firmList}
                onPick={setSpotA}
                onClear={() => setSpotA(null)}
              />
              <FirmSpot
                label="Firm 2"
                value={spotB}
                other={spotA}
                firms={firmList}
                onPick={setSpotB}
                onClear={() => setSpotB(null)}
              />
              {h2hHref ? (
                <a
                  href={h2hHref}
                  className="mb-0.5 inline-flex h-10 shrink-0 items-center rounded-xl bg-[#3FB185] px-3 text-[0.75rem] font-bold text-[#0a0f0d] no-underline max-md:h-8 max-md:rounded-lg max-md:px-2.5 max-md:text-[0.68rem]"
                >
                  Head to head
                </a>
              ) : (
                <button
                  type="button"
                  className="btn-bare mb-0.5 h-10 shrink-0 rounded-xl border border-white/10 px-3 text-[0.75rem] font-semibold text-white/50 max-md:h-8 max-md:rounded-lg max-md:px-2.5 max-md:text-[0.68rem]"
                  onClick={() => {
                    setSpotA(null);
                    setSpotB(null);
                  }}
                  disabled={!spotA && !spotB ? true : undefined}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="ov-toolbar ov-no-print flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 xl:flex-nowrap">
              <div className="ov-toolbar-row">
              <button
                type="button"
                className={`btn-bare relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[0.78rem] font-semibold max-md:h-8 max-md:gap-1 max-md:rounded-lg max-md:px-2 max-md:text-[0.68rem] ${
                  sidebarOpen ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]' : 'border-white/10 bg-white/5 text-white/80'
                }`}
                onClick={() => setSidebarOpen(v => !v)}
                aria-pressed={sidebarOpen}
                aria-expanded={sidebarOpen}
                aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
              >
                <ToolbarIcon name="filter" />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="grid min-w-4 place-items-center rounded-full bg-[#3FB185] px-1.5 text-[9px] font-bold text-[#0a0f0d]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <label className="inline-flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={`ov-discount-switch btn-bare relative h-6 w-11 rounded-full border max-md:h-5 max-md:w-8 ${
                    applyDiscount ? 'border-[#3FB185]/60 bg-[#3FB185]' : 'border-white/15 bg-white/10'
                  }`}
                  role="switch"
                  aria-checked={applyDiscount}
                  aria-label="Apply discounts"
                  onClick={() => setApplyDiscount(v => !v)}
                >
                  <span
                    className={`absolute top-[3px] size-[18px] rounded-full bg-white transition-[left] max-md:top-[2px] max-md:size-3.5 ${
                      applyDiscount ? 'left-[22px] max-md:left-[16px]' : 'left-[3px]'
                    }`}
                  />
                </button>
                <span className="text-[0.78rem] font-semibold text-white/75 max-md:hidden">Apply discounts</span>
              </label>
              <button
                type="button"
                className={`btn-bare inline-flex h-10 items-center rounded-full px-5 text-[0.82rem] font-bold max-md:h-8 max-md:px-2.5 max-md:text-[0.68rem] ${
                  topMode === 'all' ? 'bg-[#3FB185] text-[#0a0f0d]' : 'border border-white/10 bg-white/5 text-white/80'
                }`}
                onClick={() => setTopMode('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn-bare inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[0.78rem] font-semibold max-md:h-8 max-md:gap-1 max-md:rounded-lg max-md:px-2 max-md:text-[0.68rem] ${
                  topMode === 'favorites'
                    ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]'
                    : 'border-white/10 bg-white/5 text-white/80'
                }`}
                onClick={() => setTopMode(m => (m === 'favorites' ? 'all' : 'favorites'))}
              >
                <Bookmark size={14} />
                {favorites.size}/{MAX_FAVORITES}
              </button>
              <p className="m-0 shrink-0 text-[0.92rem] font-semibold text-[#3FB185] max-md:text-[0.68rem]">
                {sorted.length.toLocaleString('en-US')} firms
              </p>
              </div>
              <div className="ov-toolbar-row ov-toolbar-row--tools">
              {searchOpen ? (
                <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 focus-within:border-[#3FB185]/45 md:hidden">
                  <Search size={13} className="shrink-0 text-white/40" />
                  <input
                    type="text"
                    className="min-w-0 flex-1 border-0 bg-transparent text-[0.72rem] text-white outline-none placeholder:text-white/35"
                    placeholder="Search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search firms"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-bare text-white/40"
                    onClick={() => {
                      setSearch('');
                      setSearchOpen(false);
                    }}
                    aria-label="Close search"
                  >
                    ×
                  </button>
                </label>
              ) : (
                <button
                  type="button"
                  className="btn-bare grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 md:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search firms"
                >
                  <Search size={14} />
                </button>
              )}
              <label className="ml-auto hidden h-10 w-[min(100%,220px)] min-w-[160px] items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[#3FB185]/45 md:flex">
                <input
                  type="text"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[0.82rem] text-white outline-none placeholder:text-white/35"
                  placeholder="Search firms..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search firms"
                />
              </label>
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="btn-bare inline-flex h-10 max-w-[7.25rem] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] font-semibold text-white/70 max-md:h-8 max-md:max-w-[6.5rem] sm:max-w-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-[0.78rem]"
                  onClick={() => {
                    setOpenDropdown(openDropdown === 'sort' ? null : 'sort');
                    setCustomizeOpen(false);
                  }}
                  aria-label={`Sorted by ${sortLabel(sort)}`}
                >
                  <span className="min-w-0 truncate">
                    <span className="max-sm:hidden">Sorted by: </span>
                    <span className="text-white">{sortLabel(sort)}</span>
                  </span>
                  <ToolbarIcon name="chevron" />
                </button>
                {openDropdown === 'sort' ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[60] min-w-[180px] rounded-xl border border-white/10 bg-[#0c1612] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    {SORT_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`btn-bare flex w-full rounded-lg px-2.5 py-2 text-left text-[0.78rem] font-semibold ${
                          sort.key === key ? 'bg-[#3FB185]/15 text-[#3FB185]' : 'text-white/75'
                        }`}
                        onClick={() => {
                          setSort({ key, dir: defaultSortDir(key) });
                          setOpenDropdown(null);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  className={`btn-bare grid size-10 place-items-center rounded-xl border max-md:size-8 max-md:rounded-lg ${
                    customizeOpen ? 'border-[#3FB185]/60 bg-[#3FB185]/15 text-[#3FB185]' : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                  onClick={() => {
                    setCustomizeOpen(v => !v);
                    setOpenDropdown(null);
                  }}
                  aria-label="Customize columns"
                >
                  <ToolbarIcon name="grid" />
                </button>
                {customizeOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-56 rounded-xl border border-white/10 bg-[#0c1612] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    {MID_COLS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 py-0.5 text-[0.75rem] text-white/80">
                        <input
                          type="checkbox"
                          className="accent-[#3FB185]"
                          checked={visibleCols.has(col.key)}
                          onChange={() =>
                            setVisibleCols(prev => {
                              const next = new Set(prev);
                              if (next.has(col.key)) next.delete(col.key);
                              else next.add(col.key);
                              return next;
                            })
                          }
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          </div>
          <div className="ov-head-rail scrollbar-none" ref={headRailRef}>
            <div className={`${ROW} ov-row--head`} role="row">
              <div className={`${PIN_FIRM} ${PIN_HEAD} bg-[#060c0a]`} role="columnheader">
                <button
                  type="button"
                  className="btn-bare inline-flex items-center gap-0.5 pl-2 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-slate-400/90 sm:pl-4"
                  onClick={() => cycleSort('firm')}
                >
                  Firm
                  <SortArrows active={sort.key === 'firm'} direction={sort.dir} />
                </button>
              </div>
              <div className={`${MID} ${PIN_HEAD} bg-[#060c0a]`} role="presentation">
                <div className="flex h-full w-max items-stretch">
                  {visibleMidCols.map(col => (
                    <div
                      key={col.key}
                      className={`${MID_CELL} ${TH} whitespace-nowrap`}
                      style={{ flex: `0 0 ${colMin(col)}px`, minWidth: colMin(col) }}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          className="btn-bare inline-flex items-center gap-0.5 uppercase"
                          onClick={() => cycleSort(col.key)}
                        >
                          <HeadLabel label={col.label} label2={col.label2} />
                          <SortArrows active={sort.key === col.key} direction={sort.dir} />
                        </button>
                        <InfoTip text={INFO[col.key]} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className={`${PIN_ACTION} ${PIN_HEAD} justify-center bg-[#060c0a] text-center text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-slate-400/90`}
                role="columnheader"
              >
                View Firm
              </div>
            </div>
          </div>
          </div>

          <div className="ov-board-clip">
          <div
            ref={boardRef}
            className="ov-board scrollbar-none rounded-b-2xl border border-t-0 border-white/10 bg-[#060c0a]"
          >
            {sorted.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-white/45">No firms match these filters.</p>
            ) : (
              sorted.map((row, i) => {
                const f = row.firm;
                const even = i % 2 === 1;
                const logoSrc = firmLogo(f.name, f.logo);
                return (
                  <div key={f.name} className={`${ROW} group ${even ? 'ov-row--even' : ''}`} role="row">
                    <div className={`${PIN_FIRM}`} role="cell">
                      <div className="flex w-full min-w-0 items-center gap-3.5">
                        <div className="ov-firm-logo relative shrink-0" style={{ width: 44, height: 44 }}>
                          <div
                            className="overflow-hidden bg-black"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              border: '2px solid rgba(63,177,133,0.45)',
                              padding: 2,
                            }}
                          >
                            {logoSrc ? (
                              <img src={logoSrc} alt="" className="size-full object-cover" />
                            ) : (
                              <span className="grid size-full place-items-center text-[0.58rem] font-bold text-white/50">
                                {f.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          {f.reviews >= 10 && f.rating >= 4 ? (
                            <span className="ov-rated-badge absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-amber-500 text-white">
                              <Star size={9} fill="#fff" />
                            </span>
                          ) : null}
                        </div>
                        <div className="ov-firm-meta flex min-w-0 flex-1 flex-col items-start justify-center gap-1">
                          <span className="block w-full truncate text-[0.95rem] font-bold leading-tight text-slate-50">
                            {f.name}
                          </span>
                          <span className="ov-plans block text-xs font-semibold leading-snug text-[#3FB185]/85">
                            {row.comingSoon ? 'Coming soon' : `${row.planCount} plans`}
                          </span>
                          <div className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {f.reviews < 10 ? (
                              <span className="text-[0.7rem] font-semibold text-[#3FB185]">Less than 10 reviews</span>
                            ) : (
                              <>
                                <span className="shrink-0 text-xs font-bold tabular-nums text-white">
                                  {Number(f.rating).toFixed(1)}
                                </span>
                                <span className="ov-stars">
                                  <RatingStars rating={f.rating} idPrefix={`ov-${slugify(f.name)}`} />
                                </span>
                                <span className="shrink-0 text-[0.72rem] font-bold tabular-nums text-[#3FB185]">
                                  [{Number(f.reviews).toLocaleString('en-US')}]
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ov-fav btn-bare grid size-7 shrink-0 place-items-center rounded-lg ${
                            favorites.has(f.name) ? 'text-[#3FB185]' : 'text-slate-300 hover:text-white'
                          }`}
                          onClick={() => toggleFavorite(f.name)}
                          aria-label={`Bookmark ${f.name}`}
                        >
                          <Bookmark size={16} fill={favorites.has(f.name) ? 'currentColor' : 'transparent'} />
                        </button>
                      </div>
                    </div>
                    <div className={`${MID}`}>
                      <div className="flex h-full min-h-[88px] w-max items-stretch">
                        {visibleMidCols.map(col => renderMid(col, row))}
                      </div>
                    </div>
                    <div className={`${PIN_ACTION}`} role="cell">
                      {row.genieUrl ? (
                        <PfgPrimary
                          href={row.genieUrl}
                          compact
                          className="ov-view-btn h-8 rounded-full! px-3.5"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Firm
                        </PfgPrimary>
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-full bg-white/5 px-3 text-[0.75rem] font-bold text-slate-500">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
