# Kelepir Faz 9 — Favoriler + Alarmlar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giriş yapmış kullanıcının favori oyunlarını ve fiyat alarmlarını frontend'den uçtan uca yönetmesi — iki liste sayfası (`/favoriler`, `/alarmlarim`) + oyun detay sayfasında favori kalp butonu ve inline alarm kurma formu.

**Architecture:** Mevcut `lib/*-api.ts` + TanStack Query desenini izler. İki yeni API modülü (`favorites-api`, `alerts-api`) backend'in ham `game` yanıtını (`coverUrl`) frontend `SearchItem` şekline (`cover`) normalize eder. İki data hook (`useFavorites`, `useAlerts`) query + mutation'ları sarar, auth'a bağlı `enabled` ile tokensız istek atmaz. `components/library/` altında sunum bileşenleri; sayfalar ve `GameDetail` bunları bağlar. Yalnızca giriş yapmış kullanıcı; korumalı sayfalarda `AuthGate`, detay aksiyonlarında "önce giriş yap" ipucu.

**Tech Stack:** Next.js App Router (client components), TanStack Query v5, lucide-react (ikonlar), base-ui/shadcn (`ui/*`), Tailwind v4, Vitest + Testing Library. Yeni bağımlılık yok.

## Global Constraints

- **Yalnızca `frontend/`** — `backend/` değişmez. Backend Faz 4'te hazır, bu fazda dokunulmuyor.
- **Yeni bağımlılık yok** — `@tanstack/react-query`, `lucide-react`, `@base-ui/react` zaten kurulu.
- Tüm veri erişimi mevcut `api<T>()` helper'ı üzerinden (cookie-auth, `credentials: 'include'`).
- Backend sözleşmesi (değişmez):
  - Favoriler: `POST /favorites {itadId}` (201) · `GET /favorites` (200) · `DELETE /favorites/:id` (200). 409 dedup, 404 bilinmeyen/başkasının, 401 tokensız.
  - Alarmlar: `POST /alerts {itadId, targetPrice, region?}` (201) · `GET /alerts` (200) · `DELETE /alerts/:id` (200). 400 geçersiz `targetPrice`, defaults `region=TR`/`currency=TRY`/`isActive=true`.
  - Liste yanıtlarında `game` = ham Prisma Game (`{ id, itadId, title, slug, coverUrl }`); `targetPrice` **string** (Decimal).
- Bölge kodu 2 harfli ülke kodu (mevcut `RegionSelect`/`lib/regions.ts` deseni). Alarm bölgesi = detay sayfasında seçili bölge.
- Tasarım token'ları: `coral`, `savings`, `bone`, `muted-2`, `line`, `surface`, `surface-2`, `destructive`; `font-display` / `font-mono` / `font-body`.
- Git ve npm komutları `frontend/` dizininden çalıştırılır (repo bash cwd zaten `frontend/`). Plan yalnızca `frontend/` alt ağacını değiştirir → `git add .` güvenli.

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
frontend/
  lib/
    game-ref.ts                         (Create) toGameRef normalizer + GameRef tipi
    favorites-api.ts                    (Create) favoritesApi + Favorite tipi
    alerts-api.ts                       (Create) alertsApi + Alert tipi
    __tests__/favorites-api.test.ts     (Create)
    __tests__/alerts-api.test.ts        (Create)
  hooks/
    use-favorites.ts                    (Create) useFavorites()
    use-alerts.ts                       (Create) useAlerts()
    __tests__/use-favorites.test.tsx    (Create)
    __tests__/use-alerts.test.tsx       (Create)
  components/library/
    AuthGate.tsx                        (Create) "giriş yap" mesajı + link
    FavoriteButton.tsx                  (Create) detay sayfası kalp toggle
    AlertForm.tsx                       (Create) inline alarm formu
    FavoriteCard.tsx                    (Create) GameCard + "çıkar" overlay
    AlertRow.tsx                        (Create) alarm liste satırı
    __tests__/FavoriteButton.test.tsx   (Create)
    __tests__/AlertForm.test.tsx        (Create)
    __tests__/AlertRow.test.tsx         (Create)
  app/
    favoriler/page.tsx                  (Modify) placeholder → gerçek
    alarmlarim/page.tsx                 (Modify) placeholder → gerçek
    oyun/[itadId]/GameDetail.tsx        (Modify) FavoriteButton + AlertForm
    oyun/[itadId]/__tests__/GameDetail.test.tsx (Modify) child mock + assert
