const BTN =
  'btn-bare appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FB185]/70';

export function ArrowCircle({ className = '' }) {
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#1B4B38] ${className}`.trim()}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 17L17 7M17 7H9M17 7v8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** PFG headline target frame — green box with corner ticks around a word. */
export function FocusWord({ children }) {
  return (
    <span className="relative mx-1 inline-block px-2.5 py-0.5 align-baseline">
      <span className="pointer-events-none absolute inset-0 border border-[#3FB185]/85" aria-hidden />
      <span className="pointer-events-none absolute -left-0.75 -top-0.75 size-1.75 border-l-2 border-t-2 border-[#3FB185]" aria-hidden />
      <span className="pointer-events-none absolute -right-0.75 -top-0.75 size-1.75 border-r-2 border-t-2 border-[#3FB185]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-0.75 -left-0.75 size-1.75 border-b-2 border-l-2 border-[#3FB185]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-0.75 -right-0.75 size-1.75 border-b-2 border-r-2 border-[#3FB185]" aria-hidden />
      {children}
    </span>
  );
}

export function PfgPrimary({ href, children, className = '', compact = false, ...props }) {
  const cls = compact
    ? `${BTN} inline-flex h-8 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg px-2.5 text-[0.75rem] font-semibold text-white! no-underline shadow-none! [background:linear-gradient(90deg,#3FB185,#1B4B38)] hover:brightness-110 ${className}`
    : `${BTN} inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-[1rem] font-semibold text-white! no-underline [background:linear-gradient(90deg,#3FB185,#1B4B38)] hover:brightness-110 ${className}`;
  const arrow = compact ? <ArrowCircle className="size-5! -mr-0.5" /> : <ArrowCircle className="-mr-2" />;
  if (href) {
    return (
      <a className={cls} href={href} {...props}>
        <span>{children}</span>
        {arrow}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      <span>{children}</span>
      {arrow}
    </button>
  );
}

export function PfgGhost({ children, className = '', href, ...props }) {
  const cls = `${BTN} inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#3FB185]/70 bg-transparent! px-4 py-2 text-[0.82rem] font-semibold text-white! no-underline hover:bg-[#3FB185]/10! disabled:cursor-not-allowed disabled:opacity-40 ${className}`;
  if (href) {
    return (
      <a className={cls} href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
