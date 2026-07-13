# Kelepir Faz 8 — Arama + Oyun Detay + Bölgesel Fiyat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürünün çekirdek değerini frontend'e getirmek — ana sayfada canlı (debounced) oyun arama, ve `/oyun/[itadId]` detayında kürasyonlu ülke seçici + karşılaştırmalı mağaza fiyat tablosu (en ucuz vurgulu).

**Architecture:** Next.js 14 App Router. Veri backend'in hazır `/games/*` endpoint'lerinden `lib/games-api.ts` (mevcut `authApi` deseni) üzerinden TanStack Query ile çekilir. Ana sayfada arama terimi `?q=` URL'ine yansır (`useSearchParams` + `router.replace`, Suspense sınırı içinde). Detay sayfası `itadId`'yi rota param'ından, bölgeyi server `searchParams` prop'undan alır (bölge değişimi `router.push` ile URL'e yazılır); böylece detayda ayrı Suspense sınırına gerek kalmaz. Backend'e **dokunulmaz**.

**Tech Stack:** Next.js 14 (App Router), Tailwind v4, TanStack Query v5, Vitest + Testing Library, `Intl.NumberFormat`. RegionSelect temalı native `<select>` (base-nova/@base-ui Select karmaşıklığından ve registry bağımlılığından kaçınmak için — brainstorm'da onaylı alanda).

## Global Constraints — Tasarım Token'ları (Gece Pazarı)

`app/globals.css`'te tanımlı; Tailwind utility'leri olarak hazır — yeniden tanımlama:

- **Marka utility'leri:** `bg-ink` (zemin), `bg-surface` / `bg-surface-2` (kart/raised), `text-bone` (birincil metin), `text-muted-2` (ikincil metin), `border-line`, `text-coral` / `bg-coral` (marka aksanı — indirim etiketi), `text-savings` / `bg-savings` (SADECE en-ucuz/tasarruf semantiği).
- **Font utility'leri:** `font-display` (Bricolage — başlık/marka), `font-body` (Hanken — varsayılan UI), `font-mono` (Space Mono — fiyat/%/₺/mağaza verisi).
- **Kurallar:** coral cömert değil, vurgu için; yeşil (`savings`) yalnızca en-ucuz/indirim; radius `--radius: 0.625rem` (`rounded-lg`/`rounded-xl`).
- **İmza:** en ucuz satır `--savings` yeşil vurgu + "en ucuz" rozeti taşır (Kelepir damgası ruhu).

## Global Constraints — Teknik

- Bu faz **yalnızca frontend** (`frontend/`) — `backend/` DEĞİŞMEZ.
- Backend endpoint'leri hazır ve sözleşmeleri sabit:
  - `GET /games/search?q=<str>` → `SearchItem[]`
  - `GET /games/:itadId/prices?region=<XX>` → `GamePrices` (region: 2 harfli ülke kodu, varsayılan `TR`)
- Tüm istekler mevcut `lib/api.ts` (`credentials:'include'`, `NEXT_PUBLIC_API_URL`) üzerinden; yeni hata altyapısı yok — `ApiError` aynen kullanılır.
- App **koyu-öncelikli**, tek tema. Türkçe rota: `/oyun/[itadId]`.
- Dış kapak URL'leri sade `<img loading="lazy">` ile (next/image domain config'i yok).
- Testler Vitest + Testing Library (`npm run test`), `npm run build` yeşil olmalı.
- Quality floor: mobil responsive, görünür klavye focus, `prefers-reduced-motion` (globals.css'te global olarak saygılı).
- Komutlar `frontend/` dizininde çalışır (repo kökünden `cd frontend`).

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
frontend/
  lib/
    games-api.ts               YENİ: gamesApi.search / gamesApi.prices + tipler
    format.ts                  YENİ: formatPrice(amount, currency)
    __tests__/
      games-api.test.ts        YENİ
      format.test.ts           YENİ
  hooks/
    use-debounce.ts            YENİ: useDebounce<T>(value, delayMs)
    __tests__/
      use-debounce.test.ts     YENİ
  components/
    ui/
      skeleton.tsx             YENİ: basit animate-pulse iskelet
    games/
      GameCard.tsx             YENİ: arama sonucu kartı
      SearchBox.tsx            YENİ: canlı arama inputu (?q= senkron)
      SearchResults.tsx        YENİ: durum makinesi (loading/empty/error/grid)
      RegionSelect.tsx         YENİ: temalı native <select>
      PriceTable.tsx           YENİ: karşılaştırmalı fiyat tablosu
      GameHeader.tsx           YENİ: kapak + başlık + RegionSelect
      __tests__/
        GameCard.test.tsx      YENİ
        SearchResults.test.tsx YENİ
        PriceTable.test.tsx    YENİ
        RegionSelect.test.tsx  YENİ
  lib/
    regions.ts                 YENİ: kürasyonlu ülke listesi
  app/
    page.tsx                   Modify: hero + <Suspense><HomeSearch/></Suspense>
    oyun/
      [itadId]/
        page.tsx               YENİ: server page → <GameDetail/>
        GameDetail.tsx         YENİ: client, useQuery(prices) + durumlar
```

---

### Task 1: Veri katmanı — tipler + gamesApi + formatPrice

**Files:**
- Create: `frontend/lib/games-api.ts`
- Create: `frontend/lib/format.ts`
- Create: `frontend/lib/__tests__/games-api.test.ts`
- Create: `frontend/lib/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `api` from `@/lib/api` (mevcut).
- Produces:
  - `SearchItem { itadId: string; slug: string; title: string; cover: string | null }`
  - `GamePriceRow { shopId: number; shopName: string; price: number; currency: string; regular: number; cut: number; url: string; isCheapest: boolean }`
  - `GamePrices { game: { itadId: string; slug: string; title: string; cover: string | null }; region: string; currency: string | null; prices: GamePriceRow[] }`
  - `gamesApi.search(q: string): Promise<SearchItem[]>`
  - `gamesApi.prices(itadId: string, region: string): Promise<GamePrices>`
  - `formatPrice(amount: number, currency: string | null): string`

- [ ] **Step 1: gamesApi testini yaz (fail eden)**

Create `frontend/lib/__tests__/games-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gamesApi } from '../games-api';

describe('gamesApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('search: q parametresini encode edip GET atar', async () => {
    await gamesApi.search('witcher 3');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/search?q=witcher%203');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('prices: itadId ve region ile GET atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await gamesApi.prices('abc123', 'US');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/abc123/prices?region=US');
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- games-api`
Expected: FAIL — `Cannot find module '../games-api'`.

- [ ] **Step 3: games-api.ts'i yaz (minimal)**

Create `frontend/lib/games-api.ts`:

```ts
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
    api<GamePrices>(`/games/${itadId}/prices?region=${region}`),
};
```

- [ ] **Step 4: gamesApi testini çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- games-api`
Expected: PASS (2 test).

- [ ] **Step 5: formatPrice testini yaz (fail eden)**

Create `frontend/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from '../format';

describe('formatPrice', () => {
  it('currency verilince para birimiyle formatlar', () => {
    // tr-TR locale: currency sembolü + değer; boşluk türleri değişebildiği için içeriği kontrol et
    const out = formatPrice(179.99, 'TRY');
    expect(out).toContain('179,99');
    expect(out).toMatch(/₺|TRY/);
  });

  it('USD formatlar', () => {
    const out = formatPrice(19.99, 'USD');
    expect(out).toContain('19,99');
    expect(out).toMatch(/\$|USD/);
  });

  it('currency null ise sade sayı döner (para simgesi yok)', () => {
    const out = formatPrice(50, null);
    expect(out).toBe('50,00');
  });
});
```

- [ ] **Step 6: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- format`
Expected: FAIL — `Cannot find module '../format'`.

- [ ] **Step 7: format.ts'i yaz (minimal)**

Create `frontend/lib/format.ts`:

```ts
const LOCALE = 'tr-TR';

export function formatPrice(amount: number, currency: string | null): string {
  if (!currency) {
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

- [ ] **Step 8: format testini çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- format`
Expected: PASS (3 test).

- [ ] **Step 9: Commit**

```bash
cd frontend && git add lib/games-api.ts lib/format.ts lib/__tests__/games-api.test.ts lib/__tests__/format.test.ts
git commit -m "feat(frontend): games API client + formatPrice (Faz 8)"
```

---

### Task 2: useDebounce hook

**Files:**
- Create: `frontend/hooks/use-debounce.ts`
- Create: `frontend/hooks/__tests__/use-debounce.test.ts`

**Interfaces:**
- Produces: `useDebounce<T>(value: T, delayMs: number): T` — `value` değişince `delayMs` sonra güncellenen gecikmeli değeri döner.

- [ ] **Step 1: Testi yaz (fail eden)**

Create `frontend/hooks/__tests__/use-debounce.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ilk render anlık değeri döner', () => {
    const { result } = renderHook(() => useDebounce('a', 300));
    expect(result.current).toBe('a');
  });

  it('gecikme dolmadan eski değeri, dolunca yeni değeri döner', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebounce(v, 300),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'ab' });
    expect(result.current).toBe('a'); // henüz gecikme dolmadı
    vi.advanceTimersByTime(300);
    expect(result.current).toBe('ab');
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- use-debounce`
Expected: FAIL — `Cannot find module '../use-debounce'`.

- [ ] **Step 3: Hook'u yaz (minimal)**

Create `frontend/hooks/use-debounce.ts`:

```ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- use-debounce`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add hooks/use-debounce.ts hooks/__tests__/use-debounce.test.ts
git commit -m "feat(frontend): useDebounce hook (Faz 8)"
```

---

### Task 3: Sunum atomları — Skeleton + GameCard

**Files:**
- Create: `frontend/components/ui/skeleton.tsx`
- Create: `frontend/components/games/GameCard.tsx`
- Create: `frontend/components/games/__tests__/GameCard.test.tsx`

**Interfaces:**
- Consumes: `SearchItem` from `@/lib/games-api`; `cn` from `@/lib/utils`.
- Produces:
  - `Skeleton(props: React.ComponentProps<'div'>)` — `animate-pulse` iskelet blok.
  - `GameCard({ item }: { item: SearchItem })` — `/oyun/[itadId]`'ye link kart; kapak yoksa baş harf fallback.

- [ ] **Step 1: Skeleton bileşenini yaz**

Create `frontend/components/ui/skeleton.tsx`:

```tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 2: GameCard testini yaz (fail eden)**

Create `frontend/components/games/__tests__/GameCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from '../GameCard';

const base = { itadId: 'abc', slug: 'the-witcher-3', title: 'The Witcher 3' };

describe('GameCard', () => {
  it("başlığı gösterir ve /oyun/[itadId] linkine yönlendirir", () => {
    render(<GameCard item={{ ...base, cover: 'http://img/x.jpg' }} />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/oyun/abc');
  });

  it('kapak varsa görseli, yoksa baş harf fallback gösterir', () => {
    const { rerender } = render(
      <GameCard item={{ ...base, cover: 'http://img/x.jpg' }} />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://img/x.jpg');

    rerender(<GameCard item={{ ...base, cover: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // "The" baş harfi
  });
});
```

- [ ] **Step 3: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- GameCard`
Expected: FAIL — `Cannot find module '../GameCard'`.

- [ ] **Step 4: GameCard'ı yaz (minimal)**

Create `frontend/components/games/GameCard.tsx`:

```tsx
import Link from 'next/link';
import type { SearchItem } from '@/lib/games-api';

export function GameCard({ item }: { item: SearchItem }) {
  const initial = item.title.trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/oyun/${item.itadId}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <div className="aspect-[3/4] w-full bg-surface-2">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-muted-2">
            {initial}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm font-semibold leading-snug text-bone">
          {item.title}
        </h3>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- GameCard`
Expected: PASS (2 test).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add components/ui/skeleton.tsx components/games/GameCard.tsx components/games/__tests__/GameCard.test.tsx
git commit -m "feat(frontend): Skeleton + GameCard atomları (Faz 8)"
```

---

### Task 4: Ana sayfa canlı arama — SearchBox + SearchResults + page.tsx

**Files:**
- Create: `frontend/components/games/SearchBox.tsx`
- Create: `frontend/components/games/SearchResults.tsx`
- Create: `frontend/components/games/__tests__/SearchResults.test.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useDebounce` (`@/hooks/use-debounce`), `gamesApi`/`SearchItem` (`@/lib/games-api`), `GameCard`, `Skeleton`, TanStack `useQuery`.
- Produces:
  - `SearchResults({ query }: { query: string })` — `query` (debounce edilmiş, trim'li terim) ile arama yapar; loading/empty/error/grid durumları.
  - `SearchBox()` — input + `?q=` senkronu; altına `<SearchResults query={debounced} />` render eder.

- [ ] **Step 1: SearchResults testini yaz (fail eden)**

Create `frontend/components/games/__tests__/SearchResults.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchResults } from '../SearchResults';
import { gamesApi } from '@/lib/games-api';

vi.mock('@/lib/games-api', () => ({
  gamesApi: { search: vi.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('SearchResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('2 karakterden kısa terimde istek atmaz ve boş kalır', () => {
    renderWithClient(<SearchResults query="a" />);
    expect(gamesApi.search).not.toHaveBeenCalled();
  });

  it('sonuç gelince kartları listeler', async () => {
    vi.mocked(gamesApi.search).mockResolvedValue([
      { itadId: 'x', slug: 'witcher', title: 'Witcher', cover: null },
    ]);
    renderWithClient(<SearchResults query="witcher" />);
    expect(await screen.findByText('Witcher')).toBeInTheDocument();
  });

  it('boş sonuçta "bulunamadı" mesajı gösterir', async () => {
    vi.mocked(gamesApi.search).mockResolvedValue([]);
    renderWithClient(<SearchResults query="zzzz" />);
    expect(await screen.findByText(/bulunamadı/i)).toBeInTheDocument();
  });

  it('hata durumunda hata mesajı gösterir', async () => {
    vi.mocked(gamesApi.search).mockRejectedValue(new Error('patladı'));
    renderWithClient(<SearchResults query="witcher" />);
    expect(await screen.findByText(/ters gitti/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- SearchResults`
Expected: FAIL — `Cannot find module '../SearchResults'`.

- [ ] **Step 3: SearchResults'ı yaz**

Create `frontend/components/games/SearchResults.tsx`:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { GameCard } from './GameCard';
import { Skeleton } from '@/components/ui/skeleton';

export function SearchResults({ query }: { query: string }) {
  const enabled = query.trim().length >= 2;
  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => gamesApi.search(query),
    enabled,
  });

  if (!enabled) {
    return null;
  }

  if (isPending || isFetching) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="mt-8 font-mono text-sm text-destructive">
        Bir şeyler ters gitti, birazdan tekrar dene.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="mt-8 font-mono text-sm text-muted-2">
        Bu isimde kelepir bulunamadı.
      </p>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {data.map((item) => (
        <GameCard key={item.itadId} item={item} />
      ))}
    </div>
  );
}
```

Not: `isPending && isFetching` yerine ikisini birlikte tutuyoruz ki bölge/terim değişiminde iskelet görünsün; `isPending` ilk yüklemeyi, `isFetching` sonraki refetch'leri kapsar.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- SearchResults`
Expected: PASS (4 test).

- [ ] **Step 5: SearchBox'ı yaz**

Create `frontend/components/games/SearchBox.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { SearchResults } from './SearchResults';

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounced = useDebounce(value, 300);

  function onChange(next: string) {
    setValue(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next.trim()) {
      params.set('q', next);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }

  return (
    <div className="mt-8">
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="oyun ara…"
        aria-label="Oyun ara"
        className="h-12 max-w-xl font-mono text-base"
      />
      <SearchResults query={debounced} />
    </div>
  );
}
```

- [ ] **Step 6: page.tsx'i güncelle (hero + Suspense'li SearchBox)**