```

---

### Task 1: game-ref normalizer + Favorites API modülü

**Files:**
- Create: `frontend/lib/game-ref.ts`
- Create: `frontend/lib/favorites-api.ts`
- Test: `frontend/lib/__tests__/favorites-api.test.ts`

**Interfaces:**
- Consumes: `api` (`frontend/lib/api.ts`), `SearchItem` (`frontend/lib/games-api.ts`).
- Produces:
  - `GameRef` = `SearchItem` (alias) — `{ itadId, slug, title, cover: string | null }`
  - `toGameRef(raw: { itadId; slug; title; coverUrl: string | null }): GameRef`
  - `Favorite` = `{ id: string; createdAt: string; game: GameRef }`
  - `favoritesApi.list(): Promise<Favorite[]>`, `favoritesApi.add(itadId: string): Promise<unknown>`, `favoritesApi.remove(id: string): Promise<{ success: true }>`

- [ ] **Step 1: `game-ref.ts`'i oluştur**

Create `frontend/lib/game-ref.ts`:

```ts
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
```

- [ ] **Step 2: Failing favorites-api testini yaz**

Create `frontend/lib/__tests__/favorites-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { favoritesApi } from '../favorites-api';

describe('favoritesApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('list: coverUrl -> cover normalize eder', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'f1',
          createdAt: '2026-01-01T00:00:00.000Z',
          game: { id: 'g1', itadId: 'abc', slug: 'w3', title: 'W3', coverUrl: 'http://c/x.jpg' },
        },
      ],
    });
    const res = await favoritesApi.list();
    expect(res).toEqual([
      {
        id: 'f1',
        createdAt: '2026-01-01T00:00:00.000Z',
        game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: 'http://c/x.jpg' },
      },
    ]);
  });

  it('add: POST /favorites gövdesiyle itadId gönderir', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    await favoritesApi.add('abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/favorites');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ itadId: 'abc' });
  });

  it('remove: DELETE /favorites/:id atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    await favoritesApi.remove('f1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/favorites/f1');
    expect(init.method).toBe('DELETE');
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- favorites-api`
Expected: FAIL (`favorites-api` modülü yok → import hatası).

- [ ] **Step 4: `favorites-api.ts`'i yaz**

Create `frontend/lib/favorites-api.ts`:

```ts
import { api } from './api';
import { toGameRef, type GameRef } from './game-ref';

export interface Favorite {
  id: string;
  createdAt: string;
  game: GameRef;
}

interface RawFavorite {
  id: string;
  createdAt: string;
  game: { itadId: string; slug: string; title: string; coverUrl: string | null };
}

export const favoritesApi = {
  list: async (): Promise<Favorite[]> => {
    const rows = await api<RawFavorite[]>('/favorites');
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, game: toGameRef(r.game) }));
  },
  add: (itadId: string) => api<unknown>('/favorites', { method: 'POST', body: { itadId } }),
  remove: (id: string) =>
    api<{ success: true }>(`/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- favorites-api`
Expected: PASS (normalize, POST body, DELETE url).

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat(frontend): favorites-api + game-ref normalizer (Faz 9)"
```

---

### Task 2: Alerts API modülü

**Files:**
- Create: `frontend/lib/alerts-api.ts`
- Test: `frontend/lib/__tests__/alerts-api.test.ts`

**Interfaces:**
- Consumes: `api`, `toGameRef`/`GameRef` (Task 1).
- Produces:
  - `Alert` = `{ id: string; targetPrice: string; region: string; currency: string; isActive: boolean; createdAt: string; game: GameRef }`
  - `alertsApi.list(): Promise<Alert[]>`
  - `alertsApi.add(dto: { itadId: string; targetPrice: number; region: string }): Promise<unknown>`
  - `alertsApi.remove(id: string): Promise<{ success: true }>`

- [ ] **Step 1: Failing alerts-api testini yaz**

Create `frontend/lib/__tests__/alerts-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { alertsApi } from '../alerts-api';

describe('alertsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('list: targetPrice string kalır, game normalize edilir', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'a1',
          targetPrice: '149.99',
          region: 'TR',
          currency: 'TRY',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          game: { id: 'g1', itadId: 'abc', slug: 'w3', title: 'W3', coverUrl: null },
        },
      ],
    });
    const res = await alertsApi.list();
    expect(res[0].targetPrice).toBe('149.99');
    expect(res[0].game).toEqual({ itadId: 'abc', slug: 'w3', title: 'W3', cover: null });
  });

  it('add: POST /alerts gövdesiyle itadId + targetPrice + region gönderir', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    await alertsApi.add({ itadId: 'abc', targetPrice: 90, region: 'DE' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/alerts');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('remove: DELETE /alerts/:id atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    await alertsApi.remove('a1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/alerts/a1');
    expect(init.method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- alerts-api`
Expected: FAIL (`alerts-api` modülü yok).

- [ ] **Step 3: `alerts-api.ts`'i yaz**

Create `frontend/lib/alerts-api.ts`:

```ts
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
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- alerts-api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(frontend): alerts-api modülü (Faz 9)"
```

---

### Task 3: Data hooks (useFavorites + useAlerts)

**Files:**
- Create: `frontend/hooks/use-favorites.ts`
- Create: `frontend/hooks/use-alerts.ts`
- Test: `frontend/hooks/__tests__/use-favorites.test.tsx`
- Test: `frontend/hooks/__tests__/use-alerts.test.tsx`

**Interfaces:**
- Consumes: `favoritesApi` (Task 1), `alertsApi` (Task 2), `useAuth` (`frontend/context/auth-context.tsx`), TanStack Query.
- Produces:
  - `useFavorites()` → `{ favorites: Favorite[]; isLoading: boolean; isError: boolean; refetch: () => void; addFavorite: (itadId: string) => Promise<unknown>; removeFavorite: (id: string) => Promise<unknown>; isMutating: boolean }`
  - `useAlerts()` → `{ alerts: Alert[]; isLoading: boolean; isError: boolean; refetch: () => void; addAlert: (dto: { itadId: string; targetPrice: number; region: string }) => Promise<unknown>; removeAlert: (id: string) => Promise<unknown>; isMutating: boolean }`

- [ ] **Step 1: Failing useFavorites testini yaz**

Create `frontend/hooks/__tests__/use-favorites.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFavorites } from '../use-favorites';
import { favoritesApi, type Favorite } from '@/lib/favorites-api';

vi.mock('@/lib/favorites-api', () => ({
  favoritesApi: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' }, loading: false }),
}));

const fav: Favorite = {
  id: 'f1',
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: null },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFavorites', () => {
  beforeEach(() => vi.clearAllMocks());

  it('favori listesini getirir', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([fav]);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.favorites).toEqual([fav]);
  });

  it('addFavorite api.add çağırır', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([]);
    vi.mocked(favoritesApi.add).mockResolvedValue(undefined);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addFavorite('abc');
    });
    expect(favoritesApi.add).toHaveBeenCalledWith('abc');
  });

  it('removeFavorite api.remove çağırır', async () => {
    vi.mocked(favoritesApi.list).mockResolvedValue([fav]);
    vi.mocked(favoritesApi.remove).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeFavorite('f1');
    });
    expect(favoritesApi.remove).toHaveBeenCalledWith('f1');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- use-favorites`
Expected: FAIL (`use-favorites` yok).

- [ ] **Step 3: `use-favorites.ts`'i yaz**

Create `frontend/hooks/use-favorites.ts`:

```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/favorites-api';
import { useAuth } from '@/context/auth-context';

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.list,
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['favorites'] });

  const addMut = useMutation({
    mutationFn: (itadId: string) => favoritesApi.add(itadId),
    onSuccess: invalidate,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => favoritesApi.remove(id),
    onSuccess: invalidate,
  });

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addFavorite: (itadId: string) => addMut.mutateAsync(itadId),
    removeFavorite: (id: string) => removeMut.mutateAsync(id),
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- use-favorites`
Expected: PASS.

- [ ] **Step 5: Failing useAlerts testini yaz**

Create `frontend/hooks/__tests__/use-alerts.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlerts } from '../use-alerts';
import { alertsApi, type Alert } from '@/lib/alerts-api';

