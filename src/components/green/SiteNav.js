'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GENIE_LOGO } from '@/lib/firmLogos';

const LINKS = [
  { href: '/challenges', label: 'Challenges' },
  { href: '/firms', label: 'Firms' },
  { href: '/overview', label: 'Overview' },
  { href: '/compare', label: 'Head to head' },
];

export default function SiteNav() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f0d]/92 backdrop-blur-md max-md:[--pfg-nav-h:2.75rem]"
      aria-label="Site"
      style={{ '--pfg-nav-h': '3.5rem' }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8 max-md:gap-2 max-md:px-3 max-md:py-2">
        <Link href="/challenges" className="flex h-8 shrink-0 items-center no-underline max-md:h-6" aria-label="Prop Firm Genie home">
          <img
            src={GENIE_LOGO}
            alt=""
            width={222}
            height={37}
            className="h-7 w-auto max-w-[200px] object-contain object-left max-md:h-[18px] max-md:max-w-[132px]"
          />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {LINKS.map(link => {
            const on = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold no-underline ${
                  on ? 'bg-[#3FB185]/18 text-[#3FB185]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={on ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="relative ml-auto md:hidden">
          <button
            type="button"
            className="btn-bare inline-flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white"
            aria-expanded={open}
            aria-controls="pfg-site-menu"
            aria-label={open ? 'Close pages menu' : 'Open pages menu'}
            onClick={() => setOpen(v => !v)}
          >
            {open ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="pfg-site-menu"
          className="border-t border-white/10 bg-[#0c1612] px-3 py-2 md:hidden"
          role="menu"
          aria-label="Pages"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-0.5">
            {LINKS.map(link => {
              const on = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className={`rounded-lg px-3 py-2.5 text-right text-[0.88rem] font-semibold no-underline ${
                    on ? 'bg-[#3FB185]/18 text-[#3FB185]' : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                  aria-current={on ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