Replace `frontend/app/page.tsx` içeriğini:

```tsx
import { Suspense } from 'react';
import { SearchBox } from '@/components/games/SearchBox';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-coral">
        gece pazarı açık
      </p>
      <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight">
        Kelepir
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-2">
        En ucuzu bul. Kelepiri kaçırma.
      </p>
      <Suspense fallback={null}>
        <SearchBox />
      </Suspense>
    </main>
  );
}
```

Not: `useSearchParams` Next 14'te Suspense sınırı gerektirir; `<Suspense>` sarmalı bunu karşılar (build hatası önlenir).

- [ ] **Step 7: Tüm testleri ve build'i çalıştır**

Run: `cd frontend && npm run test && npm run build`
Expected: Tüm testler PASS; build "Compiled successfully" (ana sayfa `useSearchParams` build hatası vermemeli).

- [ ] **Step 8: Commit**

```bash
cd frontend && git add components/games/SearchBox.tsx components/games/SearchResults.tsx components/games/__tests__/SearchResults.test.tsx app/page.tsx
git commit -m "feat(frontend): ana sayfa canlı arama + ?q= senkron (Faz 8)"
```

---

### Task 5: Detay bileşenleri — regions + RegionSelect + PriceTable

**Files:**
- Create: `frontend/lib/regions.ts`
- Create: `frontend/components/games/RegionSelect.tsx`
- Create: `frontend/components/games/PriceTable.tsx`
- Create: `frontend/components/games/__tests__/RegionSelect.test.tsx`
- Create: `frontend/components/games/__tests__/PriceTable.test.tsx`

