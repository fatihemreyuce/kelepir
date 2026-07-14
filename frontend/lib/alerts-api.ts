import { api } from './api';
import { toGameRef, type GameRef } from './game-ref';

export interface Alert {
  id: string;
  targetPrice: string; // Prisma Decimal -> JSON'da string
  region: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  game: GameRef;
}

interface RawAlert {
  id: string;
  targetPrice: string;
  region: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  game: { itadId: string; slug: string; title: string; coverUrl: string | null };
}

export const alertsApi = {
  list: async (): Promise<Alert[]> => {
    const rows = await api<RawAlert[]>('/alerts');
    return rows.map((r) => ({ ...r, game: toGameRef(r.game) }));
  },
  add: (dto: { itadId: string; targetPrice: number; region: string }) =>
    api<unknown>('/alerts', { method: 'POST', body: dto }),
  remove: (id: string) =>
    api<{ success: true }>(`/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
