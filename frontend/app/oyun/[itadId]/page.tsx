import { GameDetail } from './GameDetail';
import { DEFAULT_REGION, REGIONS } from '@/lib/regions';

export default function GameDetailPage({
  params,
  searchParams,
}: {
  params: { itadId: string };
  searchParams: { region?: string };
}) {
  const raw = searchParams.region ?? DEFAULT_REGION;
  const region = REGIONS.some((r) => r.code === raw) ? raw : DEFAULT_REGION;
  return <GameDetail itadId={params.itadId} region={region} />;
}