**Interfaces:**
- Consumes: `GamePriceRow` (`@/lib/games-api`), `formatPrice` (`@/lib/format`), `cn` (`@/lib/utils`).
- Produces:
  - `REGIONS: { code: string; label: string }[]` (`@/lib/regions`).
  - `RegionSelect({ value, onChange }: { value: string; onChange: (code: string) => void })` — temalı native `<select>`.
  - `PriceTable({ prices, currency }: { prices: GamePriceRow[]; currency: string | null })` — satırlar, en ucuz vurgu, indirim etiketi, boş durum.

- [ ] **Step 1: Ülke listesini yaz**

Create `frontend/lib/regions.ts`:

```ts
export interface Region {
  code: string;
  label: string;
}

// Kürasyonlu popüler ülkeler (ITAD 2 harfli ülke kodu). Bayrak emoji label içinde.
export const REGIONS: Region[] = [
  { code: 'TR', label: '🇹🇷 Türkiye' },
  { code: 'US', label: '🇺🇸 Amerika' },
  { code: 'GB', label: '🇬🇧 Birleşik Krallık' },
  { code: 'DE', label: '🇩🇪 Almanya' },
  { code: 'FR', label: '🇫🇷 Fransa' },
  { code: 'PL', label: '🇵🇱 Polonya' },
  { code: 'CA', label: '🇨🇦 Kanada' },
  { code: 'AU', label: '🇦🇺 Avustralya' },
  { code: 'BR', label: '🇧🇷 Brezilya' },
  { code: 'RU', label: '🇷🇺 Rusya' },
  { code: 'JP', label: '🇯🇵 Japonya' },
  { code: 'NL', label: '🇳🇱 Hollanda' },
];

export const DEFAULT_REGION = 'TR';
```

