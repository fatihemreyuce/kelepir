# Faz 10 — Fiyat Geçmişi Grafiği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oyun detay sayfasına, seçili bölgedeki günlük en ucuz fiyatın son 90 günlük trendini gösteren bir çizgi grafiği eklemek; geçmişin birikmesi için `prices` çağrısında da throttle'lı snapshot yazmak.

**Architecture:** Backend'de `PriceSnapshot`'lardan okuyan bir `GET /games/:itadId/history` endpoint'i (kodda gün-bazlı min gruplama) ve `getGamePrices`'a best-effort throttle'lı snapshot yazımı. Frontend'de Recharts `LineChart` bileşeni, TanStack Query hook'u ile beslenip `GameDetail`'de `PriceTable` altına yerleşir.

**Tech Stack:** NestJS + Prisma (Postgres), Jest (backend unit); Next.js 14 + TanStack Query v5 + Recharts, Vitest (frontend).

## Global Constraints

- Base branch `master` (yerel-only repo, remote takip yok → push/pull yok). Çalışma branch'i: `faz-10-fiyat-gecmisi`.
- Backend unit testleri **DB'siz** (PrismaService/ItadClient/InMemoryCache mock'lanır). Çalıştır: `cd backend && npm run test`.
- Frontend: `cd frontend && npm run test` (vitest) + `npm run build`.
- `PriceSnapshot`'ta `currency` YOK; para birimi frontend'de güncel `prices` yanıtındaki `currency`'den gelir.
- Zaman penceresi sabit **90 gün**; throttle sabiti **12 saat** (`SNAPSHOT_THROTTLE_MS = 12*60*60*1000`).
- Gün gruplaması UTC `YYYY-MM-DD` (fetchedAt.toISOString().slice(0,10)).
- Gece Pazarı renkleri (sabit hex): coral `#ff5a3c`, line `#3a332c`, muted `#9a8f84`, surface `#211c18`, bone `#f2ebe3`.
- Atomik commit'ler; her commit sonu `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Backend tipler + `getGameHistory` servisi

**Files:**
- Modify: `backend/src/games/games.types.ts`
- Modify: `backend/src/games/games.service.ts`
- Test: `backend/src/games/games.service.spec.ts` (Create)

**Interfaces:**
- Produces: `GameHistoryPoint { date: string; price: number }`, `GameHistory { region: string; points: GameHistoryPoint[] }`; `GamesService.getGameHistory(itadId: string, region?: string): Promise<GameHistory>`.

- [ ] **Step 1: Tipleri ekle** — `games.types.ts` sonuna:

```ts
export interface GameHistoryPoint {
  date: string;
  price: number;
}

export interface GameHistory {
  region: string;
  points: GameHistoryPoint[];
}
```

- [ ] **Step 2: Failing test yaz** — `games.service.spec.ts`:

```ts
import { GamesService } from './games.service';

describe('GamesService.getGameHistory', () => {
  const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
  let prisma: any;
  let service: GamesService;

  beforeEach(() => {
    prisma = {
      game: { findUnique: jest.fn(), upsert: jest.fn() },
      priceSnapshot: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
    };
    const cache = { get: jest.fn(), set: jest.fn() };
    const itad = { getGameInfo: jest.fn(), getPrices: jest.fn(), searchGames: jest.fn() };
    service = new GamesService(itad as any, cache as any, prisma as any);
  });

  it('oyun DB’de yoksa boş points döner', async () => {
    prisma.game.findUnique.mockResolvedValue(null);
    const res = await service.getGameHistory('itad-x', 'TR');
    expect(res).toEqual({ region: 'TR', points: [] });
    expect(prisma.priceSnapshot.findMany).not.toHaveBeenCalled();
  });

  it('aynı günün birden çok snapshotını en ucuza indirger, günleri artan sıralar', async () => {
    prisma.game.findUnique.mockResolvedValue({ id: 'g1' });
    prisma.priceSnapshot.findMany.mockResolvedValue([
      { price: 200, fetchedAt: day('2026-07-10') },
      { price: 150, fetchedAt: day('2026-07-10') },
      { price: 180, fetchedAt: day('2026-07-12') },
    ]);
    const res = await service.getGameHistory('itad-1', 'TR');
    expect(res.region).toBe('TR');
    expect(res.points).toEqual([
      { date: '2026-07-10', price: 150 },
      { date: '2026-07-12', price: 180 },
    ]);
    // region + 90 gün filtresi uygulanıyor
    const arg = prisma.priceSnapshot.findMany.mock.calls[0][0];
    expect(arg.where.gameId).toBe('g1');
    expect(arg.where.region).toBe('TR');
    expect(arg.where.fetchedAt.gte).toBeInstanceOf(Date);
  });

  it('region verilmezse DEFAULT_REGION (TR) kullanır', async () => {
    prisma.game.findUnique.mockResolvedValue(null);
    const res = await service.getGameHistory('itad-1');
    expect(res.region).toBe('TR');
  });
});
```

