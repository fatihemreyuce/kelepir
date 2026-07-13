import { api } from './api';

export interface SearchItem {
  itadId: string;
  slug: string;
  title: string;
  cover: string | null;
}

export interface GamePriceRow {
  shopId: number;
  shopName: string;
  price: number;
  currency: string;
  regular: number;
  cut: number;
  url: string;
  isCheapest: boolean;
}

export interface GamePrices {
  game: { itadId: string; slug: string; title: string; cover: string | null };
  region: string;
  currency: string | null;
  prices: GamePriceRow[];
}

export const gamesApi = {
  search: (q: string) =>
    api<SearchItem[]>(`/games/search?q=${encodeURIComponent(q)}`),
  prices: (itadId: string, region: string) =>
    api<GamePrices>(
      `/games/${encodeURIComponent(itadId)}/prices?region=${encodeURIComponent(region)}`,
    ),
};
