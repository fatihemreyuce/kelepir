'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { ApiError } from '@/lib/api';
import { GameHeader } from '@/components/games/GameHeader';
import { PriceTable } from '@/components/games/PriceTable';
import { Skeleton } from '@/components/ui/skeleton';

export function GameDetail({
  itadId,
  region,
}: {
  itadId: string;
  region: string;
}) {
  const router = useRouter();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['prices', itadId, region],
    queryFn: () => gamesApi.prices(itadId, region),
    placeholderData: keepPreviousData,
  });

  function onRegionChange(code: string) {
    router.push(`/oyun/${itadId}?region=${code}`, { scroll: false });
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p role="alert" className="font-mono text-sm text-destructive">
          {notFound ? 'Oyun bulunamadı.' : 'Bir şeyler ters gitti, tekrar dene.'}
        </p>
        <Link href="/" className="mt-4 inline-block font-mono text-sm text-coral hover:underline">
          ← Aramaya dön
        </Link>
      </main>
    );
  }

  if (isPending) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="h-24 w-full" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <GameHeader
        title={data.game.title}
        cover={data.game.cover}
        region={region}
        onRegionChange={onRegionChange}
      />
      <PriceTable prices={data.prices} currency={data.currency} />
    </main>
  );
}
