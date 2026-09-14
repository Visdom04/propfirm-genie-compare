'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  categoryBucket,
  discountBadge,
  findPlan,
  formatDailyLoss,
  formatMinDays,
  formatUsd,
  newsLabel,
  onlyAccountSize,
  onlyPlanType,
  parseMoney,
  pickDefaultPlanType,
  pickDefaultSize,
  pickWinner,
} from '@/lib/compareHighlights';
import { firmLogo } from '@/lib/firmLogos';
import PlatformLogo from '@/components/green/PlatformLogo';
import { listPriceOf, salePriceOf } from '@/lib/planPrice';
import GreenPageShell from '@/components/green/GreenPageShell';
import { FocusWord, PfgGhost, PfgPrimary } from '@/components/green/PfgControls';

const STEPS = ['Firms', 'Account type', 'Size'];
const BTN =
  'btn-bare appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FB185]/70';
const STAR =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27 6.2 20.37l1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';

function emptySide() {
  return { slug: null, planType: null, accountSize: null };
}

function firmBySlug(firms, slug) {
  return firms.find(f => f.slug === slug) || null;
}

function planTypesFor(firm) {
  const seen = new Set();
  const out = [];
  for (const p of firm?.plans || []) {
    if (!seen.has(p.planType)) {
      seen.add(p.planType);
      out.push(p.planType);
    }
  }
  return out;
}

function sizesFor(firm, planType) {
  return (firm?.plans || []).filter(p => p.planType === planType).map(p => p.accountSize);
}

function typeBucket(firm, planType) {
  const plan = (firm?.plans || []).find(p => p.planType === planType);
  return plan ? categoryBucket(plan) : null;
}

function hydrateSide(firms, raw) {
  if (!raw?.slug) return emptySide();
  const firm = firmBySlug(firms, raw.slug);
  if (!firm) return emptySide();
  const types = planTypesFor(firm);
  const planType = types.includes(raw.planType) ? raw.planType : null;
  const sizes = sizesFor(firm, planType);
  const accountSize = sizes.includes(raw.accountSize) ? raw.accountSize : null;
  return { slug: firm.slug, planType, accountSize };
}

function sideFromFirm(firm, slug) {
  const planType = onlyPlanType(firm);
  const accountSize = planType ? onlyAccountSize(firm, planType) : null;
  return { slug, planType, accountSize };
}

function missingOn(side, label) {
  if (!side.slug) return label;
  if (!side.planType) return `${label} account type`;
  if (!side.accountSize) return `${label} size`;
  return null;
}

function Chevron() {
  return (
    <svg className="ml-auto shrink-0 text-emerald-200/40" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="ml-auto shrink-0 text-[#3FB185]" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 18a5 5 0 01.5-9.95A6 6 0 0118.2 10 4 4 0 0119 18H7.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 15.5V9m0 0L9.6 11.4M12 9l2.4 2.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function RatingPill({ rating, reviews }) {
  const n = Number(rating) || 0;
  const count = Number(reviews) || 0;
  if (n > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#3FB185]/15 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums leading-none text-[#3FB185]">
        {n.toFixed(1)}
        <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden>
          <path d={STAR} className="fill-[#3FB185]" />
        </svg>
        {count > 0 ? <span className="font-semibold text-[#3FB185]/55">({count.toLocaleString('en-US')})</span> : null}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-white/6 px-2 py-0.5 text-[0.66rem] font-semibold leading-none text-emerald-200/40">
      No reviews
    </span>
  );
}

function PickerMenu({ items, onPick, onClose, searchable = false, selectedKey }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (searchable) inputRef.current?.focus();
  }, [searchable]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item =>
      [item.label, item.sub, item.tag].filter(Boolean).join(' ').toLowerCase().includes(needle)
    );
  }, [items, q]);

  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto scrollbar-pfg rounded-2xl border border-white/10 bg-[#0c1612] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
      ref={ref}
      role="listbox"
    >
      {searchable ? (
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search firms"
          className="mb-2 w-full rounded-lg border border-white/10 bg-[#08120e] px-3 py-2 text-[0.8rem] text-emerald-50 outline-none placeholder:text-emerald-200/30 focus:border-[#3FB185]/40"
        />
      ) : null}
      {filtered.length === 0 ? (
        <p className="px-2 py-3 text-[0.8rem] text-emerald-200/50">No matches.</p>
      ) : (
        filtered.map(item => {
          const on = item.key === selectedKey;
          return (
            <button
              key={item.key}
              type="button"
              className={`${BTN} flex w-full items-center gap-2.5 rounded-xl px-2.5! py-2.5! text-left text-emerald-50! ${
                on ? 'bg-[#3FB185]/12!' : 'bg-transparent! hover:bg-[#3FB185]/10!'
              }`}
              role="option"
              aria-selected={on}
              onClick={() => onPick(item.key)}
            >
              {item.logo ? (
                <img src={item.logo} alt="" width={28} height={28} className="size-7 rounded-md border border-[#3FB185]/40 bg-black object-cover" />
              ) : null}
              <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">{item.label}</span>
              {item.tag ? (
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-emerald-200/70">
                  {item.tag}
                </span>
              ) : null}
              {item.sub ? <span className="shrink-0 text-[0.68rem] text-[#3FB185]">{item.sub}</span> : null}
            </button>
          );
        })
      )}
    </div>
  );
}