vi.mock('@/lib/alerts-api', () => ({
  alertsApi: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' }, loading: false }),
}));

const alert: Alert = {
  id: 'a1',
  targetPrice: '149.99',
  region: 'TR',
  currency: 'TRY',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: null },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAlerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alarm listesini getirir', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([alert]);
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual([alert]);
  });

  it('addAlert api.add çağırır', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([]);
    vi.mocked(alertsApi.add).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addAlert({ itadId: 'abc', targetPrice: 90, region: 'DE' });
    });
    expect(alertsApi.add).toHaveBeenCalledWith({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('removeAlert api.remove çağırır', async () => {
    vi.mocked(alertsApi.list).mockResolvedValue([alert]);
    vi.mocked(alertsApi.remove).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAlerts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeAlert('a1');
    });
    expect(alertsApi.remove).toHaveBeenCalledWith('a1');
  });
});
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- use-alerts`
Expected: FAIL (`use-alerts` yok).

- [ ] **Step 7: `use-alerts.ts`'i yaz**

Create `frontend/hooks/use-alerts.ts`:

```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/lib/alerts-api';
import { useAuth } from '@/context/auth-context';

export function useAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['alerts'] });

  const addMut = useMutation({
    mutationFn: (dto: { itadId: string; targetPrice: number; region: string }) =>
      alertsApi.add(dto),
    onSuccess: invalidate,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: invalidate,
  });

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addAlert: (dto: { itadId: string; targetPrice: number; region: string }) =>
      addMut.mutateAsync(dto),
    removeAlert: (id: string) => removeMut.mutateAsync(id),
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
```

- [ ] **Step 8: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- use-alerts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add . && git commit -m "feat(frontend): useFavorites + useAlerts data hook'ları (Faz 9)"
```

