import DemoHeroGreen from '@/components/DemoHeroGreen';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Compare Prop Challenges',
  description: 'Compare challenges by size, steps, drawdown, and KAGE price.',
};

export default async function ChallengesPage() {
  const { firms } = await getRuntimeFirms();
  return <DemoHeroGreen firms={firms} />;
}