- [ ] **Step 2: RegionSelect testini yaz (fail eden)**

Create `frontend/components/games/__tests__/RegionSelect.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegionSelect } from '../RegionSelect';

describe('RegionSelect', () => {
  it('mevcut değeri seçili gösterir', () => {
    render(<RegionSelect value="US" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('US');
  });

  it('değişince yeni ülke kodunu onChange ile verir', async () => {
    const onChange = vi.fn();
    render(<RegionSelect value="TR" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DE');
    expect(onChange).toHaveBeenCalledWith('DE');
  });
});
```

- [ ] **Step 3: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- RegionSelect`
Expected: FAIL — `Cannot find module '../RegionSelect'`.

- [ ] **Step 4: RegionSelect'i yaz (temalı native select)**

Create `frontend/components/games/RegionSelect.tsx`:

```tsx
'use client';

import { REGIONS } from '@/lib/regions';

export function RegionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <select
      aria-label="Bölge seç"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      {REGIONS.map((r) => (
        <option key={r.code} value={r.code} className="bg-surface text-bone">
          {r.label}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 5: RegionSelect testini çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- RegionSelect`
Expected: PASS (2 test).

- [ ] **Step 6: PriceTable testini yaz (fail eden)**

Create `frontend/components/games/__tests__/PriceTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceTable } from '../PriceTable';
import type { GamePriceRow } from '@/lib/games-api';

const rows: GamePriceRow[] = [
  { shopId: 1, shopName: 'Steam', price: 179, currency: 'TRY', regular: 359, cut: 50, url: 'http://steam', isCheapest: true },
  { shopId: 2, shopName: 'Epic', price: 219, currency: 'TRY', regular: 219, cut: 0, url: 'http://epic', isCheapest: false },
];

describe('PriceTable', () => {
  it('mağaza satırlarını ve mağazaya git linklerini gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText('Steam')).toBeInTheDocument();
    expect(screen.getByText('Epic')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /mağazaya git/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'http://steam');
  });

  it('en ucuz satırda "en ucuz" rozeti gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText(/en ucuz/i)).toBeInTheDocument();
  });

  it('indirim (cut>0) olan satırda yüzde etiketi gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText('-%50')).toBeInTheDocument();
  });

  it('fiyat yoksa boş durum mesajı gösterir', () => {
    render(<PriceTable prices={[]} currency={null} />);
    expect(screen.getByText(/bu bölgede fiyat bulunamadı/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Testi çalıştır, fail ettiğini gör**

Run: `cd frontend && npm run test -- PriceTable`
Expected: FAIL — `Cannot find module '../PriceTable'`.

- [ ] **Step 8: PriceTable'ı yaz**

Create `frontend/components/games/PriceTable.tsx`:

```tsx
import type { GamePriceRow } from '@/lib/games-api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PriceTable({
  prices,
  currency,
}: {
  prices: GamePriceRow[];
  currency: string | null;
}) {
  if (prices.length === 0) {
    return (
      <p className="mt-6 font-mono text-sm text-muted-2">
        Bu bölgede fiyat bulunamadı.
      </p>
    );
  }

  return (
    <ul className="mt-6 flex flex-col gap-2">
      {prices.map((row) => (
        <li
          key={row.shopId}
          className={cn(
            'flex items-center justify-between gap-4 rounded-lg border bg-surface px-4 py-3',
            row.isCheapest ? 'border-savings' : 'border-line',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-bone">{row.shopName}</span>
            {row.isCheapest && (
              <span className="rounded bg-savings px-2 py-0.5 font-mono text-xs font-bold text-ink">
                en ucuz
              </span>
            )}
            {row.cut > 0 && (
              <span className="rounded bg-coral px-2 py-0.5 font-mono text-xs font-bold text-coral-ink">
                -%{row.cut}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                row.isCheapest ? 'text-savings' : 'text-bone',
              )}
            >
              {formatPrice(row.price, currency ?? row.currency)}
            </span>
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-coral hover:underline"
            >
              Mağazaya git →
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 9: PriceTable testini çalıştır, geçtiğini gör**

Run: `cd frontend && npm run test -- PriceTable`
Expected: PASS (4 test).

- [ ] **Step 10: Commit**

```bash
cd frontend && git add lib/regions.ts components/games/RegionSelect.tsx components/games/PriceTable.tsx components/games/__tests__/RegionSelect.test.tsx components/games/__tests__/PriceTable.test.tsx
git commit -m "feat(frontend): bölge listesi + RegionSelect + PriceTable (Faz 8)"
```

---

### Task 6: Oyun detay sayfası — GameHeader + /oyun/[itadId]

**Files:**
- Create: `frontend/components/games/GameHeader.tsx`
- Create: `frontend/app/oyun/[itadId]/page.tsx`
- Create: `frontend/app/oyun/[itadId]/GameDetail.tsx`

**Interfaces:**
- Consumes: `gamesApi`/`GamePrices` (`@/lib/games-api`), `PriceTable`, `RegionSelect`, `Skeleton`, `DEFAULT_REGION` (`@/lib/regions`), TanStack `useQuery` + `keepPreviousData`, `useRouter` (`next/navigation`).
- Produces:
  - `GameHeader({ title, cover, region, onRegionChange }: { title: string; cover: string | null; region: string; onRegionChange: (code: string) => void })`.
  - `GameDetail({ itadId, region }: { itadId: string; region: string })` — client; fiyatları çeker, durumları yönetir.
  - Server `page.tsx` — `params.itadId` + `searchParams.region` (varsayılan `DEFAULT_REGION`) → `<GameDetail/>`.

- [ ] **Step 1: GameHeader'ı yaz**

Create `frontend/components/games/GameHeader.tsx`:

```tsx
import { RegionSelect } from './RegionSelect';

export function GameHeader({
  title,
  cover,
  region,
  onRegionChange,
}: {
  title: string;
  cover: string | null;
  region: string;
  onRegionChange: (code: string) => void;
}) {
  const initial = title.trim().charAt(0).toUpperCase();
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="h-24 w-18 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {cover ? (
            <img
              src={cover}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-muted-2">
              {initial}
            </div>
          )}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-bone">
          {title}
        </h1>
      </div>
      <RegionSelect value={region} onChange={onRegionChange} />
    </div>
  );
}
```

- [ ] **Step 2: GameDetail (client) bileşenini yaz**

Create `frontend/app/oyun/[itadId]/GameDetail.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gamesApi } from '@/lib/games-api';
import { ApiError } from '@/lib/api';
import { GameHeader } from '@/components/games/GameHeader';
import { PriceTable } from '@/components/games/PriceTable';
import { Skeleton } from '@/components/ui/skeleton';

export function GameDetail({
  itadId,
  region,
}: {
  itadId: string;
  region: string;
}) {
  const router = useRouter();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['prices', itadId, region],
    queryFn: () => gamesApi.prices(itadId, region),
    placeholderData: keepPreviousData,
  });

  function onRegionChange(code: string) {
    router.push(`/oyun/${itadId}?region=${code}`, { scroll: false });
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p role="alert" className="font-mono text-sm text-destructive">
          {notFound ? 'Oyun bulunamadı.' : 'Bir şeyler ters gitti, tekrar dene.'}
        </p>
        <Link href="/" className="mt-4 inline-block font-mono text-sm text-coral hover:underline">
          ← Aramaya dön
        </Link>
      </main>
    );
  }

  if (isPending) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="h-24 w-full" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <GameHeader
        title={data.game.title}
        cover={data.game.cover}
        region={region}
        onRegionChange={onRegionChange}
      />
      <PriceTable prices={data.prices} currency={data.currency} />
    </main>
  );
}
```

- [ ] **Step 3: Server page.tsx'i yaz**

Create `frontend/app/oyun/[itadId]/page.tsx`:

```tsx
import { GameDetail } from './GameDetail';
import { DEFAULT_REGION } from '@/lib/regions';