---

### Task 4: AuthGate + FavoriteButton

**Files:**
- Create: `frontend/components/library/AuthGate.tsx`
- Create: `frontend/components/library/FavoriteButton.tsx`
- Test: `frontend/components/library/__tests__/FavoriteButton.test.tsx`

**Interfaces:**
- Consumes: `useFavorites` (Task 3), `useAuth`, `Button` (`ui/button`), lucide `Heart`.
- Produces:
  - `AuthGate()` — parametresiz; "Bu sayfayı görmek için giriş yap." + `/giris` linki render eder.
  - `FavoriteButton({ itadId }: { itadId: string })` — kalp toggle; giriş yoksa tıklayınca inline "önce giriş yap" ipucu.

- [ ] **Step 1: `AuthGate.tsx`'i yaz** (test gerektirmeyen sunum bileşeni; FavoriteButton testinden önce oluştur)

Create `frontend/components/library/AuthGate.tsx`:

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export function AuthGate() {
  return (
    <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
      <p className="font-body text-sm text-muted-2">
        Bu sayfayı görmek için giriş yapmalısın.
      </p>
      <Link href="/giris" className={`${buttonVariants({ size: 'sm' })} mt-4`}>
        Giriş yap
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Failing FavoriteButton testini yaz**

Create `frontend/components/library/__tests__/FavoriteButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton } from '../FavoriteButton';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuth } from '@/context/auth-context';

vi.mock('@/hooks/use-favorites', () => ({ useFavorites: vi.fn() }));
vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));

const addFavorite = vi.fn().mockResolvedValue(undefined);
const removeFavorite = vi.fn().mockResolvedValue(undefined);

function mockFavorites(favorites: Array<{ id: string; game: { itadId: string } }>) {
  vi.mocked(useFavorites).mockReturnValue({
    favorites: favorites as never,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    addFavorite,
    removeFavorite,
    isMutating: false,
  });
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
  });

  it('favori değilken tıklayınca addFavorite çağırır', async () => {
    mockFavorites([]);
    render(<FavoriteButton itadId="abc" />);
    await userEvent.click(screen.getByRole('button'));
    expect(addFavorite).toHaveBeenCalledWith('abc');
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it('favoriyken aria-pressed true ve tıklayınca removeFavorite çağırır', async () => {
    mockFavorites([{ id: 'f1', game: { itadId: 'abc' } }]);
    render(<FavoriteButton itadId="abc" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(removeFavorite).toHaveBeenCalledWith('f1');
  });

  it('giriş yoksa tıklayınca giriş ipucu gösterir, mutasyon çağırmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    mockFavorites([]);
    render(<FavoriteButton itadId="abc" />);
    await userEvent.click(screen.getByRole('button'));
    expect(addFavorite).not.toHaveBeenCalled();
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- FavoriteButton`
Expected: FAIL (`FavoriteButton` yok).

- [ ] **Step 4: `FavoriteButton.tsx`'i yaz**

Create `frontend/components/library/FavoriteButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';

export function FavoriteButton({ itadId }: { itadId: string }) {
  const { user } = useAuth();
  const { favorites, addFavorite, removeFavorite, isMutating } = useFavorites();
  const [needLogin, setNeedLogin] = useState(false);

  const fav = favorites.find((f) => f.game.itadId === itadId);
  const isFav = Boolean(fav);

  async function onClick() {
    if (!user) {
      setNeedLogin(true);
      return;
    }
    if (fav) {
      await removeFavorite(fav.id);
    } else {
      await addFavorite(itadId);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={isFav ? 'secondary' : 'outline'}
        size="sm"
        aria-pressed={isFav}
        aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        disabled={isMutating}
        onClick={() => void onClick()}
      >
        <Heart className={isFav ? 'fill-coral text-coral' : ''} />
        {isFav ? 'Favoride' : 'Favorile'}
      </Button>
      {needLogin && (
        <p className="font-mono text-xs text-muted-2">
          Önce{' '}
          <Link href="/giris" className="text-coral hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- FavoriteButton`
Expected: PASS (add, remove + aria-pressed, login ipucu).

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat(frontend): AuthGate + FavoriteButton (Faz 9)"
```

---

### Task 5: AlertForm

**Files:**
- Create: `frontend/components/library/AlertForm.tsx`
- Test: `frontend/components/library/__tests__/AlertForm.test.tsx`

**Interfaces:**
- Consumes: `useAlerts` (Task 3), `useAuth`, `Button`, `Input` (`ui/input`), `ApiError` (`lib/api`).
- Produces: `AlertForm({ itadId, region, cheapestPrice }: { itadId: string; region: string; cheapestPrice?: number })` — inline form; başarıda "Alarm kuruldu" + `/alarmlarim` linki.
- Ön-dolu kuralı: `cheapestPrice > 0` ise `String(Math.max(1, Math.floor(cheapestPrice * 0.9)))`, aksi halde `''`.

- [ ] **Step 1: Failing AlertForm testini yaz**

Create `frontend/components/library/__tests__/AlertForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertForm } from '../AlertForm';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/context/auth-context';

vi.mock('@/hooks/use-alerts', () => ({ useAlerts: vi.fn() }));
vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));

