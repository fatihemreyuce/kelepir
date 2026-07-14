import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFavorites } from '../use-favorites';
import { favoritesApi, type Favorite } from '@/lib/favorites-api';
import { useAuth } from '@/context/auth-context';

vi.mock('@/lib/favorites-api', () => ({
  favoritesApi: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

const fav: Favorite = {
  id: 'f1',
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: null },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as ReturnType<typeof useAuth>);
  });

  it('favori listesini getirir', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([fav]);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.favorites).toEqual([fav]);
  });

  it('addFavorite api.add çağırır', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([]);
    vi.mocked(favoritesApi.add).mockResolvedValue(undefined);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addFavorite('abc');
    });
    expect(favoritesApi.add).toHaveBeenCalledWith('abc');
  });

  it('removeFavorite api.remove çağırır', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([fav]);
    vi.mocked(favoritesApi.remove).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeFavorite('f1');
    });
    expect(favoritesApi.remove).toHaveBeenCalledWith('f1');
  });

  it('user yoksa query devre dışı kalır, api.list çağrılmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof useAuth>);
    vi.mocked(favoritesApi.list).mockResolvedValue([fav]);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(favoritesApi.list).not.toHaveBeenCalled();
    expect(result.current.favorites).toEqual([]);
  });

  it('addFavorite başarılı olunca favorites query invalidate edilir', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([]);
    vi.mocked(favoritesApi.add).mockResolvedValue(undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addFavorite('abc');
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['favorites'] });
  });
});
