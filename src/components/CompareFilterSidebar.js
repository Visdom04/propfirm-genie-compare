'use client';

import { useId, useState } from 'react';
import { firmLogo } from '@/lib/firmLogos';

export const COUNTRY_LABELS = {
  US: 'United States',
  AE: 'United Arab Emirates',
  CY: 'Cyprus',
  CZ: 'Czechia',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  LC: 'Saint Lucia',
};

/** Collapse noisy drawdown strings into filterable buckets */
export function normalizeDrawdown(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Other';
  if (s.includes('static')) return 'Static';
  if (s.includes('intraday')) return 'Intraday';
  if (s.includes('eod')) return 'EOD';
  if (s.includes('trail')) return 'Trailing';
  return String(raw);
}

export function createEmptyFacet(bounds) {
  return {
    assets: [],
    sizes: [],
    steps: [],
    prices: [],
    firms: [],
    drawdownTypes: [],
    platforms: [],
    countries: [],
    priceRange: bounds ? { min: bounds.price.min, max: bounds.price.max } : null,
    splitRange: bounds ? { min: bounds.split.min, max: bounds.split.max } : null,
    ratingRange: bounds ? { min: bounds.rating.min, max: bounds.rating.max } : null,
    yearsRange: bounds ? { min: bounds.years.min, max: bounds.years.max } : null,
  };
}

export function cloneFacet(f) {
  return {
    ...f,
    assets: [...f.assets],
    sizes: [...f.sizes],
    steps: [...f.steps],
    prices: [...f.prices],
    firms: [...f.firms],
    drawdownTypes: [...f.drawdownTypes],
    platforms: [...f.platforms],
    countries: [...f.countries],
    priceRange: f.priceRange ? { ...f.priceRange } : null,
    splitRange: f.splitRange ? { ...f.splitRange } : null,
    ratingRange: f.ratingRange ? { ...f.ratingRange } : null,
    yearsRange: f.yearsRange ? { ...f.yearsRange } : null,
  };
}

export function isRangeActive(range, bound) {
  if (!range || !bound) return false;
  return range.min > bound.min || range.max < bound.max;
}

export function countActiveFilters(facet, bounds) {
  if (!facet) return 0;
  let n =
    facet.sizes.length +
    facet.steps.length +
    facet.prices.length +
    facet.firms.length +
    facet.drawdownTypes.length +
    facet.platforms.length +
    facet.countries.length;
  if (isRangeActive(facet.priceRange, bounds?.price)) n += 1;
  if (isRangeActive(facet.splitRange, bounds?.split)) n += 1;
  if (isRangeActive(facet.ratingRange, bounds?.rating)) n += 1;
  if (isRangeActive(facet.yearsRange, bounds?.years)) n += 1;
  return n;
}

const chipClass = on =>
  `min-h-8 rounded-full border px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors ${
    on
      ? 'border-[#3FB185]/50 bg-[#3FB185]/15 text-[#3FB185]'
      : 'border-white/10 bg-black/20 text-slate-200 hover:border-[#3FB185]/35'
  }`;

