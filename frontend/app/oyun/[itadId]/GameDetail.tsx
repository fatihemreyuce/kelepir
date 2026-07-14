'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { ApiError } from '@/lib/api';
import { GameHeader } from '@/components/games/GameHeader';
import { PriceTable } from '@/components/games/PriceTable';
import { PriceHistoryChart } from '@/components/games/PriceHistoryChart';
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

  const rows = data.prices;
  const cheapestRow = rows.find((p) => p.isCheapest) ?? rows[0];
  const cheapest = cheapestRow?.price;
  const highest = rows.length ? Math.max(...rows.map((r) => r.price)) : undefined;
  const savings =
    cheapest !== undefined && highest !== undefined ? highest - cheapest : undefined;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <GameHeader
        title={data.game.title}
        cover={data.game.cover}
        region={region}
        onRegionChange={onRegionChange}
        storeCount={rows.length}
        cheapestPrice={cheapest}
        cheapestCut={cheapestRow?.cut}
        savings={savings && savings > 0 ? savings : undefined}
        currency={data.currency}
        favoriteSlot={<FavoriteButton itadId={itadId} />}
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-2">
            Nereden alınır
          </h2>
          <PriceTable prices={data.prices} currency={data.currency} />
        </section>
        <div className="flex flex-col gap-6">
          <PriceHistoryChart itadId={itadId} region={region} currency={data.currency} />
          <AlertForm key={region} itadId={itadId} region={region} cheapestPrice={cheapest} />
        </div>
      </div>
    </main>
  );
}
