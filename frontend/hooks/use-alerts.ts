'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/lib/alerts-api';
import { useAuth } from '@/context/auth-context';

export function useAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['alerts'] });

  const addMut = useMutation({
    mutationFn: (dto: { itadId: string; targetPrice: number; region: string }) =>
      alertsApi.add(dto),
    onSuccess: invalidate,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: invalidate,
  });

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addAlert: (dto: { itadId: string; targetPrice: number; region: string }) =>
      addMut.mutateAsync(dto),
    removeAlert: (id: string) => removeMut.mutateAsync(id),
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
