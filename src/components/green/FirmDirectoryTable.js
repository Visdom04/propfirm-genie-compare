'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Filter, Flame, Heart, Sparkles } from 'lucide-react';
import { firms as staticFirms } from '@/data/firms';
import { COUNTRY_LABELS } from '@/components/CompareFilterSidebar';
import { discountBadge } from '@/lib/compareHighlights';
import { firmLogo } from '@/lib/firmLogos';
import { compareFirmNames } from '@/lib/firmSort';
import PlatformMarks from '@/components/green/PlatformMarks';
import { PfgGhost, PfgPrimary } from '@/components/green/PfgControls';
import './FirmDirectoryTable.css';

const BTN =
  'btn-bare appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FB185]/70';
const STAR =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27 6.2 20.37l1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';
const MAX_FAVORITES = 5;
const PAGE_SIZE = 10;
const FAV_KEY = 'demo4-favs';
const COLS =
  'dir-cols grid min-w-[1220px] grid-cols-[minmax(200px,1.15fr)_minmax(128px,0.85fr)_minmax(110px,0.75fr)_72px_minmax(132px,0.9fr)_minmax(118px,0.8fr)_minmax(96px,0.7fr)_118px_132px] items-center gap-x-3';

const FLAGS = { US: '🇺🇸', AE: '🇦🇪', CY: '🇨🇾', CZ: '🇨🇿', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', LC: '🇱🇨' };
const NUMERIC_SORT = new Set(['reviews', 'years', 'alloc', 'platforms', 'promo']);
const SORT_OPTIONS = [
  { key: 'name', label: 'A–Z' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'country', label: 'Country' },
  { key: 'years', label: 'Years' },
  { key: 'assets', label: 'Assets' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'alloc', label: 'Max allocation' },
  { key: 'promo', label: 'Promo' },
];

function compactNum(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${Math.round(v / 1000)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return v.toLocaleString('en-US');
}

function isComingSoon(firm) {
  return Boolean(firm.comingSoon) && !(firm.plans || []).length;
}

function promoLabel(firm) {
  if (isComingSoon(firm)) return 'Coming soon';
  const firmDisc = String(firm.discount || '');
  const range = firmDisc.match(/(\d+)\s*[–-]\s*(\d+)\s*%/);
  if (range) return `${range[1]}–${range[2]}% OFF`;
  const badge = discountBadge(firm, firm.plans?.[0] || null);
  if (badge) return `${badge.replace('-', '')} OFF`;
  const m = firmDisc.match(/(\d+)\s*%/);
  if (m) return `${m[1]}% OFF`;
  return null;
}

function promoSortValue(firm) {
  const label = promoLabel(firm) || '';
  const range = label.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return Number(range[2]) || Number(range[1]) || 0;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function allocValue(raw) {
  const t = String(raw || '')
    .toUpperCase()
    .replace(/[$,\s]/g, '');
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 0;
  if (t.includes('M')) return n * 1e6;
  if (t.includes('K')) return n * 1e3;
  return n;
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

function RatingStars({ rating, idPrefix }) {
  const n = Number(rating) || 0;
  const rounded = Math.round(Math.min(5, Math.max(0, n)) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-px" aria-hidden>
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} viewBox="0 0 24 24" width="12" height="12">
          <path d={STAR} className={rounded >= star ? 'fill-[#3FB185]' : 'fill-[#3FB185]/20'} />
          {rounded >= star - 0.5 && rounded < star ? (
            <>
              <defs>
                <clipPath id={`${idPrefix}-h-${star}`}>
                  <rect x="0" y="0" width="12" height="24" />
                </clipPath>
              </defs>
              <path d={STAR} className="fill-[#3FB185]" clipPath={`url(#${idPrefix}-h-${star})`} />
            </>
          ) : null}
        </svg>
      ))}
    </span>
  );
}

function CoverImg({ src, alt, size, className, eager, fetchPriority, zoom = 1, onError }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={fetchPriority}
      draggable={false}
      className={className}
      style={zoom !== 1 ? { transform: `scale(${zoom})` } : undefined}
      onError={onError}
    />
  );
}

