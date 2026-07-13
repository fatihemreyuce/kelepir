import { Injectable, NotFoundException } from '@nestjs/common';
import { ItadClient } from '../itad/itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';
import { PrismaService } from '../prisma/prisma.service';
import { SearchItem, GamePrices, GamePriceRow } from './games.types';

const SEARCH_TTL_MS = 30 * 60 * 1000;
const PRICES_TTL_MS = 60 * 60 * 1000;
const DEFAULT_REGION = 'TR';

@Injectable()
export class GamesService {
  constructor(
    private readonly itad: ItadClient,
    private readonly cache: InMemoryCache,
    private readonly prisma: PrismaService,
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

  async getGamePrices(itadId: string, region?: string): Promise<GamePrices> {
    const country = region ?? DEFAULT_REGION;
    const key = `prices:${itadId}:${country}`;
    const cached = this.cache.get<GamePrices>(key);
    if (cached) {
      return cached;
    }

    const info = await this.itad.getGameInfo(itadId);
    if (!info) {
      throw new NotFoundException('Oyun bulunamadı');
    }

    // Game tablosuna upsert (favori/alarm FK'leri için)
    await this.prisma.game.upsert({
      where: { itadId: info.id },
      create: {
        itadId: info.id,
        title: info.title,
        slug: info.slug,
        coverUrl: info.cover,
      },
      update: { title: info.title, slug: info.slug, coverUrl: info.cover },
    });

    const dealsMap = await this.itad.getPrices([itadId], country);
    const deals = dealsMap.get(itadId) ?? [];

    let cheapestIdx = -1;
    let cheapestPrice = Number.POSITIVE_INFINITY;
    deals.forEach((d, i) => {
      if (d.price < cheapestPrice) {
        cheapestPrice = d.price;
        cheapestIdx = i;
      }
    });

    const prices: GamePriceRow[] = deals.map((d, i) => ({
      ...d,
      isCheapest: i === cheapestIdx,
    }));

    const result: GamePrices = {
      game: {
        itadId: info.id,
        slug: info.slug,
        title: info.title,
        cover: info.cover,
      },
      region: country,
      currency: deals[0]?.currency ?? null,
      prices,
    };

    this.cache.set(key, result, PRICES_TTL_MS);
    return result;
  }
}
