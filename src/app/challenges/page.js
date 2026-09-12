import DemoHeroGreen from '@/components/DemoHeroGreen';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Compare Prop Challenges',
  description:
    'Filter by size, steps, and price — rules, drawdown, and KAGE pricing in one table.',
};

export default async function ChallengesPage() {
  const { firms } = await getRuntimeFirms();
  return <DemoHeroGreen firms={firms} />;
}