const addAlert = vi.fn().mockResolvedValue(undefined);

function mockAlerts() {
  vi.mocked(useAlerts).mockReturnValue({
    alerts: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    addAlert,
    removeAlert: vi.fn(),
    isMutating: false,
  } as never);
}

describe('AlertForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlerts();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
  });

  it('cheapestPrice ile input ön-dolu gelir (%90 altı)', () => {
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={100} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(90);
  });

  it('submit addAlert çağırır (itadId, targetPrice, region)', async () => {
    render(<AlertForm itadId="abc" region="DE" cheapestPrice={100} />);
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).toHaveBeenCalledWith({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('geçersiz (0) fiyatta doğrulama hatası, addAlert çağrılmaz', async () => {
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={undefined} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).not.toHaveBeenCalled();
    expect(screen.getByText(/geçerli bir hedef fiyat/i)).toBeInTheDocument();
  });

  it('giriş yoksa tıklayınca giriş ipucu, addAlert çağrılmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={100} />);
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).not.toHaveBeenCalled();
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- AlertForm`
Expected: FAIL (`AlertForm` yok).

- [ ] **Step 3: `AlertForm.tsx`'i yaz**

Create `frontend/components/library/AlertForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';
import { ApiError } from '@/lib/api';

function suggest(cheapestPrice?: number): string {
  if (cheapestPrice && cheapestPrice > 0) {
    return String(Math.max(1, Math.floor(cheapestPrice * 0.9)));
  }
  return '';
}

export function AlertForm({
  itadId,
  region,
  cheapestPrice,
}: {
  itadId: string;
  region: string;
  cheapestPrice?: number;
}) {
  const { user } = useAuth();
  const { addAlert, isMutating } = useAlerts();
  const [price, setPrice] = useState(() => suggest(cheapestPrice));
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!user) {
      setNeedLogin(true);
      return;
    }
    const target = Number(price);
    if (!Number.isFinite(target) || target <= 0) {
      setError('Geçerli bir hedef fiyat gir.');
      return;
    }
    try {
      await addAlert({ itadId, targetPrice: target, region });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Alarm kurulamadı.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-bone">Fiyat alarmı kur</h2>
      <p className="mt-1 font-mono text-xs text-muted-2">
        {region} bölgesinde hedef fiyatın altına düşünce e-posta al.
      </p>
      <div className="mt-3 flex items-end gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          step="0.01"
          aria-label="Hedef fiyat"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-40"
        />
        <Button type="submit" size="sm" disabled={isMutating}>
          Alarm kur
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}
      {needLogin && (
        <p className="mt-2 font-mono text-xs text-muted-2">
          Önce{' '}
          <Link href="/giris" className="text-coral hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
      {done && (
        <p className="mt-2 font-mono text-xs text-savings">
          Alarm kuruldu.{' '}
          <Link href="/alarmlarim" className="text-coral hover:underline">
            Alarmlarım
          </Link>
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- AlertForm`
Expected: PASS (ön-dolu, submit, doğrulama, login ipucu).

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(frontend): AlertForm inline alarm kurma formu (Faz 9)"
```

---

### Task 6: FavoriteCard + AlertRow (liste sunum bileşenleri)

**Files:**
- Create: `frontend/components/library/FavoriteCard.tsx`
- Create: `frontend/components/library/AlertRow.tsx`
- Test: `frontend/components/library/__tests__/AlertRow.test.tsx`

**Interfaces:**
- Consumes: `GameCard` (`components/games/GameCard`), `SearchItem`, `Alert` (Task 2), `formatPrice` (`lib/format`), lucide `X`.
- Produces:
  - `FavoriteCard({ game, onRemove, removing }: { game: SearchItem; onRemove: () => void; removing?: boolean })` — GameCard + sağ üstte "çıkar" butonu (anchor'ın **kardeşi**, iç içe değil).
  - `AlertRow({ alert, onRemove, removing }: { alert: Alert; onRemove: () => void; removing?: boolean })` — oyun + hedef fiyat + bölge + aktif rozeti + sil.

- [ ] **Step 1: `FavoriteCard.tsx`'i yaz** (görsel sarmalayıcı; asıl davranış GameCard + onRemove callback)

Create `frontend/components/library/FavoriteCard.tsx`:

```tsx
'use client';

import { X } from 'lucide-react';
import { GameCard } from '@/components/games/GameCard';
import type { SearchItem } from '@/lib/games-api';

export function FavoriteCard({
  game,
  onRemove,
  removing,
}: {
  game: SearchItem;
  onRemove: () => void;
  removing?: boolean;
}) {
  return (
    <div className="relative">
      <GameCard item={game} />
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={`${game.title} favorilerden çıkar`}
        className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-muted-2 hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral disabled:opacity-50"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Failing AlertRow testini yaz**

Create `frontend/components/library/__tests__/AlertRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertRow } from '../AlertRow';
import type { Alert } from '@/lib/alerts-api';

const alert: Alert = {
  id: 'a1',
  targetPrice: '149.99',
  region: 'TR',
  currency: 'TRY',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null },
};

describe('AlertRow', () => {
  it('oyun başlığı, hedef fiyat ve bölgeyi gösterir', () => {
    render(<AlertRow alert={alert} onRemove={() => {}} />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByText(/149,99/)).toBeInTheDocument(); // tr-TR biçim
    expect(screen.getByText('TR')).toBeInTheDocument();
  });

  it('sil butonu onRemove çağırır', async () => {
    const onRemove = vi.fn();
    render(<AlertRow alert={alert} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /sil/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- AlertRow`
Expected: FAIL (`AlertRow` yok).

- [ ] **Step 4: `AlertRow.tsx`'i yaz**

Create `frontend/components/library/AlertRow.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { Alert } from '@/lib/alerts-api';
import { formatPrice, initialOf } from '@/lib/format';

export function AlertRow({
  alert,
  onRemove,
  removing,
}: {
  alert: Alert;
  onRemove: () => void;
  removing?: boolean;
}) {
  const { game } = alert;
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
      <Link href={`/oyun/${game.itadId}`} className="flex items-center gap-3 hover:text-coral">
        <span className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
          {game.cover ? (
            <img src={game.cover} alt={game.title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-sm font-bold text-muted-2">
              {initialOf(game.title)}
            </span>
          )}
        </span>
        <span className="font-body text-sm text-bone">{game.title}</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-muted-2">{alert.region}</span>
        {alert.isActive && (
          <span className="rounded bg-savings px-2 py-0.5 font-mono text-xs font-bold text-ink">
            aktif
          </span>
        )}
        <span className="font-mono text-sm tabular-nums text-bone">
          ≤ {formatPrice(Number(alert.targetPrice), alert.currency)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`${game.title} alarmını sil`}
          className="text-muted-2 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}
```

> Not: `formatPrice(149.99, 'TRY')` `tr-TR` biçiminde `₺149,99` (virgüllü) üretir — test `149,99` alt dizesini arar. Sil butonu `aria-label` "...alarmını sil" içerir → `name: /sil/i` eşleşir.

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- AlertRow`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat(frontend): FavoriteCard + AlertRow liste bileşenleri (Faz 9)"
```

---

### Task 7: Favoriler sayfası

**Files:**
- Modify: `frontend/app/favoriler/page.tsx`
- Test: `frontend/app/favoriler/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useFavorites` (Task 3), `AuthGate` (Task 4), `FavoriteCard` (Task 6), `Skeleton` (`ui/skeleton`).
- Produces: `FavorilerPage` default export (client component).

- [ ] **Step 1: Failing favoriler page testini yaz**

Create `frontend/app/favoriler/__tests__/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FavorilerPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';

vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/use-favorites', () => ({ useFavorites: vi.fn() }));

const baseFav = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isMutating: false,
};

describe('FavorilerPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('giriş yoksa AuthGate gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({ ...baseFav, favorites: [] } as never);
    render(<FavorilerPage />);
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });

  it('boş listede bilgilendirme gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({ ...baseFav, favorites: [] } as never);
    render(<FavorilerPage />);
    expect(screen.getByText(/henüz favori yok/i)).toBeInTheDocument();
  });

  it('favorileri gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useFavorites).mockReturnValue({
      ...baseFav,
      favorites: [
        { id: 'f1', createdAt: '', game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null } },
      ],
    } as never);
    render(<FavorilerPage />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- favoriler`
Expected: FAIL (placeholder sayfa AuthGate/liste içermez).

- [ ] **Step 3: `favoriler/page.tsx`'i yaz** (placeholder içeriğini tamamen değiştir)

Replace `frontend/app/favoriler/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { AuthGate } from '@/components/library/AuthGate';
import { FavoriteCard } from '@/components/library/FavoriteCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function FavorilerPage() {
  const { user, loading } = useAuth();
  const { favorites, isLoading, isError, refetch, removeFavorite, isMutating } = useFavorites();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Favoriler</h1>

      {loading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !user ? (
        <div className="mt-6">
          <AuthGate />
        </div>
      ) : isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 font-mono text-sm text-destructive">
          Favoriler yüklenemedi.{' '}
          <button type="button" onClick={() => refetch()} className="text-coral hover:underline">
            Tekrar dene
          </button>
        </p>
      ) : favorites.length === 0 ? (
        <p className="mt-6 font-mono text-sm text-muted-2">
          Henüz favori yok.{' '}
          <Link href="/" className="text-coral hover:underline">
            Bir oyun bul
          </Link>
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {favorites.map((f) => (
            <FavoriteCard
              key={f.id}
              game={f.game}
              removing={isMutating}
              onRemove={() => void removeFavorite(f.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- favoriler`
Expected: PASS (AuthGate, boş, dolu).

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(frontend): favoriler sayfası (liste + çıkar) (Faz 9)"
```

---

### Task 8: Alarmlarım sayfası

**Files:**
- Modify: `frontend/app/alarmlarim/page.tsx`
- Test: `frontend/app/alarmlarim/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useAlerts` (Task 3), `AuthGate` (Task 4), `AlertRow` (Task 6), `Skeleton`.
- Produces: `AlarmlarimPage` default export.

- [ ] **Step 1: Failing alarmlarim page testini yaz**

Create `frontend/app/alarmlarim/__tests__/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlarmlarimPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';

vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/use-alerts', () => ({ useAlerts: vi.fn() }));

const baseAlerts = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  addAlert: vi.fn(),
  removeAlert: vi.fn(),
  isMutating: false,
};

describe('AlarmlarimPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('giriş yoksa AuthGate gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({ ...baseAlerts, alerts: [] } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });

  it('boş listede bilgilendirme gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({ ...baseAlerts, alerts: [] } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByText(/henüz alarm yok/i)).toBeInTheDocument();
  });

  it('alarmları gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({
      ...baseAlerts,
      alerts: [
        {
          id: 'a1',
          targetPrice: '149.99',
          region: 'TR',
          currency: 'TRY',
          isActive: true,
          createdAt: '',
          game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null },
        },
      ],
    } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- alarmlarim`
Expected: FAIL (placeholder sayfa).

- [ ] **Step 3: `alarmlarim/page.tsx`'i yaz** (placeholder'ı tamamen değiştir)

Replace `frontend/app/alarmlarim/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';
import { AuthGate } from '@/components/library/AuthGate';
import { AlertRow } from '@/components/library/AlertRow';
import { Skeleton } from '@/components/ui/skeleton';

export default function AlarmlarimPage() {
  const { user, loading } = useAuth();
  const { alerts, isLoading, isError, refetch, removeAlert, isMutating } = useAlerts();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Alarmlarım</h1>

      {loading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !user ? (
        <div className="mt-6">
          <AuthGate />
        </div>
      ) : isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 font-mono text-sm text-destructive">
          Alarmlar yüklenemedi.{' '}
          <button type="button" onClick={() => refetch()} className="text-coral hover:underline">
            Tekrar dene
          </button>
        </p>
      ) : alerts.length === 0 ? (
        <p className="mt-6 font-mono text-sm text-muted-2">
          Henüz alarm yok.{' '}
          <Link href="/" className="text-coral hover:underline">
            Bir oyun bul
          </Link>
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              removing={isMutating}
              onRemove={() => void removeAlert(a.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- alarmlarim`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(frontend): alarmlarım sayfası (liste + sil) (Faz 9)"
```

---

### Task 9: GameDetail entegrasyonu (favori butonu + alarm formu)

**Files:**
- Modify: `frontend/app/oyun/[itadId]/GameDetail.tsx`
- Modify: `frontend/app/oyun/[itadId]/__tests__/GameDetail.test.tsx`

**Interfaces:**
- Consumes: `FavoriteButton` (Task 4), `AlertForm` (Task 5), mevcut `gamesApi`/`GameHeader`/`PriceTable`.
- Produces: (dışa yeni tip yok) — detay sayfasında favori + alarm aksiyonları görünür.

- [ ] **Step 1: GameDetail testini güncelle — child bileşenleri mock'la + görünürlük assert'i ekle**

`frontend/app/oyun/[itadId]/__tests__/GameDetail.test.tsx` — mevcut `vi.mock('@/lib/games-api', ...)` bloğundan sonra iki mock ekle ve başarı senaryosu testi ekle. Dosya başındaki mock'lara ekle:

```tsx
vi.mock('@/components/library/FavoriteButton', () => ({
  FavoriteButton: () => <div data-testid="favorite-button" />,
}));
vi.mock('@/components/library/AlertForm', () => ({
  AlertForm: () => <div data-testid="alert-form" />,
}));
```

Ve `describe('GameDetail', ...)` içine yeni test ekle (mevcut testler korunur):

```tsx
it('veri yüklendiğinde favori butonu ve alarm formunu gösterir', async () => {
  vi.mocked(gamesApi.prices).mockResolvedValue(validPrices);
  renderWithClient(<GameDetail itadId="abc" region="TR" />);
  expect(await screen.findByTestId('favorite-button')).toBeInTheDocument();
  expect(screen.getByTestId('alert-form')).toBeInTheDocument();
});
```

> Not: Child bileşenler mock'landığı için `useAuth`/`useFavorites`/`useAlerts` sağlayıcıları GameDetail testinde gerekmez; test veri durumlarına + bölge davranışına odaklı kalır.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test -- GameDetail`
Expected: FAIL (yeni test — `favorite-button` testid'i henüz render edilmiyor).

- [ ] **Step 3: `GameDetail.tsx`'i güncelle**

`frontend/app/oyun/[itadId]/GameDetail.tsx` — importları ve başarı `return` bloğunu güncelle.

Import satırlarına ekle (mevcut importların altına):

```tsx
import { FavoriteButton } from '@/components/library/FavoriteButton';
import { AlertForm } from '@/components/library/AlertForm';
```

Son `return` bloğunu (dosyanın en altındaki `isPending`/`isError` sonrası kısım) şununla değiştir:

```tsx
  const cheapest =
    data.prices.find((p) => p.isCheapest)?.price ?? data.prices[0]?.price;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <GameHeader
        title={data.game.title}
        cover={data.game.cover}
        region={region}
        onRegionChange={onRegionChange}
      />
      <div className="mt-4">
        <FavoriteButton itadId={itadId} />
      </div>
      <PriceTable prices={data.prices} currency={data.currency} />
      <AlertForm itadId={itadId} region={region} cheapestPrice={cheapest} />
    </main>
  );
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test -- GameDetail`
Expected: PASS (mevcut 404 + bölge testleri + yeni görünürlük testi).

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(frontend): oyun detayına favori butonu + alarm formu (Faz 9)"
```

---

### Task 10: Tam test + lint + doğrulama

**Files:** (yok — doğrulama görevi)

- [ ] **Step 1: Tüm frontend testlerini çalıştır**

Run: `npm test`
Expected: PASS — mevcut testler (api, format, games-api, GameCard, PriceTable, RegionSelect, SearchBox, SearchResults, GameDetail) + yeni testler (favorites-api, alerts-api, use-favorites, use-alerts, FavoriteButton, AlertForm, AlertRow, favoriler, alarmlarim). Çıktı temiz.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: temiz (hata yok). Uyarı çıkarsa düzelt.

- [ ] **Step 3: (Opsiyonel manuel doğrulama, backend çalışıyorsa)**

`docker compose up -d` + `cd backend && npm run start:dev` + `cd frontend && npm run dev` ile:
- Giriş yap → bir oyuna git → favorile (kalp dolu) → `/favoriler`'de görünür → çıkar.
- Aynı oyunda hedef fiyat gir → "Alarm kur" → `/alarmlarim`'da görünür → sil.
- Çıkış yap → `/favoriler`/`/alarmlarim` → AuthGate; oyun detayında favori/alarm → "önce giriş yap".

- [ ] **Step 4: Commit (varsa lint düzeltmeleri)**

```bash
git add . && git commit -m "chore(frontend): Faz 9 lint + test doğrulaması" || echo "değişiklik yok"
```

---

## Faz 9 Bitiş Kriteri (Definition of Done)

- `cd frontend && npm test` yeşil (tüm eski + yeni testler); `npm run lint` temiz.
- Giriş yapmış kullanıcı oyun detayında favoriye ekler/çıkarır; kalp durumu `/favoriler` ile tutarlı.
- `/favoriler` favorileri grid'de gösterir; "çıkar" anında listeden düşürür (invalidasyon).
- Oyun detayında alarm kurar (bölge sayfadan otomatik, fiyat en ucuzun ~%90'ıyla ön-dolu); `/alarmlarim`'da görünür; silinebilir.
- Giriş yapmamış kullanıcı korumalı sayfalarda `AuthGate`; detay aksiyonlarında "önce giriş yap" ipucu; mutasyon çağrılmaz.
- Yükleniyor / boş / hata durumları tüm yüzeylerde çalışır.
- Yalnızca `frontend/` değişti; yeni bağımlılık yok.

## Sonraki Faz

Faz 10 — Fiyat geçmişi grafiği: backend'e `PriceSnapshot` okuyan `history` endpoint'i + frontend'de Recharts ile detay sayfasında fiyat trendi.