function FirmMark({ src, name, eager }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(src) && !broken;
  return (
    <div
      className="dir-firm-mark relative shrink-0 bg-black"
      style={{
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        maxWidth: 44,
        maxHeight: 44,
        aspectRatio: '1 / 1',
        boxSizing: 'border-box',
        borderRadius: 10,
        border: '2px solid rgba(63,177,133,0.45)',
        padding: 2,
      }}
    >
      <div className="size-full overflow-hidden rounded-md">
        {showImg ? (
          <CoverImg
            src={src}
            alt=""
            size={80}
            eager={eager}
            zoom={1.04}
            className="size-full object-cover object-center"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="grid size-full place-items-center text-[0.58rem] font-bold text-white/50">
            {name.slice(0, 2)}
          </span>
        )}
      </div>
    </div>
  );
}

function YearsRing({ years, maxYears }) {
  const n = Number(years) || 0;
  const max = Math.max(maxYears, 1);
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, n / max);
  return (
    <span className="dir-years relative grid size-12 place-items-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.2" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#3FB185"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute text-[0.82rem] font-bold tabular-nums text-white">{n}</span>
    </span>
  );
}

function SortHead({ label, col, sort, dir, onSort, align = 'center' }) {
  const on = sort === col;
  return (
    <button
      type="button"
      className={`${BTN} inline-flex w-full items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${
        align === 'left' ? 'justify-start text-left' : 'justify-center text-center'
      } ${on ? 'text-white/80!' : 'text-white/35! hover:text-white/65!'}`}
      aria-pressed={on}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="inline-flex flex-col text-[7px] leading-[0.65]" aria-hidden>
        <span className={on && dir === 'asc' ? 'text-[#3FB185]' : 'opacity-30'}>▲</span>
        <span className={on && dir === 'desc' ? 'text-[#3FB185]' : 'opacity-30'}>▼</span>
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${BTN} inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold max-md:gap-0.5 max-md:px-2 max-md:py-1 max-md:text-[0.62rem] ${
        active
          ? 'border-[#3FB185]/70 bg-[#3FB185]/15 text-white'
          : 'border-white/12 bg-white/4 text-white/75 hover:border-white/20'
      }`}
    >
      {children}
    </button>
  );
}

function FacetChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${BTN} rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${
        active
          ? 'border-[#3FB185]/70 bg-[#3FB185]/15 text-white'
          : 'border-white/12 bg-white/4 text-white/70 hover:border-white/20'
      }`}
    >
      {children}
    </button>
  );
}

const ROW_TONE = 'border-white/10 bg-[#0c1612]';

