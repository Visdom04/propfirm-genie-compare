'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PlatformLogo from '@/components/green/PlatformLogo';

const PREVIEW = 3;

export default function PlatformMarks({ names, size = 26, className = '' }) {
  const list = names || [];
  const extra = Math.max(0, list.length - PREVIEW);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, maxH: 352 });
  const btnRef = useRef(null);
  const menuId = useId();

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 260;
    const maxH = Math.min(window.innerHeight * 0.7, 352);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const below = r.bottom + 8;
    const top = below + maxH > window.innerHeight - 8
      ? Math.max(8, r.top - maxH - 8)
      : below;
    setPos({ top, left, maxH });
  };

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = e => {
      if (btnRef.current?.contains(e.target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, menuId]);

  if (!list.length) return <span className="text-slate-500">—</span>;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1 ${className}`.trim()}>
      {list.slice(0, PREVIEW).map(name => (
        <PlatformLogo key={name} name={name} size={size} />
      ))}
      {extra > 0 ? (
        <button
          ref={btnRef}
          type="button"
          className="platform-more btn-bare grid size-[26px] place-items-center rounded-full border border-white/15 bg-white/6 text-[0.52rem] font-bold text-white/80 hover:border-[#3FB185]/50 hover:text-[#3FB185]"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={open ? 'Hide extra platforms' : `Show ${extra} more platforms`}
          onClick={e => {
            e.stopPropagation();
            setOpen(v => !v);
          }}
        >
          +{extra}
        </button>
      ) : null}
      {open && extra > 0 && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={menuId}
              role="dialog"
              aria-label="All trading platforms"
              className="fixed z-[80] w-[260px] overflow-y-auto rounded-xl border border-white/12 bg-[#0c1612] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
              style={{ top: pos.top, left: pos.left, maxHeight: pos.maxH }}
            >
              <ul className="m-0 grid grid-cols-1 gap-1 p-0">
                {list.map(name => (
                  <li key={name} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                    <PlatformLogo name={name} size={22} />
                    <span className="min-w-0 truncate text-[0.72rem] font-semibold text-white/85">{name}</span>
                  </li>
                ))}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