- [ ] **Step 3: Run test → FAIL**

Run: `cd backend && npm run test -- games.service`
Expected: FAIL (`getGameHistory is not a function`).

- [ ] **Step 4: `getGameHistory` implement et** — `games.service.ts`. Import satırına `GameHistory` ekle (`import { SearchItem, GamePrices, GamePriceRow, GameHistory } from './games.types';`). Dosya sonuna, class içine:

```ts
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
```

Dosya başındaki sabitlerin yanına ekle:

```ts
const HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
```

- [ ] **Step 5: Run test → PASS**

Run: `cd backend && npm run test -- games.service`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**

```bash
git add backend/src/games/games.types.ts backend/src/games/games.service.ts backend/src/games/games.service.spec.ts
git commit -m "feat(backend): getGameHistory servisi + günlük en ucuz gruplama (Faz 10)"
```

---

### Task 2: `getGamePrices`'a throttle'lı snapshot yazımı

**Files:**
- Modify: `backend/src/games/games.service.ts`
- Test: `backend/src/games/games.service.spec.ts` (Modify)

**Interfaces:**
- Consumes: Task 1'in `HISTORY_WINDOW_MS` deseni; mevcut `getGamePrices`.
- Produces: `getGamePrices` yan etkisi olarak throttle'lı `priceSnapshot.createMany` (davranış; imza değişmez).

- [ ] **Step 1: Failing test ekle** — `games.service.spec.ts`'e yeni describe:

```ts
describe('GamesService.getGamePrices snapshot throttle', () => {
  let prisma: any;
  let itad: any;
  let service: GamesService;

  beforeEach(() => {
    prisma = {
      game: { upsert: jest.fn().mockResolvedValue({ id: 'g1', itadId: 'itad-1' }), findUnique: jest.fn() },
      priceSnapshot: { findFirst: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const cache = { get: jest.fn().mockReturnValue(undefined), set: jest.fn() };
    itad = {
      getGameInfo: jest.fn().mockResolvedValue({ id: 'itad-1', title: 'X', slug: 'x', cover: null }),
      getPrices: jest.fn().mockResolvedValue(
        new Map([['itad-1', [{ shopId: 61, shopName: 'Steam', price: 150, currency: 'TRY', regular: 300, cut: 50, url: 'http://s' }]]]),
      ),
      searchGames: jest.fn(),
    };
    service = new GamesService(itad as any, cache as any, prisma as any);
  });

  it('son snapshot yoksa createMany çağırır', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue(null);
    await service.getGamePrices('itad-1', 'TR');
    expect(prisma.priceSnapshot.createMany).toHaveBeenCalledTimes(1);
    const data = prisma.priceSnapshot.createMany.mock.calls[0][0].data;
    expect(data[0]).toMatchObject({ gameId: 'g1', store: 'Steam', price: 150, discount: 50, region: 'TR', url: 'http://s' });
  });

  it('son snapshot 12 saatten yeniyse createMany çağırmaz', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue({ fetchedAt: new Date(Date.now() - 60 * 60 * 1000) });
    await service.getGamePrices('itad-1', 'TR');
    expect(prisma.priceSnapshot.createMany).not.toHaveBeenCalled();
  });

  it('createMany reddedilse bile fiyat döndürür (best-effort)', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue(null);
    prisma.priceSnapshot.createMany.mockRejectedValue(new Error('db down'));
    const res = await service.getGamePrices('itad-1', 'TR');
    expect(res.prices.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test → FAIL**

Run: `cd backend && npm run test -- games.service`
Expected: FAIL (createMany çağrılmıyor / findFirst tanımsız yan etki).

- [ ] **Step 3: Implement** — `games.service.ts`. Sabit ekle:

```ts
const SNAPSHOT_THROTTLE_MS = 12 * 60 * 60 * 1000;
```

`getGamePrices` içinde `Game` upsert'ini değişkende yakala (mevcut `await this.prisma.game.upsert({...})` → `const game = await this.prisma.game.upsert({...})`). `const dealsMap = ...; const deals = ...;` satırlarından **sonra**, `cheapestIdx` hesabından önce ekle:

```ts
await this.maybeWriteSnapshot(game.id, country, deals);
```

Class içine yeni private metod:

```ts
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
    this.logger.warn(`Snapshot yazılamadı (${gameId}/${region}): ${(err as Error).message}`);
  }
}
```

`GamesService`'e logger ekle (henüz yoksa): sınıf başına `private readonly logger = new Logger(GamesService.name);` ve import'a `Logger` ekle (`import { Injectable, NotFoundException, Logger } from '@nestjs/common';`).

- [ ] **Step 4: Run test → PASS**

Run: `cd backend && npm run test -- games.service`
Expected: PASS (Task 1 + Task 2 testleri, toplam 6).

- [ ] **Step 5: Commit**

```bash
git add backend/src/games/games.service.ts backend/src/games/games.service.spec.ts
git commit -m "feat(backend): prices çağrısında throttle'lı snapshot yazımı (Faz 10)"
```

---

### Task 3: `GET /games/:itadId/history` controller endpoint

**Files:**
- Modify: `backend/src/games/games.controller.ts`

**Interfaces:**
- Consumes: `GamesService.getGameHistory` (Task 1), `PricesQueryDto`.

- [ ] **Step 1: Endpoint ekle** — `games.controller.ts`, `prices` metodundan sonra:

```ts
@Get(':itadId/history')
history(@Param('itadId') itadId: string, @Query() query: PricesQueryDto) {
  return this.games.getGameHistory(itadId, query.region);
}
```

- [ ] **Step 2: Derleme/testler geçiyor mu** — Run: `cd backend && npm run test && npm run build`
Expected: PASS + build temiz.

- [ ] **Step 3: Commit**

```bash
git add backend/src/games/games.controller.ts
git commit -m "feat(backend): GET /games/:itadId/history endpoint (Faz 10)"
```

---

### Task 4: Frontend API katmanı — `gamesApi.history`

**Files:**
- Modify: `frontend/lib/games-api.ts`
- Test: `frontend/lib/__tests__/games-api.test.ts`

**Interfaces:**
- Produces: `GameHistoryPoint`, `GameHistory`, `gamesApi.history(itadId: string, region: string): Promise<GameHistory>`.

- [ ] **Step 1: Failing test ekle** — mevcut `games-api.test.ts` desenine uygun (fetch mock'lu). Dosyadaki mevcut mock stilini izle; history için:

```ts
it('history doğru URL ile çağırır', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ region: 'TR', points: [] }),
  });
  vi.stubGlobal('fetch', mockFetch);

  await gamesApi.history('itad-1', 'TR');

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('/games/itad-1/history?region=TR'),
    expect.any(Object),
  );
});
```

> Not: mevcut test dosyasındaki fetch-mock kurulumunu (beforeEach/afterEach, `api` base URL) birebir izle; yukarıdaki assert onunla hizalanmalı.

- [ ] **Step 2: Run → FAIL**

Run: `cd frontend && npm run test -- games-api`
Expected: FAIL (`history is not a function`).

- [ ] **Step 3: Implement** — `games-api.ts` sonuna tipler + çağrı. `GamePrices` interface bloğundan sonra:

```ts
export interface GameHistoryPoint {
  date: string;
  price: number;
}