function DualRange({ label, min, max, step = 1, value, onChange, format = v => v }) {
  const id = useId();
  const lo = Math.min(value.min, value.max);
  const hi = Math.max(value.min, value.max);
  const span = Math.max(max - min, 1);
  const leftPct = ((lo - min) / span) * 100;
  const rightPct = ((hi - min) / span) * 100;

  return (
    <div className="mb-3 w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[0.72rem] font-semibold text-green-200/80" htmlFor={`${id}-min`}>
          {label}
        </label>
        <span className="text-[0.7rem] tabular-nums text-slate-400">
          {format(lo)} – {format(hi)}
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" aria-hidden />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1B4B38] to-[#3FB185]"
          style={{ left: `${leftPct}%`, width: `${Math.max(0, rightPct - leftPct)}%` }}
          aria-hidden
        />
        <input
          id={`${id}-min`}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 z-[2] h-6 w-full appearance-none bg-transparent"
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label} minimum`}
          onChange={e => {
            const next = Number(e.target.value);
            onChange({ min: Math.min(next, hi), max: hi });
          }}
        />
        <input
          id={`${id}-max`}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 z-[3] h-6 w-full appearance-none bg-transparent"
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label} maximum`}
          onChange={e => {
            const next = Number(e.target.value);
            onChange({ min: lo, max: Math.max(next, lo) });
          }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[0.65rem] text-slate-500" aria-hidden>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function Accordion({ title, defaultOpen = false, children, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="border-b border-white/5 py-1"
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary
        className={`flex min-h-10 cursor-pointer list-none items-center justify-between py-2 text-[0.78rem] font-semibold [&::-webkit-details-marker]:hidden ${
          accent || open ? 'text-green-200' : 'text-green-100/90'
        }`}
      >
        {title}
        <span
          className={`ml-2 size-1.5 border-r-2 border-b-2 border-green-200/50 ${
            open ? 'mt-0.5 rotate-[225deg]' : '-mt-1 rotate-45'
          }`}
          aria-hidden
        />
      </summary>
      <div className="flex flex-wrap gap-2 pb-2.5 pt-1">{children}</div>
    </details>
  );
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