function FieldButton({ filled, disabled, children, onClick, expanded, compact }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-expanded={expanded}
      onClick={onClick}
      className={`${BTN} flex w-full items-center gap-3 text-left text-white! transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? 'min-h-12 rounded-full px-4! py-2.5' : 'min-h-16 gap-3.5 rounded-2xl px-3.5! py-3'
      } ${
        filled
          ? 'border border-solid border-[#3FB185]/45 bg-[#08120e]!'
          : 'border border-white/12 bg-[#08120e]! hover:border-[#3FB185]/40'
      }`}
    >
      {children}
    </button>
  );
}

function VisitCta({ firm, plan }) {
  if (!firm || !plan) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/12 text-[0.82rem] font-semibold text-white/30">
        Visit
      </span>
    );
  }
  return (
    <PfgPrimary
      className="min-h-11 w-full px-4! py-2.5 text-[0.9rem]"
      href={firm.affiliateLink || '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      Visit {firm.name}
    </PfgPrimary>
  );
}

function SideCard({
  label,
  firm,
  side,
  firms,
  otherSlug,
  otherType,
  otherSize,
  otherBucket,
  openPicker,
  setOpenPicker,
  onSelectFirm,
  onSelectType,
  onSelectSize,
  sideKey,
}) {
  const typeOpen = openPicker === `${sideKey}-type`;
  const sizeOpen = openPicker === `${sideKey}-size`;
  const firmOpen = openPicker === `${sideKey}-firm`;
  const badge =
    firm && side.planType && side.accountSize
      ? discountBadge(firm, findPlan(firm, side.planType, side.accountSize))
      : discountBadge(firm, null);

  const types = planTypesFor(firm);
  const sizes = sizesFor(firm, side.planType);
  const matchSize = Boolean(otherSize && sizes.includes(otherSize));
  const matchType = Boolean(otherType && types.includes(otherType));

  return (
    <div className="relative min-w-0 flex-1 rounded-3xl border border-white/10 bg-[#0c1612] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
        {firm?.isPopular ? (
          <span className="rounded-full bg-[#3FB185] px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[#0a0f0d]">
            Popular
          </span>
        ) : null}
      </div>

      <div className="relative mb-4">
        {firm ? (
          <button
            type="button"
            aria-expanded={firmOpen}
            onClick={() => setOpenPicker(firmOpen ? null : `${sideKey}-firm`)}
            className={`${BTN} flex w-full items-center gap-3 rounded-xl px-0.5! py-0.5! text-left text-emerald-50!`}
          >
            <img
              src={firmLogo(firm.name, firm.logo)}
              alt=""
              className="size-11 rounded-[10px] border-2 border-[#3FB185]/45 bg-black object-cover object-center"
              width={44}
              height={44}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-[1.02rem] font-bold leading-tight">{firm.name}</span>
                <RatingPill rating={firm.rating} reviews={firm.reviews} />
              </span>
              {badge || firm.discount ? (
                <span className="truncate text-[0.72rem] font-medium text-emerald-200/45">{badge || firm.discount}</span>
              ) : null}
            </span>
            <Chevron />
          </button>
        ) : (
          <FieldButton filled={false} expanded={firmOpen} onClick={() => setOpenPicker(firmOpen ? null : `${sideKey}-firm`)}>
            <span className="grid size-12 place-items-center rounded-full bg-[#3FB185]/12 text-[#3FB185] ring-1 ring-[#3FB185]/45">
              <PlusMark />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[0.98rem] font-bold">Choose firm</span>
              <span className="text-[0.72rem] text-emerald-200/40">Search {firms.length} firms</span>
            </span>
            <Chevron />
          </FieldButton>
        )}
        {firmOpen ? (
          <PickerMenu
            searchable={firms.length > 8}
            selectedKey={side.slug}
            onClose={() => setOpenPicker(null)}
            items={firms
              .filter(f => f.slug !== otherSlug)
              .map(f => ({
                key: f.slug,
                label: f.name,
                logo: firmLogo(f.name, f.logo),
                sub: f.discount || null,
              }))}
            onPick={slug => {
              onSelectFirm(slug);
              setOpenPicker(null);
            }}
          />
        ) : null}
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-emerald-200/35">Account type</p>
          {matchType && side.planType !== otherType ? (
            <button type="button" className={`${BTN} text-[0.68rem] font-semibold text-[#3FB185]! hover:underline`} onClick={() => onSelectType(otherType)}>
              Match
            </button>
          ) : null}
        </div>
        {otherBucket && firm && !side.planType ? (
          <p className="mb-1.5 text-[0.7rem] text-emerald-200/40">Other side is {otherBucket}</p>
        ) : null}
        <div className="relative">
          <FieldButton
            compact
            filled={Boolean(side.planType)}
            disabled={!firm}
            expanded={typeOpen}
            onClick={() => firm && setOpenPicker(typeOpen ? null : `${sideKey}-type`)}
          >
            <span className="flex-1 text-[0.86rem]">{side.planType || (firm ? 'Select account type' : 'Waiting on firm')}</span>
            {side.planType ? <CheckIcon /> : <Chevron />}
          </FieldButton>
          {typeOpen ? (
            <PickerMenu
              selectedKey={side.planType}
              onClose={() => setOpenPicker(null)}
              items={types.map(t => ({
                key: t,
                label: t,
                tag: typeBucket(firm, t),
                sub: t === otherType ? 'Match' : null,
              }))}
              onPick={t => {
                onSelectType(t);
                setOpenPicker(null);
              }}
            />
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-emerald-200/35">Account size</p>
          {matchSize && side.accountSize !== otherSize ? (
            <button type="button" className={`${BTN} text-[0.68rem] font-semibold text-[#3FB185]! hover:underline`} onClick={() => onSelectSize(otherSize)}>
              Match {otherSize}
            </button>
          ) : null}
        </div>
        <div className="relative">
          <FieldButton
            compact
            filled={Boolean(side.accountSize)}
            disabled={!side.planType}
            expanded={sizeOpen}
            onClick={() => side.planType && setOpenPicker(sizeOpen ? null : `${sideKey}-size`)}
          >
            <span className="flex-1 text-[0.86rem]">
              {side.accountSize || (side.planType ? 'Select account size' : 'Waiting on type')}
            </span>
            {side.accountSize ? <CheckIcon /> : <Chevron />}
          </FieldButton>
          {sizeOpen ? (
            <PickerMenu
              selectedKey={side.accountSize}
              onClose={() => setOpenPicker(null)}
              items={sizes.map(s => ({
                key: s,
                label: s,
                sub: s === otherSize ? 'Match' : null,
              }))}
              onPick={s => {
                onSelectSize(s);
                setOpenPicker(null);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ValueCell({ value, note, best, badge, sub, large }) {
  return (
    <div className={`flex min-h-[72px] flex-col justify-center gap-1 px-5 py-5 ${best ? '' : ''}`}>
      {sub ? <span className="text-[0.7rem] text-emerald-200/30 line-through">{sub}</span> : null}
      <span
        className={`flex items-center gap-2 font-bold tabular-nums ${
          large ? 'text-[1.7rem] leading-none' : 'text-[1.05rem]'
        } ${best ? 'text-[#3FB185]' : 'text-white'}`}
      >
        {value}
        {best ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[#3FB185]">
            <path d="M5 12.5l5 5 9-10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {note ? <span className="text-[0.72rem] font-medium text-emerald-200/40">{note}</span> : null}
      {badge ? <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#3FB185]">{badge}</span> : null}
    </div>
  );
}

function PlatformCell({ platforms }) {
  const list = platforms || [];
  if (!list.length) {
    return <div className="flex min-h-18 items-center px-5 py-5 text-emerald-50">—</div>;
  }
  return (
    <div className="flex min-h-18 items-center px-5 py-5">
      <ul className="m-0 flex flex-wrap gap-1.5 p-0">
        {list.map(name => (
            <li
              key={name}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-[#08120e] py-1 pr-2 pl-1"
            >
              <PlatformLogo name={name} size={28} rounded="md" className="border-0" />
              <span className="text-[0.7rem] font-semibold text-emerald-100">{name}</span>
            </li>
        ))}
      </ul>
    </div>
  );
}

function BoardRow({ label, a, b, zebra }) {
  return (
    <div className={`grid grid-cols-1 border-t border-white/6 md:grid-cols-[minmax(160px,0.72fr)_1fr_1fr] ${zebra ? 'bg-white/[0.02]' : ''}`}>
      <div className="flex items-center px-5 py-3 text-[0.78rem] font-semibold text-emerald-200/45 md:py-0">{label}</div>
      <div className="border-white/6 md:border-l">{a}</div>
      <div className="border-white/6 md:border-l">{b}</div>
    </div>
  );
}

function SectionBar({ children }) {
  return (
    <div className="border-t border-white/8 bg-[#07110d] px-5 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#3FB185]">
      {children}
    </div>
  );
}

function FirmHead({ firm, side, emptyLabel }) {
  if (!firm) {
    return (
      <div className="flex min-h-[88px] items-center gap-3 px-5 py-5">
        <span className="grid size-12 place-items-center rounded-2xl border border-dashed border-white/15 text-emerald-200/25">
          <PlusMark />
        </span>
        <span>
          <span className="block text-[0.95rem] font-bold text-emerald-200/35">{emptyLabel}</span>
          <span className="text-[0.72rem] text-emerald-200/25">Not selected</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-h-[88px] items-center gap-3 px-5 py-5">
      <img
        src={firmLogo(firm.name, firm.logo)}
        alt=""
        width={48}
        height={48}
        className="size-12 rounded-[10px] border-2 border-[#3FB185]/45 bg-black object-cover object-center"
      />
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[1.02rem] font-bold text-emerald-50">{firm.name}</span>
          <RatingPill rating={firm.rating} reviews={firm.reviews} />
        </span>
        <span className="mt-1 block text-[0.75rem] font-medium text-emerald-200/55">
          {side.planType && side.accountSize ? `${side.planType} · ${side.accountSize}` : 'Plan incomplete'}
        </span>
      </span>
    </div>
  );
}

export default function CompareFirmsH2H({ firms = [], popularPairs = [] }) {
  const [a, setA] = useState(emptySide);
  const [b, setB] = useState(emptySide);
  const [openPicker, setOpenPicker] = useState(null);
  const [copied, setCopied] = useState(false);

  const firmA = firmBySlug(firms, a.slug);
  const firmB = firmBySlug(firms, b.slug);
  const planA = findPlan(firmA, a.planType, a.accountSize);
  const planB = findPlan(firmB, b.planType, b.accountSize);
  const ready = Boolean(planA && planB);

  const stepIndex = useMemo(() => {
    if (!a.slug || !b.slug) return 0;
    if (!a.planType || !b.planType) return 1;
    if (!a.accountSize || !b.accountSize) return 2;
    return 3;
  }, [a, b]);

  const nextNeed = missingOn(a, 'Firm 1') || missingOn(b, 'Firm 2');
  const categoryWarn = ready && categoryBucket(planA) !== categoryBucket(planB);
  const sizeWarn = ready && a.accountSize !== b.accountSize;

  const applyFirm = useCallback(
    (setter, slug) => {
      const firm = firmBySlug(firms, slug);
      setter(sideFromFirm(firm, slug));
    },
    [firms]
  );

  const applyPopular = useCallback(
    (slugA, slugB) => {
      const fa = firmBySlug(firms, slugA);
      const fb = firmBySlug(firms, slugB);
      const typeA = pickDefaultPlanType(fa);
      const typeB = pickDefaultPlanType(fb);
      setA({ slug: slugA, planType: typeA, accountSize: pickDefaultSize(fa, typeA) });
      setB({ slug: slugB, planType: typeB, accountSize: pickDefaultSize(fb, typeB) });
      setOpenPicker(null);
      requestAnimationFrame(() => {
        document.getElementById('h2h-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [firms]
  );

  const selectType = (setter, firm) => planType => {
    setter(prev => {
      const sizes = sizesFor(firm, planType);
      const keep = sizes.includes(prev.accountSize) ? prev.accountSize : onlyAccountSize(firm, planType);
      return { ...prev, planType, accountSize: keep };
    });
  };

  const clearAll = () => {
    setA(emptySide());
    setB(emptySide());
    setOpenPicker(null);
  };

  const swap = () => {
    setA(b);
    setB(a);
  };

  const share = async () => {
    const url = new URL(window.location.href);
    if (a.slug) url.searchParams.set('a', [a.slug, a.planType, a.accountSize].filter(Boolean).join('|'));
    else url.searchParams.delete('a');
    if (b.slug) url.searchParams.set('b', [b.slug, b.planType, b.accountSize].filter(Boolean).join('|'));
    else url.searchParams.delete('b');
    window.history.replaceState(null, '', url.toString());
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const parse = key => {
      const raw = params.get(key);
      if (!raw) return null;
      const [slug, planType, accountSize] = raw.split('|');
      return hydrateSide(firms, { slug, planType, accountSize });
    };
    const nextA = parse('a');
    const nextB = parse('b');
    if (nextA?.slug) setA(nextA);
    if (nextB?.slug) setB(nextB);
  }, [firms]);

  const costWinner = ready ? pickWinner(salePriceOf(planA), salePriceOf(planB), 'lower') : null;
  const splitWinner = ready ? pickWinner(planA.profitSplit, planB.profitSplit, 'higher') : null;
  const targetWinner = ready
    ? pickWinner(parseMoney(planA.profitTarget), parseMoney(planB.profitTarget), 'lower')
    : null;
  const ddWinner = ready ? pickWinner(parseMoney(planA.maxLoss), parseMoney(planB.maxLoss), 'higher') : null;
  const dailyWinner =
    ready && 'dailyDrawdown' in planA && 'dailyDrawdown' in planB
      ? pickWinner(planA.dailyDrawdown, planB.dailyDrawdown, 'none-or-lower')
      : null;
  const daysWinner =
    ready && 'minTradingDays' in planA && 'minTradingDays' in planB
      ? pickWinner(planA.minTradingDays, planB.minTradingDays, 'none-or-lower')
      : null;
  const newsReady = ready && 'newsTrading' in planA && 'newsTrading' in planB;
  const consWinner = ready
    ? pickWinner(planA.consistencyFunded, planB.consistencyFunded, 'none-or-higher')
    : null;
  const newsWinner = newsReady ? pickWinner(planA.newsTrading, planB.newsTrading, 'news') : null;

  return (
    <GreenPageShell className="pb-24">
      <div className="relative z-1 mx-auto w-[min(1140px,calc(100%-32px))] px-0 pb-8 pt-12">
        <header className="mb-10 text-center">
          <h1 className="mb-4 text-[clamp(1.85rem,4.4vw,3rem)] font-bold leading-[1.12] tracking-tight text-white">
            Compare
            <FocusWord>Head to Head</FocusWord>
          </h1>
          <p className="mx-auto m-0 max-w-xl text-[15px] leading-relaxed text-white/70">
            Choose two firms, then a plan and size. Compare costs, drawdowns, splits, and rules.
          </p>
        </header>

        <ol className="mb-7 flex list-none flex-wrap items-center justify-center gap-y-2 p-0" aria-label="Comparison steps">
          {STEPS.map((label, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i;
            return (
              <li key={label} className="flex items-center gap-2">
                {i > 0 ? <span className="mx-2 h-px w-8 bg-white/12 sm:w-10" aria-hidden /> : null}
                <span
                  className={`grid size-7 place-items-center rounded-full text-[0.72rem] font-bold ${
                    done || active ? 'bg-[#3FB185] text-[#0a0f0d]' : 'border border-white/15 text-white/40'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={`text-[0.78rem] font-semibold ${done || active ? 'text-emerald-50' : 'text-emerald-200/40'}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-emerald-200/55">
            {ready ? (
              <>
                Comparing <strong className="text-emerald-50">2</strong> complete plans
              </>
            ) : (
              <>
                Next: <strong className="text-emerald-50">{nextNeed}</strong>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <PfgGhost onClick={share} disabled={!a.slug && !b.slug}>
              <ShareIcon />
              {copied ? 'Copied' : 'Share'}
            </PfgGhost>
            <PfgGhost onClick={clearAll}>
              <ClearIcon />
              Clear
            </PfgGhost>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <SideCard
            label="Firm 1"
            sideKey="a"
            firm={firmA}
            side={a}
            firms={firms}
            otherSlug={b.slug}
            otherType={b.planType}
            otherSize={b.accountSize}
            otherBucket={planB ? categoryBucket(planB) : b.planType && firmB ? typeBucket(firmB, b.planType) : null}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            onSelectFirm={slug => applyFirm(setA, slug)}
            onSelectType={selectType(setA, firmA)}
            onSelectSize={accountSize => setA(prev => ({ ...prev, accountSize }))}
          />

          <button
            type="button"
            className={`${BTN} mx-auto self-center grid size-12 place-items-center rounded-full border border-[#3FB185]/45 bg-[#0c1612]! text-[#3FB185]! hover:bg-[#3FB185]/12! disabled:opacity-40`}
            onClick={swap}
            aria-label="Swap firms"
            disabled={!a.slug && !b.slug}
          >
            <SwapIcon />
          </button>

          <SideCard
            label="Firm 2"
            sideKey="b"
            firm={firmB}
            side={b}
            firms={firms}
            otherSlug={a.slug}
            otherType={a.planType}
            otherSize={a.accountSize}
            otherBucket={planA ? categoryBucket(planA) : a.planType && firmA ? typeBucket(firmA, a.planType) : null}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            onSelectFirm={slug => applyFirm(setB, slug)}
            onSelectType={selectType(setB, firmB)}
            onSelectSize={accountSize => setB(prev => ({ ...prev, accountSize }))}
          />
        </div>

        {(categoryWarn || sizeWarn) && (
          <div className="mb-4 space-y-2" role="status">
            {categoryWarn ? (
              <p className="rounded-2xl border border-amber-400/25 bg-amber-500/8 px-5 py-4 text-[0.86rem] leading-relaxed text-amber-100">
                Different paths: {categoryBucket(planA)} vs {categoryBucket(planB)}. Cost and rules are not apples-to-apples.
              </p>
            ) : null}
            {sizeWarn ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-5 py-4">
                <p className="m-0 text-[0.86rem] leading-relaxed text-emerald-100/80">
                  Sizes differ ({a.accountSize} vs {b.accountSize}). Drawdown and targets scale with size.
                </p>
                {firmB && sizesFor(firmB, b.planType).includes(a.accountSize) ? (
                  <button
                    type="button"
                    className={`${BTN} shrink-0 rounded-full border border-[#3FB185]/45 bg-[#3FB185]/10! px-3.5! py-1.5! text-[0.75rem] font-semibold text-[#3FB185]! hover:bg-[#3FB185]/16!`}
                    onClick={() => setB(prev => ({ ...prev, accountSize: a.accountSize }))}
                  >
                    Set Firm 2 to {a.accountSize}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <div id="h2h-board" className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1410]">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(160px,0.72fr)_1fr_1fr]">
            <div className="hidden items-end px-5 py-6 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-200/35 md:flex">
              Metric
            </div>
            <div className="border-white/6 md:border-l">
              <FirmHead firm={firmA} side={a} emptyLabel="Firm 1" />
            </div>
            <div className="border-white/6 md:border-l">
              <FirmHead firm={firmB} side={b} emptyLabel="Firm 2" />
            </div>
          </div>

          {!ready ? (
            <p className="border-t border-white/8 bg-[#07110d] px-5 py-3 text-[0.8rem] text-emerald-200/45">
              Values fill in when both sides have firm, type, and size.
            </p>
          ) : null}

          <SectionBar>Pricing</SectionBar>
          <BoardRow
            label="Total cost"
            zebra
            a={
              <ValueCell
                large
                value={planA ? formatUsd(salePriceOf(planA)) : '—'}
                sub={
                  planA && listPriceOf(planA) > salePriceOf(planA)
                    ? formatUsd(listPriceOf(planA))
                    : null
                }
                note={planA?.priceNote || null}
                badge={planA ? discountBadge(firmA, planA) : null}
                best={costWinner === 0}
              />
            }
            b={
              <ValueCell
                large
                value={planB ? formatUsd(salePriceOf(planB)) : '—'}
                sub={
                  planB && listPriceOf(planB) > salePriceOf(planB)
                    ? formatUsd(listPriceOf(planB))
                    : null
                }
                note={planB?.priceNote || null}
                badge={planB ? discountBadge(firmB, planB) : null}
                best={costWinner === 1}
              />
            }
          />
          <BoardRow
            label="Profit split"
            a={<ValueCell value={planA ? `${planA.profitSplit}%` : '—'} best={splitWinner === 0} />}
            b={<ValueCell value={planB ? `${planB.profitSplit}%` : '—'} best={splitWinner === 1} />}
          />

          <SectionBar>Evaluation rules</SectionBar>
          <BoardRow
            label="Profit target"
            zebra
            a={<ValueCell value={planA?.profitTarget || '—'} best={targetWinner === 0} />}
            b={<ValueCell value={planB?.profitTarget || '—'} best={targetWinner === 1} />}
          />
          <BoardRow
            label="Max drawdown"
            a={<ValueCell value={planA?.maxLoss || '—'} note={planA?.maxLossType || null} best={ddWinner === 0} />}
            b={<ValueCell value={planB?.maxLoss || '—'} note={planB?.maxLossType || null} best={ddWinner === 1} />}
          />
          <BoardRow
            label="Daily loss limit"
            zebra
            a={<ValueCell value={planA ? formatDailyLoss(planA) : '—'} best={dailyWinner === 0} />}
            b={<ValueCell value={planB ? formatDailyLoss(planB) : '—'} best={dailyWinner === 1} />}
          />
          <BoardRow
            label="Min trading days"
            a={<ValueCell value={planA ? formatMinDays(planA) : '—'} best={daysWinner === 0} />}
            b={<ValueCell value={planB ? formatMinDays(planB) : '—'} best={daysWinner === 1} />}
          />
          <BoardRow
            label="Activation fee"
            zebra
            a={<ValueCell value={planA?.activationFee || '—'} />}
            b={<ValueCell value={planB?.activationFee || '—'} />}
          />
          <BoardRow
            label="Consistency (eval)"
            a={<ValueCell value={planA?.consistencyEval || '—'} />}
            b={<ValueCell value={planB?.consistencyEval || '—'} />}
          />

          <SectionBar>Funded rules</SectionBar>
          <BoardRow
            label="Consistency"
            zebra
            a={<ValueCell value={planA?.consistencyFunded || (planA ? 'None' : '—')} best={consWinner === 0} />}
            b={<ValueCell value={planB?.consistencyFunded || (planB ? 'None' : '—')} best={consWinner === 1} />}
          />
          <BoardRow
            label="News trading"
            a={<ValueCell value={planA ? newsLabel(planA.newsTrading) : '—'} best={newsWinner === 0} />}
            b={<ValueCell value={planB ? newsLabel(planB.newsTrading) : '—'} best={newsWinner === 1} />}
          />
          <BoardRow
            label="Payout frequency"
            zebra
            a={<ValueCell value={planA?.payoutFreq || '—'} />}
            b={<ValueCell value={planB?.payoutFreq || '—'} />}
          />
          <BoardRow
            label="Max contracts"
            a={<ValueCell value={planA?.maxLots || '—'} />}
            b={<ValueCell value={planB?.maxLots || '—'} />}
          />

          <SectionBar>Platforms</SectionBar>
          <BoardRow
            label="Supported"
            zebra
            a={<PlatformCell platforms={firmA?.platforms} />}
            b={<PlatformCell platforms={firmB?.platforms} />}
          />

          <div className="grid grid-cols-1 border-t border-white/8 md:grid-cols-[minmax(160px,0.72fr)_1fr_1fr]">
            <div className="hidden md:block" />
            <div className="border-white/6 p-4 md:border-l">
              <VisitCta firm={firmA} plan={planA} />
            </div>
            <div className="border-white/6 p-4 md:border-l">
              <VisitCta firm={firmB} plan={planB} />
            </div>
          </div>
        </div>

        {popularPairs.length > 0 ? (
          <section className="mt-16" aria-labelledby="h2h-popular-title">
            <h2 id="h2h-popular-title" className="mb-2 text-xl font-bold text-emerald-50">
              Popular comparisons
            </h2>
            <p className="mb-5 max-w-xl text-sm leading-relaxed text-emerald-200/50">
              Skip the steps — loads each firm’s most popular plan. Change type or size after if you need a different match.
            </p>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {popularPairs.map(pair => {
                const fa = firmBySlug(firms, pair.a);
                const fb = firmBySlug(firms, pair.b);
                return (
                  <li key={`${pair.a}-${pair.b}`}>
                    <button
                      type="button"
                      className={`${BTN} flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-[#0c1612]! px-3.5! py-3! text-left text-white! hover:border-[#3FB185]/40 hover:bg-[#3FB185]/8!`}
                      onClick={() => applyPopular(pair.a, pair.b)}
                    >
                      {fa?.logo ? (
                        <img
                          src={firmLogo(fa.name, fa.logo)}
                          alt=""
                          className="size-8 rounded-lg border border-[#3FB185]/40 bg-black object-cover"
                        />
                      ) : null}
                      <span className="font-(family-name:--font-instrument) text-lg italic text-emerald-200/40">vs</span>
                      {fb?.logo ? (
                        <img
                          src={firmLogo(fb.name, fb.logo)}
                          alt=""
                          className="size-8 rounded-lg border border-[#3FB185]/40 bg-black object-cover"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-[0.82rem] font-semibold">{pair.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </GreenPageShell>
  );
}
