import { Injectable } from '@nestjs/common';
import { ItadClient } from '../itad/itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';
import { SearchItem } from './games.types';

const SEARCH_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class GamesService {
  constructor(
    private readonly itad: ItadClient,
    private readonly cache: InMemoryCache,
  ) {}

  async search(q: string): Promise<SearchItem[]> {
    const key = `search:${q.toLowerCase()}`;
    const cached = this.cache.get<SearchItem[]>(key);
    if (cached) {
      return cached;
    }
    const results = await this.itad.searchGames(q);
    const mapped: SearchItem[] = results.map((r) => ({
      itadId: r.id,
      slug: r.slug,
      title: r.title,
      cover: r.cover,
    }));
    this.cache.set(key, mapped, SEARCH_TTL_MS);
    return mapped;
  }
}
