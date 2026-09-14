import GreenPageShell from '@/components/green/GreenPageShell';
import FirmDirectoryTable from '@/components/green/FirmDirectoryTable';
import { FocusWord } from '@/components/green/PfgControls';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Browse Prop Firms',
  description: 'Ratings, platforms, max allocation, and promo codes, listed A to Z.',
};

export default async function FirmsPage() {
  const { firms } = await getRuntimeFirms();
  return (
    <GreenPageShell>
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 max-md:px-2 max-md:pb-12 max-md:pt-6" id="table-scroll-target">
        <header className="mb-8 text-center max-md:mb-4">
          <h1 className="mb-4 text-[clamp(1.85rem,4.4vw,3rem)] font-bold leading-[1.12] tracking-tight text-white max-md:mb-2">
            Browse Prop
            <FocusWord>Firms</FocusWord>
          </h1>
          <p className="mx-auto m-0 max-w-xl text-[15px] leading-relaxed text-white/70 max-md:text-[13px]">
            Ratings, platforms, max allocation, and promo codes, listed A to Z.
          </p>
        </header>
        <FirmDirectoryTable firms={firms} />
      </section>
    </GreenPageShell>
  );
}
