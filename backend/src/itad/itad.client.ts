import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ItadDeal,
  ItadGameInfo,
  ItadSearchItem,
} from './itad.types';

@Injectable()
export class ItadClient {
  private get baseUrl(): string {
    return process.env.ITAD_BASE_URL ?? 'https://api.isthereanydeal.com';
  }

  private get apiKey(): string {
    return process.env.ITAD_API_KEY ?? '';
  }

  private mapCover(assets?: { boxart?: string; banner145?: string }): string | null {
    return assets?.boxart ?? assets?.banner145 ?? null;
  }

  async searchGames(title: string, results = 20): Promise<ItadSearchItem[]> {
    const url = new URL('/games/search/v1', this.baseUrl);
    url.searchParams.set('title', title);
    url.searchParams.set('results', String(results));
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new InternalServerErrorException(
        `ITAD search failed: ${res.status}`,
      );
    }
    const data = (await res.json()) as Array<{
      id: string;
      slug: string;
      title: string;
      assets?: { boxart?: string; banner145?: string };
    }>;
    return data.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      cover: this.mapCover(g.assets),
    }));
  }

  async getGameInfo(id: string): Promise<ItadGameInfo | null> {
    const url = new URL('/games/info/v2', this.baseUrl);
    url.searchParams.set('id', id);
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url.toString());
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new InternalServerErrorException(`ITAD info failed: ${res.status}`);
    }
    const g = (await res.json()) as {
      id: string;
      slug: string;
      title: string;
      assets?: { boxart?: string; banner145?: string };
    };
    return {
      id: g.id,
      slug: g.slug,
      title: g.title,
      cover: this.mapCover(g.assets),
    };
  }

  async getPrices(
    ids: string[],
    country: string,
  ): Promise<Map<string, ItadDeal[]>> {
    const url = new URL('/games/prices/v3', this.baseUrl);
    url.searchParams.set('country', country);
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `ITAD prices failed: ${res.status}`,
      );
    }
    const data = (await res.json()) as Array<{
      id: string;
      deals: Array<{
        shop: { id: number; name: string };
        price: { amount: number; currency: string };
        regular?: { amount: number; currency: string };
        cut: number;
        url: string;
      }>;
    }>;

    const map = new Map<string, ItadDeal[]>();
    for (const entry of data) {
      map.set(
        entry.id,
        (entry.deals ?? [])
          .filter((d) => d.shop && d.price)
          .map((d) => ({
            shopId: d.shop.id,
            shopName: d.shop.name,
            price: d.price.amount,
            currency: d.price.currency,
            regular: d.regular?.amount ?? d.price.amount,
            cut: d.cut,
            url: d.url,
          })),
      );
    }
    return map;
  }
}
