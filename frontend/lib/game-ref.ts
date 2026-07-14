import type { SearchItem } from './games-api';

// Backend favori/alarm yanıtındaki `game` ham Prisma modelidir (coverUrl).
// Frontend her yerde SearchItem (cover) kullanır — burada normalize edilir.
export type GameRef = SearchItem;

interface RawGame {
  itadId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
}

export function toGameRef(raw: RawGame): GameRef {
  return {
    itadId: raw.itadId,
    slug: raw.slug,
    title: raw.title,
    cover: raw.coverUrl,
  };
}
