'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GENIE_LOGO } from '@/lib/firmLogos';

const LINKS = [
  { href: '/challenges', label: 'Challenges' },
  { href: '/firms', label: 'Firms' },
  { href: '/overview', label: 'Overview' },
  { href: '/compare', label: 'Head to head' },
];

export default function SiteNav() {
  const pathname = usePathname() || '';
  return (
    <nav
      className="relative z-[2] border-b border-white/10 bg-[#0a0f0d]/70 backdrop-blur-md"
      aria-label="Site"
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/challenges" className="mr-3 flex h-8 shrink-0 items-center no-underline" aria-label="Prop Firm Genie home">
          <img
            src={GENIE_LOGO}
            alt=""
            width={222}
            height={37}
            className="h-7 w-auto max-w-[200px] object-contain object-left"
          />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
      </div>
    </nav>
  );
}
