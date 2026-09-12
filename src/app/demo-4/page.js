import GreenPageShell from '@/components/green/GreenPageShell';
import FirmDirectoryTable from '@/components/green/FirmDirectoryTable';
import { FocusWord } from '@/components/green/PfgControls';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';

export const metadata = {
  title: 'DEGENIE — Prop Firm Directory',
  description: 'Browse verified futures prop firms, ratings, platforms, allocation, and promo codes.',
};

export default async function Demo4Page() {
  const { firms } = await getRuntimeFirms();
  return (
    <GreenPageShell>
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-6 lg:px-8" id="table-scroll-target">
        <header className="mb-8 text-center">
          <h1 className="mb-4 text-[clamp(1.85rem,4.4vw,3rem)] font-bold leading-[1.12] tracking-tight text-white">
            Browse Prop
            <FocusWord>Firms</FocusWord>
          </h1>
          <p className="mx-auto m-0 max-w-xl text-[15px] leading-relaxed text-white/70">
            Ratings, platforms, allocation, and promo codes in one ranked directory.
          </p>
        </header>
        <FirmDirectoryTable firms={firms} />
      </section>
    </GreenPageShell>
  );
}