export default function CompareFilterSidebar({
  open,
  draft,
  bounds,
  options,
  firmList,
  onChange,
  onApply,
  onReset,
  onClose,
  activeCount,
}) {
  if (!draft || !bounds) return null;

  const set = patch => onChange({ ...draft, ...patch });
  const toggle = (key, value) => set({ [key]: toggleIn(draft[key], value) });

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[45] hidden cursor-pointer border-0 bg-[#020812]/70 backdrop-blur-md max-[900px]:block"
          aria-label="Close filters"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`z-[2] flex flex-col self-start overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-b from-[#0c1c14]/98 to-[#080e0a]/99 max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:top-auto max-[900px]:z-50 max-[900px]:max-h-[min(92vh,860px)] max-[900px]:rounded-t-[22px] max-[900px]:rounded-b-none max-[900px]:opacity-100 ${
          open
            ? 'pointer-events-auto mr-4 w-[min(300px,32vw)] opacity-100 shadow-[0_18px_48px_rgba(0,0,0,0.35)] max-[900px]:mr-0 max-[900px]:w-full max-[900px]:translate-y-0'
            : 'pointer-events-none mr-0 w-0 border-0 opacity-0 max-[900px]:w-full max-[900px]:translate-y-[110%]'
        } sticky top-3 max-h-[calc(100vh-24px)] transition-[width,margin,opacity,transform] duration-300`}
        id="cmp-filters"
        aria-hidden={!open}
        inert={!open ? true : undefined}
        aria-label="Filters"
      >
        <div className="flex items-center justify-between px-4 pb-2.5 pt-4">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-50">
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-[#3FB185] px-1.5 py-0.5 text-[0.65rem] font-bold text-[#0a0f0d]">
                {activeCount}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            className="btn-bare grid size-8 place-items-center rounded-lg text-lg text-slate-400 hover:bg-white/5 hover:text-white"
            onClick={onClose}
            aria-label="Close filter panel"
          >
            ×
          </button>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4">
          <Accordion title={`Firms · ${firmList.length}`} defaultOpen>
            <div className="flex max-h-56 w-full flex-col gap-1 overflow-y-auto pr-1" role="group" aria-label="Filter by firm">
              {firmList.map(f => {
                const on = draft.firms.includes(f.name);
                return (
                  <label
                    key={f.name}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 ${
                      on ? 'bg-[#3FB185]/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#3FB185]"
                      checked={on}
                      onChange={() => toggle('firms', f.name)}
                    />
                    <span className="relative grid size-[30px] shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firmLogo(f.name, f.logo)} alt="" width={30} height={30} loading="lazy" decoding="async" />
                      {f.isNew ? (
                        <span className="absolute -right-0.5 -top-0.5 rounded bg-[#3FB185] px-0.5 text-[8px] font-bold text-[#0a0f0d]">
                          NEW
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-[0.75rem] font-semibold text-slate-100" title={f.name}>
                      {f.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </Accordion>

          <Accordion title="Account size" defaultOpen>
            {options.sizes.map(s => (
              <button
                key={s}
                type="button"
                className={chipClass(draft.sizes.includes(s))}
                onClick={() => toggle('sizes', s)}
              >
                {s}
              </button>
            ))}
          </Accordion>

          <Accordion title="Steps">
            {options.steps.map(s => (
              <button
                key={s}
                type="button"
                className={chipClass(draft.steps.includes(s))}
                onClick={() => toggle('steps', s)}
              >
                {s}
              </button>
            ))}
          </Accordion>

          <Accordion title="Drawdown type" defaultOpen>
            {options.drawdownTypes.map(t => (
              <button
                key={t}
                type="button"
                className={chipClass(draft.drawdownTypes.includes(t))}
                onClick={() => toggle('drawdownTypes', t)}
              >
                {t}
              </button>
            ))}
          </Accordion>

          <Accordion title="Price type">
            {options.priceTypes.map(p => (
              <button
                key={p}
                type="button"
                className={chipClass(draft.prices.includes(p))}
                onClick={() => toggle('prices', p)}
              >
                {p}
              </button>
            ))}
          </Accordion>

          <Accordion title="Advanced filtering" defaultOpen>
            <div className="flex w-full flex-col">
              <DualRange
                label="Price"
                min={bounds.price.min}
                max={bounds.price.max}
                step={bounds.price.step}
                value={draft.priceRange || bounds.price}
                onChange={priceRange => set({ priceRange })}
                format={v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              />
              <DualRange
                label="Profit split"
                min={bounds.split.min}
                max={bounds.split.max}
                step={1}
                value={draft.splitRange || bounds.split}
                onChange={splitRange => set({ splitRange })}
                format={v => `${v}%`}
              />
              <DualRange
                label="Trustpilot / rating"
                min={bounds.rating.min}
                max={bounds.rating.max}
                step={0.1}
                value={draft.ratingRange || bounds.rating}
                onChange={ratingRange => set({ ratingRange })}
                format={v => Number(v).toFixed(1)}
              />
              <DualRange
                label="Years in business"
                min={bounds.years.min}
                max={bounds.years.max}
                step={1}
                value={draft.yearsRange || bounds.years}
                onChange={yearsRange => set({ yearsRange })}
                format={v => String(v)}
              />
            </div>
          </Accordion>

          <Accordion title="Platforms">
            {options.platforms.map(p => (
              <button
                key={p}
                type="button"
                className={chipClass(draft.platforms.includes(p))}
                onClick={() => toggle('platforms', p)}
              >
                {p}
              </button>
            ))}
          </Accordion>

          <Accordion title="Countries">
            <p className="mb-1 w-full text-[0.68rem] leading-snug text-green-200/55">
              Countries where firms are based
            </p>
            {options.countries.map(c => (
              <button
                key={c}
                type="button"
                className={chipClass(draft.countries.includes(c))}
                onClick={() => toggle('countries', c)}
              >
                {COUNTRY_LABELS[c] || c}
              </button>
            ))}
          </Accordion>
        </div>

        <div className="border-t border-white/10 px-4 py-3 max-[900px]:pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            className="hidden w-full rounded-lg border border-white/10 py-2 text-[0.75rem] font-semibold text-slate-300 hover:bg-white/5 min-[901px]:block"
            onClick={onReset}
          >
            Reset filter
          </button>
          <div className="hidden grid-cols-[1fr_1.15fr] gap-2.5 max-[900px]:grid">
            <button
              type="button"
              className="rounded-lg border border-white/10 py-2.5 text-[0.75rem] font-semibold text-slate-300"
              onClick={onReset}
            >
              Reset filter
            </button>
            <button
              type="button"
              className="rounded-lg bg-gradient-to-r from-[#1B4B38] to-[#3FB185] py-2.5 text-[0.75rem] font-bold text-white"
              onClick={onApply}
            >
              Apply
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
