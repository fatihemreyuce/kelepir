# Kelepir Faz 3 — Arama + Fiyat (ITAD) Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'de IsThereAnyDeal (ITAD) entegrasyonu: oyun arama, oyun detay + mağaza bazlı güncel fiyatlar (bölgesel), "en ucuz" işaretleme, ITAD trafiğini azaltan basit cache. Faz 3 yalnızca backend'dir.

**Architecture:** İzole `ItadClient` (native `fetch`, API key env'den) dış API'yi sarar; `GamesService` client + basit in-memory TTL cache üstünde iş mantığını (arama, fiyat, Game upsert, en ucuz) kurar; `GamesController` public REST endpoint'lerini sunar. Testler `ItadClient`'ı mock'lar — hiçbir test gerçek ITAD'a gitmez.

**Tech Stack:** NestJS 10, native `fetch` (Node 20+), Prisma 6, class-validator, Jest e2e + supertest. Ekstra HTTP kütüphanesi YOK (axios yok).

## Global Constraints

- Bu faz **yalnızca backend** (`backend/`) — `frontend/` değişmez
- NO Supabase, NO Redis (cache in-memory), NO Vercel Cron
- HTTP client: **native `fetch`** — yeni bağımlılık ekleme
- ITAD auth: API key `key` query paramı ile geçirilir; base URL env'den (`ITAD_BASE_URL`, default `https://api.isthereanydeal.com`)
- Endpoint'ler: arama `GET /games/search/v1?title=&results=`; fiyat `POST /games/prices/v3?country=` (body: UUID dizisi); info `GET /games/info/v2?id=`
- Bölge (region) = ISO 3166-1 alpha-2 ülke kodu; **default `TR`**; para birimi ITAD yanıtından okunur (hardcode yok)
- Arama/fiyat endpoint'leri **public** (auth yok)
- Yeni env değişkeni eklenince aynı anda `backend/.env` ve `backend/.env.example`'a eklenir; `backend/.env` git'e girmez
- `ITAD_API_KEY` şu an placeholder (boş) — testler client'ı mock'lar, gerçek key sonra eklenip canlı doğrulanır
- Cache TTL: arama 30 dk, fiyat 60 dk
- Prisma 6.x, DB host 5433 değişmez

> **Canlı doğrulama notu:** ITAD yanıt zarfı (array mı, `{list:[]}` mı) bu planda araştırma referansına göre **düz array** varsayıldı. Gerçek key eklendiğinde bir kez canlı doğrulanmalı; sapma olursa `ItadClient`'ın parse'ı güncellenir (client izole olduğu için tek nokta).

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
backend/
  src/
    itad/
      itad.types.ts            ITAD DTO'ları (search/info/deal)
      itad.client.ts           fetch tabanlı ITAD wrapper (search/getInfo/getPrices)
      itad.client.spec.ts      client birim testi (global.fetch mock'lu)
    cache/
      in-memory-cache.ts       basit TTL cache servisi
      in-memory-cache.spec.ts  birim testi
    games/
      games.module.ts
      games.service.ts         arama, fiyat, Game upsert, en ucuz + cache
      games.controller.ts      GET /games/search, GET /games/:itadId/prices
      dto/
        search-query.dto.ts    ?q= doğrulama
        prices-query.dto.ts    ?region= doğrulama
      games.types.ts           dış API-bağımsız yanıt tipleri (SearchItem, GamePrices)
    app.module.ts              (Modify) GamesModule eklenir
  test/
    games.e2e-spec.ts          arama + fiyat e2e (ItadClient mock'lu)
  .env / .env.example          (Modify) ITAD_API_KEY, ITAD_BASE_URL
```

---

### Task 1: ITAD client + tipler + env config

**Files:**
- Create: `backend/src/itad/itad.types.ts`, `backend/src/itad/itad.client.ts`, `backend/src/itad/itad.client.spec.ts`
- Modify: `backend/.env`, `backend/.env.example`

**Interfaces:**
- Consumes: `authConfig` deseni gibi env; Node global `fetch`.
- Produces:
  - `ItadClient` (injectable) metotları:
    - `searchGames(title: string, results?: number): Promise<ItadSearchItem[]>`
    - `getGameInfo(id: string): Promise<ItadGameInfo | null>`
    - `getPrices(ids: string[], country: string): Promise<Map<string, ItadDeal[]>>`
  - tipler: `ItadSearchItem`, `ItadGameInfo`, `ItadDeal` (aşağıda).
  - Sonraki task'lar `ItadClient`'ı inject eder / test'te mock'lar.

- [ ] **Step 1: itad.types.ts oluştur**

Create `backend/src/itad/itad.types.ts`:

```typescript
export interface ItadSearchItem {
  id: string; // ITAD UUID
  slug: string;
  title: string;
  cover: string | null;
}

export interface ItadGameInfo {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
}

export interface ItadDeal {
  shopId: number;
  shopName: string;
  price: number; // amount (ör. 149.99)
  currency: string; // ör. "TRY"
  regular: number; // indirimsiz fiyat
  cut: number; // indirim yüzdesi
  url: string;
}
```

- [ ] **Step 2: Failing client birim testini yaz**

Create `backend/src/itad/itad.client.spec.ts`:

```typescript
import { ItadClient } from './itad.client';

describe('ItadClient', () => {
  let client: ItadClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.ITAD_API_KEY = 'test-key';
    process.env.ITAD_BASE_URL = 'https://api.example.test';
    client = new ItadClient();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('searchGames doğru URL çağırır ve sonuçları map\'ler', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'uuid-1',
          slug: 'game-one',
          title: 'Game One',
          assets: { boxart: 'http://img/box.jpg' },
        },
      ],
    } as Response);

    const res = await client.searchGames('game one', 5);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/games/search/v1');
    expect(calledUrl).toContain('title=game+one');
    expect(calledUrl).toContain('results=5');
    expect(calledUrl).toContain('key=test-key');
    expect(res).toEqual([
      { id: 'uuid-1', slug: 'game-one', title: 'Game One', cover: 'http://img/box.jpg' },
    ]);
  });

  it('getPrices POST ile UUID dizisi ve country gönderir, deal\'leri map\'ler', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'uuid-1',
          deals: [
            {
              shop: { id: 61, name: 'Steam' },
              price: { amount: 149.99, currency: 'TRY' },
              regular: { amount: 299.99, currency: 'TRY' },
              cut: 50,
              url: 'http://steam/app',
            },
          ],
        },
      ],
    } as Response);

    const res = await client.getPrices(['uuid-1'], 'TR');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/games/prices/v3');
    expect(url).toContain('country=TR');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(['uuid-1']);
    expect(res.get('uuid-1')).toEqual([
      {
        shopId: 61,
        shopName: 'Steam',
        price: 149.99,
        currency: 'TRY',
        regular: 299.99,
        cut: 50,
        url: 'http://steam/app',
      },
    ]);
  });

  it('fetch ok değilse hata fırlatır', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(client.searchGames('x')).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm test -- itad.client`
Expected: FAIL (`ItadClient` yok / derlenmiyor).

- [ ] **Step 4: ItadClient'ı yaz**

Create `backend/src/itad/itad.client.ts`:

```typescript
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
        (entry.deals ?? []).map((d) => ({
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
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm test -- itad.client`
Expected: PASS (3 test).

- [ ] **Step 6: Env değişkenlerini ekle (hem .env hem .env.example)**

`backend/.env` VE `backend/.env.example` sonuna ekle:

```
ITAD_API_KEY=""
ITAD_BASE_URL="https://api.isthereanydeal.com"
```

> `ITAD_API_KEY` şimdilik boş; gerçek key kullanıcı tarafından sonra doldurulacak. Testler client'ı mock'lar, boş key testleri etkilemez.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "feat(backend): ITAD client (search/info/prices) + tipler + env (Faz 3)"
```

---

### Task 2: In-memory TTL cache servisi

**Files:**
- Create: `backend/src/cache/in-memory-cache.ts`, `backend/src/cache/in-memory-cache.spec.ts`

**Interfaces:**
- Produces: `InMemoryCache` (injectable): `get<T>(key: string): T | undefined`, `set(key: string, value: unknown, ttlMs: number): void`. Süresi geçmiş kayıt `get`'te silinir ve `undefined` döner.

- [ ] **Step 1: Failing cache birim testini yaz**

Create `backend/src/cache/in-memory-cache.spec.ts`:

```typescript
import { InMemoryCache } from './in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('set edilen değeri TTL içinde döner', () => {
    cache.set('k', { a: 1 }, 10_000);
    expect(cache.get<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('olmayan anahtar için undefined döner', () => {
    expect(cache.get('yok')).toBeUndefined();
  });

  it('süresi geçmiş anahtar undefined döner', () => {
    cache.set('k', 'v', -1); // geçmişte sona eriyor
    expect(cache.get('k')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm test -- in-memory-cache`
Expected: FAIL (`InMemoryCache` yok).

- [ ] **Step 3: InMemoryCache'i yaz**

Create `backend/src/cache/in-memory-cache.ts`:

```typescript
import { Injectable } from '@nestjs/common';

interface Entry {
  value: unknown;
  expiresAt: number;
}

@Injectable()
export class InMemoryCache {
  private readonly store = new Map<string, Entry>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm test -- in-memory-cache`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): in-memory TTL cache servisi (Faz 3)"
```

---

### Task 3: GamesModule + GamesService + GET /games/search

**Files:**
- Create: `backend/src/games/games.types.ts`, `backend/src/games/dto/search-query.dto.ts`
- Create: `backend/src/games/games.service.ts`, `backend/src/games/games.controller.ts`, `backend/src/games/games.module.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/games.e2e-spec.ts`

**Interfaces:**
- Consumes: `ItadClient`, `InMemoryCache`.
- Produces:
  - tip `SearchItem = { itadId: string; slug: string; title: string; cover: string | null }`
  - `GamesService.search(q: string): Promise<SearchItem[]>` (30 dk cache)
  - `GET /games/search?q=` (200, public)
  - `GamesModule` (Task 4 aynı modüle prices ekler)

- [ ] **Step 1: games.types.ts + SearchQueryDto oluştur**

Create `backend/src/games/games.types.ts`:

```typescript
export interface SearchItem {
  itadId: string;
  slug: string;
  title: string;
  cover: string | null;
}
```

Create `backend/src/games/dto/search-query.dto.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}
```

- [ ] **Step 2: Failing search e2e testini yaz**

Create `backend/test/games.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ItadClient } from './../src/itad/itad.client';

const itadMock = {
  searchGames: jest.fn(),
  getGameInfo: jest.fn(),
  getPrices: jest.fn(),
};

describe('Games (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ItadClient)
      .useValue(itadMock)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /games/search?q= ITAD sonuçlarını map\'leyerek döner', async () => {
    itadMock.searchGames.mockResolvedValue([
      { id: 'uuid-1', slug: 'game-one', title: 'Game One', cover: 'http://img' },
    ]);

    const res = await request(app.getHttpServer())
      .get('/games/search')
      .query({ q: 'game one' })
      .expect(200);

    expect(res.body).toEqual([
      { itadId: 'uuid-1', slug: 'game-one', title: 'Game One', cover: 'http://img' },
    ]);
    expect(itadMock.searchGames).toHaveBeenCalledWith('game one');
  });

  it('q boşsa 400 döner', async () => {
    await request(app.getHttpServer()).get('/games/search').expect(400);
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- games`
Expected: FAIL (`/games/search` yok → 404, ve/veya ItadClient provider bulunamaz).

- [ ] **Step 4: GamesService'i yaz (search)**

Create `backend/src/games/games.service.ts`:

```typescript
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
```

- [ ] **Step 5: GamesController'ı yaz (search)**

Create `backend/src/games/games.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.games.search(query.q);
  }
}
```

- [ ] **Step 6: GamesModule'ü yaz**

Create `backend/src/games/games.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { ItadClient } from '../itad/itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';

@Module({
  controllers: [GamesController],
  providers: [GamesService, ItadClient, InMemoryCache],
})
export class GamesModule {}
```

- [ ] **Step 7: AppModule'e GamesModule ekle**

`backend/src/app.module.ts` `imports` dizisine `GamesModule` ekle (ConfigModule, PrismaModule, AuthModule, HealthController korunur):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GamesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 8: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- games`
Expected: PASS (search 200 + q boş 400).

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "feat(backend): GamesModule + GET /games/search (ITAD arama, cache'li) (Faz 3)"
```

---

### Task 4: GET /games/:itadId/prices + Game upsert + en ucuz işaretleme

**Files:**
- Create: `backend/src/games/dto/prices-query.dto.ts`
- Modify: `backend/src/games/games.types.ts` (fiyat yanıt tipleri)
- Modify: `backend/src/games/games.service.ts` (`getGamePrices`)
- Modify: `backend/src/games/games.controller.ts` (prices endpoint)
- Modify: `backend/src/games/games.module.ts` (PrismaService zaten global — ek gerekmez)
- Modify: `backend/test/games.e2e-spec.ts` (prices testleri)

**Interfaces:**
- Consumes: `ItadClient.getGameInfo`/`getPrices`, `PrismaService` (global), `InMemoryCache`.
- Produces:
  - tipler `GamePriceRow = { shopId; shopName; price; currency; regular; cut; url; isCheapest: boolean }`, `GamePrices = { game: { itadId; slug; title; cover }; region: string; currency: string | null; prices: GamePriceRow[] }`
  - `GamesService.getGamePrices(itadId: string, region: string): Promise<GamePrices>` (60 dk cache; Game tablosuna upsert)
  - `GET /games/:itadId/prices?region=` (200, public; region default `TR`)

- [ ] **Step 1: PricesQueryDto + games.types.ts fiyat tipleri**

Create `backend/src/games/dto/prices-query.dto.ts`:

```typescript
import { IsOptional, IsString, Length } from 'class-validator';

export class PricesQueryDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  region?: string;
}
```

`backend/src/games/games.types.ts` sonuna ekle:

```typescript
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
```

- [ ] **Step 2: Failing prices e2e testlerini ekle**

Bu testlerde **her test farklı `itadId` kullanır** (`uuid-1`, `uuid-2`, `yok`). Sebep: `InMemoryCache` uygulama örneğinde yaşar ve testler arası kalır; cache anahtarı `prices:{itadId}:{region}` olduğundan, farklı id'ler kullanmak testleri deterministik yapar (bir testin cache'i diğerine sızmaz). `beforeEach(jest.clearAllMocks())` yalnızca mock çağrı geçmişini sıfırlar, cache'i değil.

Önce dosya başındaki importlara `PrismaService`'i ekle:

```typescript
import { PrismaService } from './../src/prisma/prisma.service';
```

`describe` bloğunun en üstünde (mevcut `let app: INestApplication;` yanına) prisma değişkeni tanımla:

```typescript
  let prisma: PrismaService;
