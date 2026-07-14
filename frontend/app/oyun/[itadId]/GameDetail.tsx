'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { ApiError } from '@/lib/api';
import { GameHeader } from '@/components/games/GameHeader';
import { PriceTable } from '@/components/games/PriceTable';
import { Skeleton } from '@/components/ui/skeleton';
import { FavoriteButton } from '@/components/library/FavoriteButton';
import { AlertForm } from '@/components/library/AlertForm';

export function GameDetail({
  itadId,
  region,
}: {
  itadId: string;
  region: string;
}) {
  const router = useRouter();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['prices', itadId, region],
    queryFn: () => gamesApi.prices(itadId, region),
    placeholderData: keepPreviousData,
  });

  function onRegionChange(code: string) {
    router.push(
      `/oyun/${encodeURIComponent(itadId)}?region=${encodeURIComponent(code)}`,
      { scroll: false },
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p role="alert" className="font-mono text-sm text-destructive">
          {notFound ? 'Oyun bulunamadı.' : 'Bir şeyler ters gitti, tekrar dene.'}
        </p>
        {notFound ? (
          <Link href="/" className="mt-4 inline-block font-mono text-sm text-coral hover:underline">
            ← Aramaya dön
          </Link>
        ) : (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => refetch()}
              className="font-mono text-sm text-coral hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              Tekrar dene
            </button>
            <Link href="/" className="font-mono text-sm text-coral hover:underline">
              ← Aramaya dön
            </Link>
          </div>
        )}
      </main>
    );
  }

  if (isPending) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16" aria-busy="true" aria-label="Yükleniyor">
        <Skeleton className="h-24 w-full" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </main>
    );
  }

  const cheapest =
    data.prices.find((p) => p.isCheapest)?.price ?? data.prices[0]?.price;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <GameHeader
        title={data.game.title}
        cover={data.game.cover}
        region={region}
        onRegionChange={onRegionChange}
      />
      <div className="mt-4">
        <FavoriteButton itadId={itadId} />
      </div>
      <PriceTable prices={data.prices} currency={data.currency} />
      <AlertForm itadId={itadId} region={region} cheapestPrice={cheapest} />
    </main>
  );
}