export default function GameDetailPage({
  params,
  searchParams,
}: {
  params: { itadId: string };
  searchParams: { region?: string };
}) {
  const region = searchParams.region ?? DEFAULT_REGION;
  return <GameDetail itadId={params.itadId} region={region} />;
}
```

- [ ] **Step 4: Tüm testleri ve build'i çalıştır**

Run: `cd frontend && npm run test && npm run build`
Expected: Tüm testler PASS; build "Compiled successfully"; `/oyun/[itadId]` dinamik rota derlenir.

- [ ] **Step 5: Manuel duman testi (backend ayakta ise)**

Backend + frontend çalışırken (`docker compose up -d`, backend `npm run start:dev`, frontend `npm run dev`):
- `/` → arama kutusuna "witcher" yaz → sonuç kartları belirir, URL `?q=witcher` olur.
- Bir karta tıkla → `/oyun/<itadId>` açılır, TR fiyat tablosu gelir.
- Bölge seçiciden "Almanya" seç → URL `?region=DE` olur, tablo yeniden yüklenir, en ucuz satır yeşil rozetli.

Not: Gerçek `ITAD_API_KEY` yoksa backend arama/fiyat boş/hata dönebilir; UI boş/hata durumlarını nazikçe göstermeli (regresyon yoksa geç).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add components/games/GameHeader.tsx app/oyun
git commit -m "feat(frontend): oyun detay sayfası + bölgesel fiyat tablosu (Faz 8)"
```

---

## Kapanış

Faz 8 tamamlandığında:
- Ana sayfada canlı arama + paylaşılabilir `?q=` URL.
- `/oyun/[itadId]` detayı: kürasyonlu ülke seçici + karşılaştırmalı fiyat tablosu (en ucuz vurgulu).
- Yeni veri katmanı (`games-api`, `format`), `useDebounce`, sunum bileşenleri; hepsi testli.
- `npm run test` ve `npm run build` yeşil.

**Sonraki fazlar:** Faz 9 (favoriler + alarmlar UI — detaya "favorile"/"alarm kur" aksiyonları, `/favoriler` + `/alarmlarim` CRUD), Faz 10 (fiyat geçmişi grafiği — backend'e `PriceSnapshot` okuyan endpoint + Recharts).