export interface GameHistory {
  region: string;
  points: GameHistoryPoint[];
}
```

`gamesApi` objesine `prices`'tan sonra:

```ts
history: (itadId: string, region: string) =>
  api<GameHistory>(
    `/games/${encodeURIComponent(itadId)}/history?region=${encodeURIComponent(region)}`,
  ),
```

- [ ] **Step 4: Run → PASS**

Run: `cd frontend && npm run test -- games-api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/games-api.ts frontend/lib/__tests__/games-api.test.ts
git commit -m "feat(frontend): gamesApi.history + tipler (Faz 10)"
```

---

### Task 5: `usePriceHistory` hook

**Files:**
- Create: `frontend/hooks/use-price-history.ts`

**Interfaces:**
- Consumes: `gamesApi.history` (Task 4).
- Produces: `usePriceHistory(itadId: string, region: string)` → `{ points: GameHistoryPoint[]; isPending: boolean; isError: boolean }`.

- [ ] **Step 1: Implement** — `hooks/use-price-history.ts`:

```ts
'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';

export function usePriceHistory(itadId: string, region: string) {
  const query = useQuery({
    queryKey: ['price-history', itadId, region],
    queryFn: () => gamesApi.history(itadId, region),
    placeholderData: keepPreviousData,
  });

  return {
    points: query.data?.points ?? [],
    isPending: query.isPending,
    isError: query.isError,
  };
}
```

- [ ] **Step 2: Typecheck** — Run: `cd frontend && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/use-price-history.ts
git commit -m "feat(frontend): usePriceHistory hook (Faz 10)"
```

---

### Task 6: `PriceHistoryChart` bileşeni + Recharts

**Files:**
- Modify: `frontend/package.json` (recharts)
- Create: `frontend/components/games/PriceHistoryChart.tsx`
- Test: `frontend/components/games/__tests__/PriceHistoryChart.test.tsx`

**Interfaces:**
- Consumes: `usePriceHistory` (Task 5), `formatPrice` (`lib/format`), `Skeleton` (`components/ui/skeleton`).
- Produces: `PriceHistoryChart({ itadId, region, currency }: { itadId: string; region: string; currency: string | null })`.

- [ ] **Step 1: Recharts kur**

Run: `cd frontend && npm install recharts`
Expected: package.json'a `recharts` eklenir.

- [ ] **Step 2: Failing test yaz** — `__tests__/PriceHistoryChart.test.tsx` (hook mock'lu, chart branch'i değil durum branch'leri):

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceHistoryChart } from '../PriceHistoryChart';

const mockHook = vi.fn();
vi.mock('@/hooks/use-price-history', () => ({
  usePriceHistory: (...args: unknown[]) => mockHook(...args),
}));

describe('PriceHistoryChart', () => {
  beforeEach(() => mockHook.mockReset());

  it('yeterli veri yoksa (0-1 nokta) boş durum mesajı', () => {
    mockHook.mockReturnValue({ points: [{ date: '2026-07-10', price: 100 }], isPending: false, isError: false });
    render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(screen.getByText(/yeterli veri/i)).toBeInTheDocument();
  });

  it('yüklenirken skeleton (status) gösterir', () => {
    mockHook.mockReturnValue({ points: [], isPending: true, isError: false });
    render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hata olduğunda hiçbir şey render etmez', () => {
    mockHook.mockReturnValue({ points: [], isPending: false, isError: true });
    const { container } = render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Run → FAIL**

Run: `cd frontend && npm run test -- PriceHistoryChart`
Expected: FAIL (bileşen yok).

- [ ] **Step 4: Implement** — `components/games/PriceHistoryChart.tsx`:

```tsx
'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatPrice } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  coral: '#ff5a3c',
  line: '#3a332c',
  muted: '#9a8f84',
  surface: '#211c18',
  bone: '#f2ebe3',
};

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