```

`beforeAll` içinde `await app.init();` satırından SONRA prisma'yı al:

```typescript
    prisma = app.get(PrismaService);
```

`afterAll` içinde `await app.close();` satırından ÖNCE test oyunlarını temizle:

```typescript
    await prisma.game.deleteMany({ where: { itadId: { in: ['uuid-1', 'uuid-2'] } } });
```

Sonra kapanış `});`'ten önce şu testleri ekle:

```typescript
  it('GET /games/:itadId/prices en ucuzu işaretler ve Game upsert eder', async () => {
    itadMock.getGameInfo.mockResolvedValue({
      id: 'uuid-1',
      slug: 'game-one',
      title: 'Game One',
      cover: 'http://img',
    });
    itadMock.getPrices.mockResolvedValue(
      new Map([
        [
          'uuid-1',
          [
            { shopId: 61, shopName: 'Steam', price: 149.99, currency: 'TRY', regular: 299.99, cut: 50, url: 'http://steam' },
            { shopId: 35, shopName: 'GOG', price: 99.99, currency: 'TRY', regular: 199.99, cut: 50, url: 'http://gog' },
          ],
        ],
      ]),
    );

    const res = await request(app.getHttpServer())
      .get('/games/uuid-1/prices')
      .query({ region: 'TR' })
      .expect(200);

    expect(res.body.game.itadId).toBe('uuid-1');
    expect(res.body.region).toBe('TR');
    expect(res.body.currency).toBe('TRY');
    const cheapest = res.body.prices.find((p: { isCheapest: boolean }) => p.isCheapest);
    expect(cheapest.shopName).toBe('GOG');
    expect(cheapest.price).toBe(99.99);
    // sadece bir tane en ucuz işaretli
    expect(res.body.prices.filter((p: { isCheapest: boolean }) => p.isCheapest)).toHaveLength(1);
    expect(itadMock.getPrices).toHaveBeenCalledWith(['uuid-1'], 'TR');

    // Game DB'ye upsert edilmiş olmalı
    const game = await prisma.game.findUnique({ where: { itadId: 'uuid-1' } });
    expect(game?.title).toBe('Game One');
  });

  it('region verilmezse default TR kullanılır', async () => {
    // farklı id (uuid-2) — cache çakışmasını önler
    itadMock.getGameInfo.mockResolvedValue({
      id: 'uuid-2', slug: 'game-two', title: 'Game Two', cover: null,
    });
    itadMock.getPrices.mockResolvedValue(
      new Map([['uuid-2', [{ shopId: 61, shopName: 'Steam', price: 10, currency: 'TRY', regular: 10, cut: 0, url: 'http://s' }]]]),
    );

    await request(app.getHttpServer()).get('/games/uuid-2/prices').expect(200);
    expect(itadMock.getPrices).toHaveBeenCalledWith(['uuid-2'], 'TR');
  });

  it('bilinmeyen oyun 404 döner', async () => {
    itadMock.getGameInfo.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/games/yok/prices').expect(404);
  });
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- games`
Expected: FAIL (prices endpoint yok → 404).

- [ ] **Step 4: GamesService.getGamePrices'ı yaz**

`backend/src/games/games.service.ts` — importları ve sabiti ekle, prices metodunu ekle:

Dosya başındaki importlara ekle:

```typescript
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamePrices, GamePriceRow } from './games.types';
```

Sabit ekle (SEARCH_TTL_MS yanına):

```typescript
const PRICES_TTL_MS = 60 * 60 * 1000;
const DEFAULT_REGION = 'TR';
```

Constructor'a `PrismaService` inject et:

```typescript
  constructor(
    private readonly itad: ItadClient,
    private readonly cache: InMemoryCache,
    private readonly prisma: PrismaService,
  ) {}
