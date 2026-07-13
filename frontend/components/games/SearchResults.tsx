'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { GameCard } from './GameCard';
import { Skeleton } from '@/components/ui/skeleton';

export function SearchResults({ query }: { query: string }) {
  const term = query.trim();
  const enabled = term.length >= 2;
  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['search', term],
    queryFn: () => gamesApi.search(term),
    enabled,
  });

  if (!enabled) {
    return null;
  }

  if (isPending || isFetching) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="mt-8 font-mono text-sm text-destructive">
        Bir şeyler ters gitti, birazdan tekrar dene.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="mt-8 font-mono text-sm text-muted-2">
        Bu isimde kelepir bulunamadı.
      </p>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {data.map((item) => (
        <GameCard key={item.itadId} item={item} />
      ))}
    </div>
  );
}
