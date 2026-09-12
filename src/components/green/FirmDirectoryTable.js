'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Filter, Flame, Heart, Sparkles } from 'lucide-react';
import { firms as staticFirms } from '@/data/firms';
import { COUNTRY_LABELS } from '@/components/CompareFilterSidebar';
import { discountBadge } from '@/lib/compareHighlights';
import { firmLogo, RANK_TROPHIES } from '@/lib/firmLogos';
import { firmRankMap } from '@/lib/firmRank';
import { PLATFORM_MARK, platformLogo } from '@/lib/platformLogos';
import { PfgGhost } from '@/components/green/PfgControls';

const BTN =
  'btn-bare appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FB185]/70';
const STAR =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27 6.2 20.37l1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';
const MAX_FAVORITES = 5;
const PAGE_SIZE = 10;
const FAV_KEY = 'demo4-favs';
const COLS =
  'grid min-w-[1180px] grid-cols-[28px_minmax(200px,1.15fr)_minmax(128px,0.85fr)_minmax(110px,0.75fr)_72px_minmax(132px,0.9fr)_minmax(118px,0.8fr)_minmax(96px,0.7fr)_118px_92px] items-center gap-x-3';

const FLAGS = { US: '🇺🇸', AE: '🇦🇪', CY: '🇨🇾', CZ: '🇨🇿', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', LC: '🇱🇨' };
const NUMERIC_SORT = new Set(['rank', 'reviews', 'years', 'alloc']);

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

const RANK_FRAME = {
  1: '#E8C547',
  2: '#C5CDD6',
  3: '#D07A3A',
};

const RANK_BOX = {
  width: 22,
  height: 22,
  minWidth: 22,
  minHeight: 22,
  maxWidth: 22,
  maxHeight: 22,
  aspectRatio: '1 / 1',
  justifySelf: 'center',
  boxSizing: 'border-box',
};

function RankMark({ rank }) {
  const trophy = RANK_TROPHIES[rank];
  if (trophy) {
    return (
      <span className="grid shrink-0 place-items-center" title={`Rank ${rank}`} style={RANK_BOX}>
        <img
          src={trophy}
          alt=""
          width={22}
          height={22}
          decoding="async"
          draggable={false}
          className="object-contain object-center"
          style={{ width: 22, height: 22, maxWidth: 22, maxHeight: 22 }}
        />
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border-2 border-white/18 text-[0.6rem] font-bold text-white/70"
      style={RANK_BOX}
    >
      {rank}
    </span>
  );
}

function FirmMark({ rank, src, name, eager }) {
  const metal = RANK_FRAME[rank];
  const top = Boolean(metal);
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(src) && !broken;
  return (
    <div
      className="relative shrink-0 bg-black"
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
        border: top ? `3px solid ${metal}` : '2px solid rgba(63,177,133,0.45)',
        padding: top ? 3 : 2,
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
    <span className="relative grid size-12 place-items-center">
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

function SortHead({ label, col, sort, dir, onSort }) {
  const on = sort === col;
  return (
    <button
      type="button"
      className={`${BTN} inline-flex items-center gap-1 text-left text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${
        on ? 'text-white/80!' : 'text-white/35! hover:text-white/65!'
      }`}
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
      className={`${BTN} inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold ${
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

function rowTone(rank) {
  if (rank === 1) return 'border-[#E8C547]/45 bg-[linear-gradient(90deg,rgba(232,197,71,0.16),#0c1612_46%)]';
  if (rank === 2) return 'border-[#C5CDD6]/40 bg-[linear-gradient(90deg,rgba(197,205,214,0.14),#0c1612_46%)]';
  if (rank === 3) return 'border-[#D07A3A]/40 bg-[linear-gradient(90deg,rgba(208,122,58,0.16),#0c1612_46%)]';
  return 'border-white/10 bg-[#0c1612]';
}

export default function FirmDirectoryTable({ firms = staticFirms }) {
  const [mode, setMode] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedFirm, setCopiedFirm] = useState(null);
  const [showAll, setShowAll] = useState(true);
  const [sort, setSort] = useState('rank');
  const [dir, setDir] = useState('asc');
  const [favorites, setFavorites] = useState(() => new Set());
  const [selCountries, setSelCountries] = useState([]);
  const [selPlatforms, setSelPlatforms] = useState([]);
  const [selAssets, setSelAssets] = useState([]);
  const [ready, setReady] = useState(false);

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

  const rankByName = useMemo(() => firmRankMap(firms), [firms]);

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
      let cmp = 0;
      if (sort === 'name') cmp = a.name.localeCompare(b.name);
      else if (sort === 'country') {
        const ca = COUNTRY_LABELS[a.countryCode] || a.countryCode || '';
        const cb = COUNTRY_LABELS[b.countryCode] || b.countryCode || '';
        cmp = ca.localeCompare(cb);
      } else if (sort === 'years') cmp = (Number(a.years) || 0) - (Number(b.years) || 0);
      else if (sort === 'alloc') cmp = allocValue(a.maxAlloc) - allocValue(b.maxAlloc);
      else if (sort === 'reviews') {
        cmp = (Number(a.reviews) || 0) - (Number(b.reviews) || 0);
        if (!cmp) cmp = (Number(a.rating) || 0) - (Number(b.rating) || 0);
      } else {
        cmp = (rankByName.get(a.name) || 99) - (rankByName.get(b.name) || 99);
      }
      return cmp * mul;
    });
    return list;
  }, [mode, search, favorites, sort, dir, selCountries, selPlatforms, selAssets, rankByName, firms]);

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
      setDir(col === 'rank' ? 'asc' : NUMERIC_SORT.has(col) ? 'desc' : 'asc');
    }
  };

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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${BTN} inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold ${
            filterOpen || facetCount
              ? 'border-[#3FB185]/70 bg-[#3FB185]/15 text-white'
              : 'border-white/12 bg-white/4 text-white/80'
          }`}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen(v => !v)}
        >
          <Filter size={14} />
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
          <Flame size={14} className={mode === 'popular' ? 'text-[#3FB185]' : 'text-white/50'} />
          Popular
        </Chip>
        <Chip active={mode === 'favorites'} onClick={() => setModeChip('favorites')}>
          <Heart size={14} className={mode === 'favorites' ? 'fill-[#3FB185] text-[#3FB185]' : 'text-white/50'} />
          Favorite {ready ? favorites.size : 0}/{MAX_FAVORITES}
        </Chip>
        <Chip active={mode === 'new'} onClick={() => setModeChip('new')}>
          <Sparkles size={14} className={mode === 'new' ? 'text-[#3FB185]' : 'text-white/50'} />
          New
        </Chip>
      </div>

      {filterOpen ? (
        <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-[#0c1612] px-4 py-4">
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

      <div className="overflow-x-auto pb-2">
        <div className={`${COLS} border-b border-white/8 px-3 pb-2`}>
          <span />
          <SortHead label="Firm" col="name" sort={sort} dir={dir} onSort={onSort} />
          <div className="flex items-center gap-1">
            <SortHead label="Rank" col="rank" sort={sort} dir={dir} onSort={onSort} />
            <span className="text-[0.62rem] font-semibold text-white/25">/</span>
            <SortHead label="Reviews" col="reviews" sort={sort} dir={dir} onSort={onSort} />
          </div>
          <SortHead label="Country" col="country" sort={sort} dir={dir} onSort={onSort} />
          <SortHead label="Years in operation" col="years" sort={sort} dir={dir} onSort={onSort} />
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">Assets</span>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">Platforms</span>
          <SortHead label="Max allocations" col="alloc" sort={sort} dir={dir} onSort={onSort} />
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">Promo</span>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">Visit</span>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[#0c1612] px-5 py-10 text-center text-sm text-white/45">
            {mode === 'favorites' ? 'No favorites yet. Heart a firm to pin it here (max 5).' : 'No firms match this filter.'}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {visible.map((f, i) => {
              const rank = rankByName.get(f.name) || i + 1;
              const href = f.affiliateLink || (f.website ? `https://${f.website}` : '#');
              const off = promoLabel(f);
              const liked = ready && favorites.has(f.name);
              const country = COUNTRY_LABELS[f.countryCode] || f.countryCode || '—';
              const allocPct = Math.max(0.12, Math.min(1, Number(f.allocPct) || 0.5));
              const copied = copiedFirm === f.name;
              const logoSrc = firmLogo(f.name, f.logo);
              const coming = isComingSoon(f);
              return (
                <li key={f.name} className={`rounded-xl border px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3 ${rowTone(rank)}`}>
                  <div className={COLS}>
                    <RankMark rank={rank} />

                    <div className="flex min-w-0 items-center gap-2.5">
                      <FirmMark rank={rank} src={logoSrc} name={f.name} eager={i < 4} />
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

                    <div className="flex flex-col gap-0.5">
                      {Number(f.rating) > 0 ? (
                        <>
                          <span className="inline-flex w-fit items-center rounded-full bg-[#3FB185]/15 px-2 py-0.5 text-[0.78rem] font-bold tabular-nums text-[#3FB185]">
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

                    <div className="flex items-center gap-1.5 text-[0.78rem] text-white/80">
                      <span className="text-base leading-none" aria-hidden>
                        {FLAGS[f.countryCode] || '🏳️'}
                      </span>
                      <span className="leading-snug">{country}</span>
                    </div>

                    <YearsRing years={f.yearsLabel || f.years} maxYears={maxYears} />

                    <div className="flex flex-wrap gap-1">
                      {(f.assets || []).map(a => (
                        <span
                          key={a}
                          className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[0.65rem] font-semibold text-white/80"
                        >
                          {a}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(f.platforms || []).slice(0, 4).map(name => {
                        const src = platformLogo(name);
                        const mark = PLATFORM_MARK[name] || { abbr: name.slice(0, 2).toUpperCase(), tone: 'bg-[#1a2e24]' };
                        return src ? (
                          <img
                            key={name}
                            src={src}
                            alt={name}
                            title={name}
                            width={26}
                            height={26}
                            className="size-[26px] rounded-full border border-white/15 bg-white object-contain p-px"
                          />
                        ) : (
                          <span
                            key={name}
                            title={name}
                            className={`grid size-[26px] place-items-center rounded-full border border-white/15 text-[0.5rem] font-black text-white ${mark.tone}`}
                          >
                            {mark.abbr}
                          </span>
                        );
                      })}
                      {(f.platforms || []).length > 4 ? (
                        <span className="grid size-[26px] place-items-center rounded-full border border-white/15 text-[0.52rem] font-bold text-white/60">
                          +{(f.platforms || []).length - 4}
                        </span>
                      ) : null}
                    </div>

                    <div>
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

                    {coming ? (
                      <PfgGhost disabled className="min-h-9 cursor-default px-3 py-1.5 text-[0.75rem] opacity-60">
                        Coming soon
                      </PfgGhost>
                    ) : (
                      <PfgGhost
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="min-h-9 px-3 py-1.5 text-[0.75rem]"
                      >
                        Visit
                      </PfgGhost>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {ranked.length > PAGE_SIZE && !showAll ? (
        <div className="mt-5 flex justify-center">
          <PfgGhost onClick={() => setShowAll(true)}>View all {ranked.length} firms</PfgGhost>
        </div>
      ) : null}
    </div>
  );
}
