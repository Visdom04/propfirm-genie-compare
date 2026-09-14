import SiteNav from '@/components/green/SiteNav';

export default function GreenPageShell({ children, className = '' }) {
  return (
    <div
      className={`relative min-h-screen overflow-x-clip bg-[#0a0f0d] font-[family-name:var(--font-dm)] text-white scheme-dark ${className}`.trim()}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_62%_at_42%_38%,rgba(6,95,70,0.48)_0%,rgba(5,150,105,0.28)_28%,rgba(4,120,87,0.16)_52%,transparent_72%),radial-gradient(ellipse_55%_42%_at_62%_44%,rgba(16,185,129,0.28)_0%,rgba(5,150,105,0.1)_45%,transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_115%_95%_at_50%_48%,transparent_48%,rgba(5,6,15,0.28)_82%,rgba(5,6,15,0.55)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-45 [background-image:radial-gradient(1px_1px_at_12%_18%,rgba(255,255,255,0.55),transparent),radial-gradient(1px_1px_at_28%_62%,rgba(255,255,255,0.35),transparent),radial-gradient(1.5px_1.5px_at_44%_24%,rgba(16,185,129,0.45),transparent),radial-gradient(1px_1px_at_58%_78%,rgba(255,255,255,0.3),transparent),radial-gradient(1px_1px_at_72%_34%,rgba(255,255,255,0.4),transparent),radial-gradient(1.5px_1.5px_at_84%_58%,rgba(16,185,129,0.5),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(134,239,172,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.12)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -left-24 top-10 size-[420px] rounded-full bg-emerald-700/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-16 top-1/3 size-[360px] rounded-full bg-[#3FB185]/15 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/3 size-[480px] rounded-full bg-teal-800/20 blur-[140px]"
      />
      <div className="relative z-[1]">
        <SiteNav />
        {children}
      </div>
    </div>
  );
}