export default function FirmDirectoryTable({ firms = staticFirms }) {
  const [mode, setMode] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedFirm, setCopiedFirm] = useState(null);
  const [showAll, setShowAll] = useState(true);
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('asc');
  const [sortOpen, setSortOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());
  const [selCountries, setSelCountries] = useState([]);
  const [selPlatforms, setSelPlatforms] = useState([]);
  const [selAssets, setSelAssets] = useState([]);
  const [ready, setReady] = useState(false);
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
      if (Array.isArray(raw)) setFavorites(new Set(raw.slice(0, MAX_FAVORITES)));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
  }, [favorites, ready]);

  const countryOpts = useMemo(
    () => [...new Set(firms.map(f => f.countryCode).filter(Boolean))].sort(),
    [firms]
  );
  const platformOpts = useMemo(
    () => [...new Set(firms.flatMap(f => f.platforms || []))].sort(),
    [firms]
  );
  const assetOpts = useMemo(
    () => [...new Set(firms.flatMap(f => f.assets || []))].sort(),
    [firms]
  );

  const maxYears = useMemo(
    () => Math.max(8, ...firms.map(f => Number(f.years) || 0)),
    [firms]
  );

  const facetCount = selCountries.length + selPlatforms.length + selAssets.length + (search.trim() ? 1 : 0);

  const ranked = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = firms.filter(f => {
      if (q) {
        const hay = [f.name, f.description, ...(f.platforms || []), ...(f.assets || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selCountries.length && !selCountries.includes(f.countryCode)) return false;
      if (selPlatforms.length && !selPlatforms.some(p => (f.platforms || []).includes(p))) return false;
      if (selAssets.length && !selAssets.some(a => (f.assets || []).includes(a))) return false;
      if (mode === 'popular') return f.isPopular;
      if (mode === 'new') return f.isNew;
      if (mode === 'favorites') return favorites.has(f.name);
      return true;
    });

    const mul = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sort === 'name') return compareFirmNames(a.name, b.name, dir);

      let cmp = 0;
      if (sort === 'country') {
        const ca = COUNTRY_LABELS[a.countryCode] || a.countryCode || '';
        const cb = COUNTRY_LABELS[b.countryCode] || b.countryCode || '';
        cmp = compareFirmNames(ca, cb, dir);
        if (!cmp) return compareFirmNames(a.name, b.name, dir);
        return cmp;
      }
      if (sort === 'years') cmp = (Number(a.years) || 0) - (Number(b.years) || 0);
      else if (sort === 'alloc') cmp = allocValue(a.maxAlloc) - allocValue(b.maxAlloc);
      else if (sort === 'platforms') cmp = (a.platforms || []).length - (b.platforms || []).length;
      else if (sort === 'promo') cmp = promoSortValue(a) - promoSortValue(b);
      else if (sort === 'assets') {
        cmp = compareFirmNames((a.assets || []).join(' '), (b.assets || []).join(' '), dir);
        if (!cmp) return compareFirmNames(a.name, b.name, dir);
        return cmp;
      } else if (sort === 'reviews') {
        cmp = (Number(a.reviews) || 0) - (Number(b.reviews) || 0);
        if (!cmp) cmp = (Number(a.rating) || 0) - (Number(b.rating) || 0);
      }
      if (!cmp) return compareFirmNames(a.name, b.name);
      return cmp * mul;
    });
    return list;
  }, [mode, search, favorites, sort, dir, selCountries, selPlatforms, selAssets, firms]);

  const visible = showAll ? ranked : ranked.slice(0, PAGE_SIZE);

  const setModeChip = next => {
    setMode(next);
    setShowAll(next === 'all');
    setSearch('');
  };

  const onSort = col => {
    if (sort === col) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(col);
      setDir(NUMERIC_SORT.has(col) ? 'desc' : 'asc');
    }
    setSortOpen(false);
  };

  const sortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label || 'A–Z';

  const clearFacets = () => {
    setSearch('');
    setSelCountries([]);
    setSelPlatforms([]);
    setSelAssets([]);
  };

  const toggleFavorite = name => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_FAVORITES) next.add(name);
      if (next.size === 0) queueMicrotask(() => setMode('all'));
      return next;
    });
  };

  const copyCode = async (firmName, code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard can be blocked in some browsers */
    }
    setCopiedFirm(firmName);
    window.setTimeout(() => {
      setCopiedFirm(current => (current === firmName ? null : current));
    }, 1600);
  };

  return (
    <div className="w-full">
      <div className="dir-workbench">
      <div className="dir-sticky-top">
      <div className="dir-chrome rounded-t-2xl border border-white/10 border-b-[#3FB185]/25 px-4 py-3 sm:px-[18px] sm:py-3.5 max-md:px-1.5 max-md:py-1.5">
      <div className="dir-chrome-bar flex flex-nowrap items-center gap-2 max-md:gap-1">
        <button
          type="button"
          className={`${BTN} inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold max-md:gap-1 max-md:px-2.5 max-md:py-1 max-md:text-[0.7rem] ${
            filterOpen || facetCount
              ? 'border-[#3FB185]/70 bg-[#3FB185]/15 text-white'
              : 'border-white/12 bg-white/4 text-white/80'
          }`}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen(v => !v)}
        >
          <Filter size={14} className="max-md:hidden" />
          Filter
          {facetCount ? (
            <span className="grid min-w-4 place-items-center rounded-full bg-[#3FB185] px-1.5 text-[0.62rem] font-bold text-[#0a0f0d]">
              {facetCount}
            </span>
          ) : null}
        </button>
        <Chip active={mode === 'all'} onClick={() => setModeChip('all')}>
          All
        </Chip>
        <Chip active={mode === 'popular'} onClick={() => setModeChip('popular')}>
          <Flame size={14} className={`max-md:hidden ${mode === 'popular' ? 'text-[#3FB185]' : 'text-white/50'}`} />
          Popular
        </Chip>
        <Chip active={mode === 'favorites'} onClick={() => setModeChip(mode === 'favorites' ? 'all' : 'favorites')}>
          <Heart size={14} className={`max-md:hidden ${mode === 'favorites' ? 'fill-[#3FB185] text-[#3FB185]' : 'text-white/50'}`} />
          <span className="max-md:hidden">Favorite</span>
          <span className="md:hidden">Fave</span> {ready ? favorites.size : 0}/{MAX_FAVORITES}
        </Chip>
        <Chip active={mode === 'new'} onClick={() => setModeChip('new')}>
          <Sparkles size={14} className={`max-md:hidden ${mode === 'new' ? 'text-[#3FB185]' : 'text-white/50'}`} />
          New
        </Chip>
        <div className="relative ml-auto shrink-0">
          <button
            type="button"
            className={`${BTN} inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/4 px-2.5 py-1 text-[0.68rem] font-semibold text-white/80 max-md:px-2 max-md:py-1 max-md:text-[0.62rem] sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-[0.78rem]`}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            onClick={() => setSortOpen(v => !v)}
          >
            <span className="min-w-0 truncate">
              <span className="max-sm:hidden">Sorted by: </span>
              <span className="text-white">{sort === 'name' && dir === 'desc' ? 'Z–A' : sortLabel}</span>
            </span>
            <ChevronDown size={14} className={sortOpen ? 'rotate-180 text-[#3FB185]' : 'text-white/45'} />
          </button>
          {sortOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] rounded-xl border border-white/10 bg-[#0c1612] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              role="listbox"
              aria-label="Sort firms"
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={sort === opt.key}
                  className={`${BTN} flex w-full rounded-lg px-2.5 py-2 text-left text-[0.78rem] font-semibold ${
                    sort === opt.key ? 'bg-[#3FB185]/15 text-[#3FB185]' : 'text-white/75 hover:bg-white/5'
                  }`}
                  onClick={() => {
                    setSort(opt.key);
                    setDir(NUMERIC_SORT.has(opt.key) ? 'desc' : 'asc');
                    setSortOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {filterOpen ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-[#0c1612] px-4 py-4">
          <label className="flex items-center gap-2 rounded-full border border-white/12 bg-[#08120e] px-4 py-2.5">
            <svg className="shrink-0 text-white/35" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.84rem] text-white outline-none placeholder:text-white/35"
              placeholder="Search firms, platforms, or assets"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search firms"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div>
            <div className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/40">Country</div>
            <div className="flex flex-wrap gap-1.5">
              {countryOpts.map(code => (
                <FacetChip
                  key={code}
                  active={selCountries.includes(code)}
                  onClick={() => setSelCountries(list => toggleIn(list, code))}
                >
                  {FLAGS[code] || ''} {COUNTRY_LABELS[code] || code}
                </FacetChip>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/40">Platforms</div>
            <div className="flex flex-wrap gap-1.5">
              {platformOpts.map(name => (
                <FacetChip
                  key={name}
                  active={selPlatforms.includes(name)}
                  onClick={() => setSelPlatforms(list => toggleIn(list, name))}
                >
                  {name}
                </FacetChip>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/40">Assets</div>
            <div className="flex flex-wrap gap-1.5">
              {assetOpts.map(name => (
                <FacetChip
                  key={name}
                  active={selAssets.includes(name)}
                  onClick={() => setSelAssets(list => toggleIn(list, name))}
                >
                  {name}
                </FacetChip>
              ))}
            </div>
          </div>

          {facetCount ? (
            <button type="button" className={`${BTN} text-[0.75rem] font-semibold text-[#3FB185]!`} onClick={clearFacets}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
      </div>
      <div className="dir-head-rail scrollbar-none" ref={headRailRef}>
        <div className="dir-head px-3 pb-2 pt-1">
          <div className={COLS}>
            <SortHead label="Firm" col="name" sort={sort} dir={dir} onSort={onSort} align="left" />
            <SortHead label="Reviews" col="reviews" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Country" col="country" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Years in operation" col="years" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Assets" col="assets" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Platforms" col="platforms" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Max allocations" col="alloc" sort={sort} dir={dir} onSort={onSort} />
            <SortHead label="Promo" col="promo" sort={sort} dir={dir} onSort={onSort} />
            <span className="w-full text-center text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">
              View Firm
            </span>
          </div>
        </div>
      </div>
      </div>

      <div
        className="dir-board scrollbar-none rounded-b-2xl border border-t-0 border-white/10"
        ref={boardRef}
      >
        <div className="px-3 pb-3 pt-2">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[#0c1612] px-5 py-10 text-center text-sm text-white/45">
            {mode === 'favorites' ? 'No favorites yet. Heart a firm to pin it here (max 5).' : 'No firms match this filter.'}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {visible.map((f, i) => {
              const href = f.affiliateLink || (f.website ? `https://${f.website}` : '#');
              const off = promoLabel(f);
              const liked = ready && favorites.has(f.name);
              const country = COUNTRY_LABELS[f.countryCode] || f.countryCode || '—';
              const allocPct = Math.max(0.12, Math.min(1, Number(f.allocPct) || 0.5));
              const copied = copiedFirm === f.name;
              const logoSrc = firmLogo(f.name, f.logo);
              const coming = isComingSoon(f);
              return (
                <li key={f.name} className={`dir-row rounded-xl border px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3 max-md:px-1.5 max-md:py-1.5 ${ROW_TONE}`}>
                  <div className={COLS}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FirmMark src={logoSrc} name={f.name} eager={i < 4} />
                      <div className="min-w-0">
                        <div className="truncate text-[0.92rem] font-bold text-white">{f.name}</div>
                        {coming ? (
                          <div className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#3FB185]/80">
                            Coming soon
                          </div>
                        ) : (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              className={`${BTN} text-[#3FB185]!`}
                              aria-pressed={liked}
                              aria-label={liked ? `Remove ${f.name} from favorites` : `Save ${f.name} to favorites`}
                              onClick={() => toggleFavorite(f.name)}
                            >
                              <Heart size={13} className={liked ? 'fill-[#3FB185]' : ''} />
                            </button>
                            <span className="text-[0.68rem] tabular-nums text-white/40">{compactNum(f.likes)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                      {Number(f.rating) > 0 ? (
                        <>
                          <span className="inline-flex items-center rounded-full bg-[#3FB185]/15 px-2 py-0.5 text-[0.78rem] font-bold tabular-nums text-[#3FB185]">
                            {Number(f.rating).toFixed(1)}
                          </span>
                          <RatingStars rating={f.rating} idPrefix={`dir-${f.name}`} />
                          <span className="text-[0.7rem] font-semibold text-[#3FB185]/80">
                            {Number(f.reviews).toLocaleString('en-US')} reviews
                          </span>
                        </>
                      ) : (
                        <span className="text-[0.75rem] text-white/35">No reviews</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-center text-[0.78rem] text-white/80">
                      <span className="text-base leading-none" aria-hidden>
                        {FLAGS[f.countryCode] || '🏳️'}
                      </span>
                      <span className="leading-snug">{country}</span>
                    </div>

                    <div className="flex justify-center">
                      <YearsRing years={f.yearsLabel || f.years} maxYears={maxYears} />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {(f.assets || []).map(a => (
                        <span
                          key={a}
                          className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[0.65rem] font-semibold text-white/80"
                        >
                          {a}
                        </span>
                      ))}
                    </div>

                    <PlatformMarks names={f.platforms} className="dir-platforms" />

                    <div className="w-full text-center">
                      <div className="text-[0.95rem] font-extrabold text-white">{f.maxAlloc}</div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#3FB185]" style={{ width: `${allocPct * 100}%` }} />
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-dashed border-[#3FB185]/35">
                      <div className="bg-[#3FB185] px-2 py-1 text-center text-[0.68rem] font-bold text-[#0a0f0d]">
                        {off || 'Deal'}
                      </div>
                      {coming ? (
                        <div className="bg-[#08120e] px-2 py-1.5 text-center text-[0.7rem] font-bold text-white/50">
                          Soon
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`${BTN} flex w-full items-center justify-center gap-1 bg-[#08120e]! px-2 py-1.5 text-[0.7rem] font-bold text-white! hover:bg-[#0e1c16]!`}
                          onClick={() => copyCode(f.name, f.promoCode)}
                        >
                          {copied ? <Check size={11} /> : <Copy size={11} />}
                          {copied ? 'Copied' : f.promoCode}
                        </button>
                      )}
                    </div>

                    <div className="flex justify-center">
                      {coming ? (
                        <PfgGhost disabled className="min-h-8 cursor-default px-3 py-1.5 text-[0.75rem] opacity-60">
                          Coming soon
                        </PfgGhost>
                      ) : (
                        <PfgPrimary
                          href={href}
                          compact
                          className="dir-view-btn h-8 rounded-full! px-3.5"
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                        >
                          View Firm
                        </PfgPrimary>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </div>
      </div>

      {ranked.length > PAGE_SIZE && !showAll ? (
        <div className="mt-5 flex justify-center">
          <PfgGhost onClick={() => setShowAll(true)}>View all {ranked.length} firms</PfgGhost>
        </div>
      ) : null}
    </div>
  );
}
