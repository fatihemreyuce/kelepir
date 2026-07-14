'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';

export function usePriceHistory(itadId: string, region: string) {
  const query = useQuery({
    queryKey: ['price-history', itadId, region],
    queryFn: () => gamesApi.history(itadId, region),
    placeholderData: keepPreviousData,
  });

  return {
    points: query.data?.points ?? [],
    isPending: query.isPending,
    isError: query.isError,
  };
}
