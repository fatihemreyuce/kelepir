import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FavorilerPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';

vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/use-favorites', () => ({ useFavorites: vi.fn() }));

const baseFav = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isMutating: false,
};

describe('FavorilerPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('giriş yoksa AuthGate gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({ ...baseFav, favorites: [] } as never);
    render(<FavorilerPage />);
    expect(screen.getByRole('link', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('boş listede bilgilendirme gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({ ...baseFav, favorites: [] } as never);
    render(<FavorilerPage />);
    expect(screen.getByText(/henüz favori yok/i)).toBeInTheDocument();
  });

  it('favorileri gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({
      ...baseFav,
      favorites: [
        { id: 'f1', createdAt: '', game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null } },
      ],
    } as never);
    render(<FavorilerPage />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
  });
});
