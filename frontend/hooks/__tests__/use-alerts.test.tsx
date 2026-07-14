import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlerts } from '../use-alerts';
import { alertsApi, type Alert } from '@/lib/alerts-api';

vi.mock('@/lib/alerts-api', () => ({
  alertsApi: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' }, loading: false }),
}));

const alert: Alert = {
  id: 'a1',
  targetPrice: '149.99',
  region: 'TR',
  currency: 'TRY',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: null },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAlerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alarm listesini getirir', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([alert]);
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual([alert]);
  });

  it('addAlert api.add çağırır', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([]);
    vi.mocked(alertsApi.add).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addAlert({ itadId: 'abc', targetPrice: 90, region: 'DE' });
    });
    expect(alertsApi.add).toHaveBeenCalledWith({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('removeAlert api.remove çağırır', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([alert]);
    vi.mocked(alertsApi.remove).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeAlert('a1');
    });
    expect(alertsApi.remove).toHaveBeenCalledWith('a1');
  });
});
