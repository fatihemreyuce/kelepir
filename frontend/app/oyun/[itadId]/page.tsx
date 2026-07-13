import { GameDetail } from './GameDetail';
import { DEFAULT_REGION } from '@/lib/regions';

export default function GameDetailPage({
  params,
  searchParams,
}: {
  params: { itadId: string };
  searchParams: { region?: string };
}) {
  const region = searchParams.region ?? DEFAULT_REGION;
  return <GameDetail itadId={params.itadId} region={region} />;
}
