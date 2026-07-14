import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton } from '../FavoriteButton';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';

vi.mock('@/hooks/use-favorites', () => ({ useFavorites: vi.fn() }));
vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));

const addFavorite = vi.fn().mockResolvedValue(undefined);
const removeFavorite = vi.fn().mockResolvedValue(undefined);

function mockFavorites(favorites: Array<{ id: string; game: { itadId: string } }>) {
  vi.mocked(useFavorites).mockReturnValue({
    favorites: favorites as never,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    addFavorite,
    removeFavorite,
    isMutating: false,
  });
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
  });

  it('favori değilken tıklayınca addFavorite çağırır', async () => {
    mockFavorites([]);
    render(<FavoriteButton itadId="abc" />);
    await userEvent.click(screen.getByRole('button'));
    expect(addFavorite).toHaveBeenCalledWith('abc');
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it('favoriyken aria-pressed true ve tıklayınca removeFavorite çağırır', async () => {
    mockFavorites([{ id: 'f1', game: { itadId: 'abc' } }]);
    render(<FavoriteButton itadId="abc" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(removeFavorite).toHaveBeenCalledWith('f1');
  });

  it('giriş yoksa tıklayınca giriş ipucu gösterir, mutasyon çağırmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    mockFavorites([]);
    render(<FavoriteButton itadId="abc" />);
    await userEvent.click(screen.getByRole('button'));
    expect(addFavorite).not.toHaveBeenCalled();
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });

  it('addFavorite başarısız olunca hata mesajı gösterir, hata fırlatmaz', async () => {
    addFavorite.mockRejectedValueOnce(new ApiError(409, 'Bu oyun zaten favorilerde'));
    mockFavorites([]);
    render(<FavoriteButton itadId="abc" />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bu oyun zaten favorilerde');
  });
});
