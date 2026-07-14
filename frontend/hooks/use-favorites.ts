'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/favorites-api';
import { useAuth } from '@/context/auth-context';

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.list,
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['favorites'] });

  const addMut = useMutation({
    mutationFn: (itadId: string) => favoritesApi.add(itadId),
    onSuccess: invalidate,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => favoritesApi.remove(id),
    onSuccess: invalidate,
  });

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addFavorite: (itadId: string) => addMut.mutateAsync(itadId),
    removeFavorite: (id: string) => removeMut.mutateAsync(id),
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
