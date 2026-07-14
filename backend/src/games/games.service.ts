import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ItadClient } from '../itad/itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';
import { PrismaService } from '../prisma/prisma.service';
import {
  SearchItem,
  GamePrices,
  GamePriceRow,
  GameHistory,
} from './games.types';

const SEARCH_TTL_MS = 30 * 60 * 1000;
const PRICES_TTL_MS = 60 * 60 * 1000;
const DEFAULT_REGION = 'TR';
const HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const SNAPSHOT_THROTTLE_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

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
    const game = await this.prisma.game.upsert({
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

    // fiyat geçmişi: bu (oyun, region) için throttle'lı snapshot yaz
    await this.maybeWriteSnapshot(game.id, country, deals);

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

  async getGameHistory(itadId: string, region?: string): Promise<GameHistory> {
    const country = region ?? DEFAULT_REGION;
    const game = await this.prisma.game.findUnique({ where: { itadId } });
    if (!game) {
      return { region: country, points: [] };
    }

    const since = new Date(Date.now() - HISTORY_WINDOW_MS);
    const snaps = await this.prisma.priceSnapshot.findMany({
      where: { gameId: game.id, region: country, fetchedAt: { gte: since } },
      orderBy: { fetchedAt: 'asc' },
      select: { price: true, fetchedAt: true },
    });

    // gün bazında (UTC) en ucuz fiyata indirge
    const minByDay = new Map<string, number>();
    for (const s of snaps) {
      const date = s.fetchedAt.toISOString().slice(0, 10);
      const price = Number(s.price);
      const cur = minByDay.get(date);
      if (cur === undefined || price < cur) {
        minByDay.set(date, price);
      }
    }

    const points = [...minByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({ date, price }));

    return { region: country, points };
  }

  private async maybeWriteSnapshot(
    gameId: string,
    region: string,
    deals: { shopName: string; price: number; cut: number; url: string }[],
  ): Promise<void> {
    if (deals.length === 0) {
      return;
    }
    try {
      const last = await this.prisma.priceSnapshot.findFirst({
        where: { gameId, region },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true },
      });
      if (last && Date.now() - last.fetchedAt.getTime() < SNAPSHOT_THROTTLE_MS) {
        return;
      }
      await this.prisma.priceSnapshot.createMany({
        data: deals.map((d) => ({
          gameId,
          store: d.shopName,
          price: d.price,
          discount: d.cut,
          region,
          url: d.url,
        })),
      });
    } catch (err) {
      this.logger.warn(
        `Snapshot yazılamadı (${gameId}/${region}): ${(err as Error).message}`,
      );
    }
  }
}
