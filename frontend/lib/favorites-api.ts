import { api } from './api';
import { toGameRef, type GameRef } from './game-ref';

export interface Favorite {
  id: string;
  createdAt: string;
  game: GameRef;
}

interface RawFavorite {
  id: string;
  createdAt: string;
  game: { itadId: string; slug: string; title: string; coverUrl: string | null };
}

export const favoritesApi = {
  list: async (): Promise<Favorite[]> => {
    const rows = await api<RawFavorite[]>('/favorites');
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, game: toGameRef(r.game) }));
  },
  add: (itadId: string) => api<unknown>('/favorites', { method: 'POST', body: { itadId } }),
  remove: (id: string) =>
    api<{ success: true }>(`/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