```

Sınıfa metod ekle:

```typescript
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
```

- [ ] **Step 5: GamesController'a prices endpoint ekle**

`backend/src/games/games.controller.ts` — importlara `Param` ve `PricesQueryDto` ekle, endpoint ekle:

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PricesQueryDto } from './dto/prices-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.games.search(query.q);
  }

  @Get(':itadId/prices')
  prices(@Param('itadId') itadId: string, @Query() query: PricesQueryDto) {
    return this.games.getGamePrices(itadId, query.region);
  }
}
```

- [ ] **Step 6: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- games`
Expected: PASS (search + prices en ucuz + default TR + 404).

- [ ] **Step 7: Tüm backend testlerini bir kez çalıştır**

Run: `cd backend && npm run test:e2e && npm test`
Expected: e2e (health + auth + games) PASS; unit (itad.client + in-memory-cache) PASS; çıktı temiz.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): GET /games/:itadId/prices + Game upsert + en ucuz işaretleme (Faz 3)"
```

---

## Faz 3 Bitiş Kriteri (Definition of Done)

- `cd backend && npm run test:e2e` → health + auth + games e2e hepsi geçer; `npm test` → itad.client + in-memory-cache birim testleri geçer; çıktı temiz
- `GET /games/search?q=` ITAD araması yapar (30 dk cache), `GET /games/:itadId/prices?region=` mağaza fiyatlarını döner, en ucuzu işaretler, Game'i DB'ye upsert eder (60 dk cache), region default `TR`
- ITAD çağrıları `ItadClient` arkasında izole; testler client'ı mock'lar, hiçbir test gerçek ITAD'a gitmez
- `ITAD_API_KEY`/`ITAD_BASE_URL` hem `backend/.env` hem `backend/.env.example`'da; `backend/.env` git'te değil
- Yeni bağımlılık eklenmedi (native fetch)

## Sonraki Faz

Faz 4 — Favoriler + alarmlar CRUD (korumalı, `JwtAuthGuard`; Game upsert'ü Faz 3'ten kullanır). Backend tamamlanınca frontend fazlarına geçilecek; o noktada ertelenen shadcn/Tailwind kararı + `NEXT_PUBLIC_API_URL` + CORS ele alınacak. Gerçek `ITAD_API_KEY` eklendiğinde arama/fiyat canlı doğrulanacak.