export function PriceHistoryChart({
  itadId,
  region,
  currency,
}: {
  itadId: string;
  region: string;
  currency: string | null;
}) {
  const { points, isPending, isError } = usePriceHistory(itadId, region);

  if (isError) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-muted-2">
        Fiyat geçmişi (son 90 gün)
      </h2>
      {isPending ? (
        <Skeleton className="h-56 w-full" />
      ) : points.length < 2 ? (
        <p className="font-mono text-sm text-muted-2">
          Fiyat geçmişi için yeterli veri henüz yok.
        </p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label="Fiyat geçmişi grafiği">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                stroke={COLORS.muted}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                minTickGap={24}
              />
              <YAxis
                stroke={COLORS.muted}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                width={64}
                tickFormatter={(v: number) => formatPrice(v, currency)}
              />
              <Tooltip
                contentStyle={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 8,
                  color: COLORS.bone,
                  fontSize: 12,
                }}
                labelFormatter={(label: string) => formatDay(label)}
                formatter={(value: number) => [formatPrice(value, currency), 'En ucuz']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={COLORS.coral}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run → PASS**

Run: `cd frontend && npm run test -- PriceHistoryChart`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components/games/PriceHistoryChart.tsx frontend/components/games/__tests__/PriceHistoryChart.test.tsx
git commit -m "feat(frontend): PriceHistoryChart + recharts (Faz 10)"
```

---

### Task 7: `GameDetail` entegrasyonu

**Files:**
- Modify: `frontend/app/oyun/[itadId]/GameDetail.tsx`

**Interfaces:**
- Consumes: `PriceHistoryChart` (Task 6).

- [ ] **Step 1: Import + yerleştir** — `GameDetail.tsx`. Import ekle:

```tsx
import { PriceHistoryChart } from '@/components/games/PriceHistoryChart';
```

`<PriceTable ... />` satırından hemen sonra, `<AlertForm ... />`'dan önce:

```tsx
<PriceHistoryChart itadId={itadId} region={region} currency={data.currency} />
```

- [ ] **Step 2: Testler + build** — Run: `cd frontend && npm run test && npm run build`
Expected: Tüm testler PASS, build temiz.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/oyun/[itadId]/GameDetail.tsx
git commit -m "feat(frontend): oyun detayına fiyat geçmişi grafiği (Faz 10)"
```

---

## Kapanış

- [ ] Backend + frontend tüm testler geçiyor (`cd backend && npm run test`; `cd frontend && npm run test`).
- [ ] `cd frontend && npm run build` temiz.
- [ ] `master`'a fast-forward merge, `faz-10-fiyat-gecmisi` branch'i sil.
- [ ] Hafızayı güncelle (`kelepir-faz-durumu`: Faz 10 tamam).
