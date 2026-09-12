import GreenPageShell from '@/components/green/GreenPageShell';
import FirmOverviewTable from '@/components/FirmOverviewTable';
import { FocusWord } from '@/components/green/PfgControls';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';

export const metadata = {
  title: 'Prop Firm Overview',
  description: 'One row per firm — sizes, ratings, platforms, eval cost, and payout rules.',
};

export default async function OverviewPage() {
  const { firms } = await getRuntimeFirms();
  return (
    <GreenPageShell>
      <section className="mx-auto w-full max-w-[1600px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <h1 className="mb-4 text-[clamp(1.85rem,4.4vw,3rem)] font-bold leading-[1.12] tracking-tight text-white">
            Prop Firm
            <FocusWord>Overview</FocusWord>
          </h1>
          <p className="mx-auto m-0 max-w-xl text-[15px] leading-relaxed text-white/70">
            One row per firm — sizes, ratings, platforms, eval cost, and payout rules. Pin two names to spotlight a pair.
          </p>
        </header>
        <FirmOverviewTable firms={firms} />
      </section>
    </GreenPageShell>
  );
}
