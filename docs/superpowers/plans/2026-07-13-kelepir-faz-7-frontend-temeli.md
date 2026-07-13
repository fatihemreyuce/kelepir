# Kelepir Faz 7 — Frontend Temeli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend'in temelini kurmak: Tailwind v4 + shadcn üzerinde **"Gece Pazarı"** görsel dili (tasarım token'ları), app shell (header/footer + kelepir-damgası imzası), backend'e kimlikli konuşan API client, auth context, giriş/kayıt sayfaları ve korumalı route'lar için Next middleware.

**Architecture:** Next.js 14 App Router. Tailwind **v4** (CSS-first config), shadcn/ui bileşenleri marka token'larıyla temalandırılır. API client `fetch` sarmalayıcısı (`credentials: 'include'` → Faz 6 httpOnly cookie'leri; base URL `NEXT_PUBLIC_API_URL`). `AuthProvider` `/auth/me` ile kullanıcıyı hydrate eder. Auth sayfaları Gece Pazarı dilini uygular. Next `middleware.ts` korumalı sayfalarda cookie varlığını kaba kontrol eder (gerçek doğrulama API'de).

**Tech Stack:** Next.js 14, Tailwind CSS **v4**, shadcn/ui (v4), next/font (Bricolage Grotesque + Hanken Grotesk + Space Mono), TanStack Query (Faz 1'den), Vitest + Testing Library.

## Global Constraints — Tasarım Token'ları (Gece Pazarı)

Tüm renk/tipografi kararları bu token'lardan türetilir:

- **Renk (hex):**
  - `--ink: #161311` (zemin, sıcak siyah) · `--surface: #211C18` (yüzey/kart) · `--surface-2: #2C2621` (raised)
  - `--bone: #F2EBE3` (birincil metin) · `--muted: #9A8F84` (ikincil metin) · `--line: #3A332C` (kenarlık)
  - `--coral: #FF5A3C` (MARKA/birincil aksan — "İNDİRİM etiketi") · `--coral-ink: #1A0E0A` (coral üstü metin)
  - `--savings: #2FBF71` (SADECE semantik: en ucuz / indirim)
- **Tipografi:**
  - Display: **Bricolage Grotesque** (`--font-display`) — başlıklar, marka
  - Body: **Hanken Grotesk** (`--font-body`) — UI metni (varsayılan)
  - Data/fiyat: **Space Mono** (`--font-mono`) — fiyat, %, ₺, mağaza verisi (tabular "fiş" sesi)
- **İmza:** **Kelepir damgası** — hafif eğik (~-4°), delikli die-cut fiyat etiketi; coral; indirim %'si / "EN UCUZ" taşır.
- **Kurallar:** coral cömert değil, vurgu için; yeşil yalnızca tasarruf/en-ucuz semantiği; radius yumuşak ama abartısız (`--radius: 0.625rem`).

## Global Constraints — Teknik

- Bu faz **yalnızca frontend** (`frontend/`) — `backend/` değişmez
- Tailwind **v4** (`@tailwindcss/postcss`); `tailwind.config.ts` kaldırılır (v4 auto-detect); `globals.css` `@import "tailwindcss"`
- App **koyu-öncelikli** (tek tema, v1'de light toggle yok); palet doğrudan `:root`'ta
- API base URL env: `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`); tüm istekler `credentials: 'include'`
- Türkçe route'lar: `/giris`, `/kayit`, `/favoriler`, `/alarmlarim`
- Yeni env `.env.local` (gitignore'da) + `.env.example` frontend'de
- Testler Vitest + Testing Library; build (`npm run build`) yeşil olmalı
- Quality floor: mobil responsive, görünür klavye focus, `prefers-reduced-motion` saygısı

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
frontend/
  postcss.config.mjs               (Modify) @tailwindcss/postcss
  package.json                     (Modify) tailwind v4, fontlar, shadcn deps
  tailwind.config.ts               (Delete) v4 auto-detect
  components.json                  (Modify/regen) shadcn v4
  app/
    globals.css                    (Modify) Gece Pazarı palet + shadcn token map + fontlar
    layout.tsx                     (Modify) fontlar + koyu tema + Providers + AuthProvider + shell
    page.tsx                       (Modify) temalı ana sayfa iskeleti
    providers.tsx                  (var) TanStack Query
    giris/page.tsx                 YENİ: giriş
    kayit/page.tsx                 YENİ: kayıt
    favoriler/page.tsx             YENİ: korumalı placeholder
    alarmlarim/page.tsx            YENİ: korumalı placeholder
    fonts.ts                       YENİ: next/font tanımları
  components/
    ui/                            shadcn bileşenleri (button, input, label, card)
    brand/
      KelepirStamp.tsx             İMZA: kelepir damgası
      Wordmark.tsx                 KELEPİR● logo
    layout/
      Header.tsx
      Footer.tsx
    auth/
      LoginForm.tsx
      RegisterForm.tsx
  lib/
    api.ts                         fetch sarmalayıcı (credentials:'include')
    auth-api.ts                    register/login/logout/me tipli çağrılar
    utils.ts                       shadcn cn()
  context/
    auth-context.tsx               AuthProvider + useAuth
  middleware.ts                    korumalı route cookie gate
  .env.local / .env.example        NEXT_PUBLIC_API_URL
  __tests__/                       render testleri
```

---

### Task 1: Tailwind v4 + Gece Pazarı token'ları + fontlar + shadcn

**Files:**
- Modify: `frontend/package.json`, `frontend/postcss.config.mjs`, `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/app/page.tsx`
- Delete: `frontend/tailwind.config.ts`
- Create: `frontend/app/fonts.ts`
- Modify/regen: `frontend/components.json`, `frontend/components/ui/*` (shadcn)
- Modify: `frontend/__tests__/page.test.tsx`

**Interfaces:**
- Produces: Tailwind v4 + Gece Pazarı token'ları (utility'ler: `bg-ink`, `text-bone`, `text-coral`, `bg-surface`, `text-savings`, `font-display`, `font-body`, `font-mono`); shadcn bileşenleri marka rengiyle temalı. Sonraki task'lar bu utility'leri kullanır.

- [ ] **Step 1: Tailwind v4'e yükselt**

Run (repo kökünde):
```bash
cd frontend && npm uninstall tailwindcss postcss autoprefixer && npm install tailwindcss @tailwindcss/postcss
```

- [ ] **Step 2: postcss.config.mjs'i v4'e çevir**

`frontend/postcss.config.mjs` içeriğini değiştir:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 3: Eski tailwind.config.ts'i sil**

Sil: `frontend/tailwind.config.ts` (v4 auto-detect; config dosyası gerekmiyor).

- [ ] **Step 4: Fontları tanımla (next/font)**

Create `frontend/app/fonts.ts`:

```typescript
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from 'next/font/google';

export const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const body = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});
```

- [ ] **Step 5: shadcn'i v4 için (yeniden) başlat**

Faz 1'deki yarım/v4-uyumsuz shadcn artefaktlarını temizleyip taze kur:
```bash
cd frontend && rm -f components.json && rm -rf components/ui
npx --yes shadcn@latest init --defaults --force
npx --yes shadcn@latest add button input label card
```
Expected: `components.json` (v4, `"config": ""`), `lib/utils.ts`, `components/ui/{button,input,label,card}.tsx` oluşur; `globals.css` shadcn token'larıyla güncellenir.

> Not: shadcn'in ürettiği `globals.css`'i bir sonraki adımda Gece Pazarı paletiyle DEĞİŞTİRECEĞİZ. shadcn `base-nova` default'ları taban; biz token değerlerini ezeceğiz.

- [ ] **Step 6: globals.css'i Gece Pazarı paletiyle yaz**

`frontend/app/globals.css` içeriğini AŞAĞIDAKİYLE DEĞİŞTİR (shadcn'in eklediği `@import` satırlarını KORU; token değerlerini bizimkiyle ez). Uygulama koyu-öncelikli olduğundan paleti doğrudan `:root`'a koyuyoruz:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* Gece Pazarı — koyu-öncelikli palet */
  --ink: #161311;
  --surface: #211c18;
  --surface-2: #2c2621;
  --bone: #f2ebe3;
  --muted: #9a8f84;
  --line: #3a332c;
  --coral: #ff5a3c;
  --coral-ink: #1a0e0a;
  --savings: #2fbf71;
  --radius: 0.625rem;

  /* shadcn token'larını Gece Pazarı'na bağla */
  --background: var(--ink);
  --foreground: var(--bone);
  --card: var(--surface);
  --card-foreground: var(--bone);
  --popover: var(--surface);
  --popover-foreground: var(--bone);
  --primary: var(--coral);
  --primary-foreground: var(--coral-ink);
  --secondary: var(--surface-2);
  --secondary-foreground: var(--bone);
  --muted-color: var(--surface-2);
  --muted-foreground: var(--muted);
  --accent: var(--surface-2);
  --accent-foreground: var(--bone);
  --destructive: #e5484d;
  --border: var(--line);
  --input: var(--line);
  --ring: var(--coral);
}

@theme inline {
  /* shadcn bileşen token'ları */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted-color);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Gece Pazarı marka utility'leri */
  --color-ink: var(--ink);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-bone: var(--bone);
  --color-muted-2: var(--muted);
  --color-line: var(--line);
  --color-coral: var(--coral);
  --color-savings: var(--savings);

  /* fontlar (next/font CSS değişkenleri) */
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);
  --font-sans: var(--font-body);

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

> Not: shadcn `base-nova` init'i `globals.css`'e ekstra token/`@layer` yazmış olabilir. Yukarıdaki dosya nihai hâldir — shadcn'in eklediklerini bununla değiştir, ama `@import 'tailwindcss'` ve `@import 'tw-animate-css'` satırlarını KORU. `button.tsx` vb. `bg-primary`/`text-primary-foreground` kullanır; primary=coral olduğu için otomatik markalanır.

- [ ] **Step 7: layout.tsx'i fontlar + koyu tema ile güncelle**

`frontend/app/layout.tsx` içeriğini değiştir:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { display, body, mono } from './fonts';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Kelepir — En ucuz oyun fiyatları',
  description: 'Oyunların mağaza fiyatlarını karşılaştır, kelepiri kaçırma.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-ink text-bone">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: page.tsx'i temalı iskelete çevir (geçici; Task 3-5 gerçek shell/pages ekler)**

`frontend/app/page.tsx` içeriğini değiştir:

```tsx
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
    </main>
  );
}
```

- [ ] **Step 9: page render testini güncelle + çalıştır**

`frontend/__tests__/page.test.tsx` zaten "Kelepir" başlığını kontrol ediyor (Faz 1). Değişmesi gerekmez; yine de çalıştır:

Run: `cd frontend && npm run test`
Expected: PASS (heading "Kelepir" hâlâ var).

- [ ] **Step 10: Build smoke kontrolü**

Run: `cd frontend && npm run build`
Expected: Build hatasız (Tailwind v4 + fontlar + shadcn derlenir).

- [ ] **Step 11: Commit**

```bash
git add frontend
git commit -m "feat(frontend): Tailwind v4 + Gece Pazarı token'ları + fontlar + shadcn (Faz 7)"
```

---

### Task 2: API client + env + auth API

**Files:**
- Create: `frontend/lib/api.ts`, `frontend/lib/auth-api.ts`
- Create: `frontend/.env.local`, `frontend/.env.example`
- Create: `frontend/lib/__tests__/api.test.ts`

**Interfaces:**
- Produces:
  - `api<T>(path: string, opts?: ApiOptions): Promise<T>` — base `NEXT_PUBLIC_API_URL`, `credentials: 'include'`, JSON, hata normalizasyonu (`ApiError { status, message }`)
  - `authApi`: `register(dto)`, `login(dto)`, `logout()`, `me()`, `refresh()` — tipli, cookie-tabanlı
  - tip `SessionUser = { id: string; email: string; createdAt: string }`

- [ ] **Step 1: Env dosyalarını oluştur**

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
Create `frontend/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
> `.env.local` create-next-app `.gitignore`'unda zaten (`.env*.local`). `.env.example` commit edilir.

- [ ] **Step 2: Failing api testini yaz**

Create `frontend/lib/__tests__/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../api';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('base URL + credentials:include ile çağırır ve JSON döner', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });

    const res = await api<{ hello: string }>('/games/search?q=x');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/search?q=x');
    expect(init.credentials).toBe('include');
    expect(res).toEqual({ hello: 'world' });
  });

  it('POST gövdesini JSON serialize eder ve Content-Type ekler', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await api('/auth/login', { method: 'POST', body: { email: 'a@b.co' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co' });
  });

  it('non-ok yanıtta ApiError fırlatır (status + mesaj)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Yetkisiz' }),
    });
    await expect(api('/auth/me')).rejects.toMatchObject({
      constructor: ApiError,
      status: 401,
      message: 'Yetkisiz',
    });
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd frontend && npm run test -- api`
Expected: FAIL (`api`/`ApiError` yok).

- [ ] **Step 4: api.ts'i yaz**

Create `frontend/lib/api.ts`:

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers,
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${baseUrl()}${path}`, init);

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      }
    } catch {
      // gövde JSON değilse varsayılan mesaj
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 5: auth-api.ts'i yaz**

Create `frontend/lib/auth-api.ts`:

```typescript
import { api } from './api';

export interface SessionUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  register: (dto: { email: string; password: string }) =>
    api<AuthResult>('/auth/register', { method: 'POST', body: dto }),
  login: (dto: { email: string; password: string }) =>
    api<AuthResult>('/auth/login', { method: 'POST', body: dto }),
  logout: () => api<{ success: true }>('/auth/logout', { method: 'POST' }),
  me: () => api<SessionUser>('/auth/me'),
  refresh: () => api<AuthResult>('/auth/refresh', { method: 'POST' }),
};
```

- [ ] **Step 6: Testi çalıştır, geçtiğini doğrula**

Run: `cd frontend && npm run test -- api`
Expected: PASS (3 test).

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat(frontend): API client (credentials:include) + auth API + env (Faz 7)"
```

---

### Task 3: Auth context + Kelepir damgası imzası + app shell

**Files:**
- Create: `frontend/context/auth-context.tsx`
- Create: `frontend/components/brand/KelepirStamp.tsx`, `frontend/components/brand/Wordmark.tsx`
- Create: `frontend/components/layout/Header.tsx`, `frontend/components/layout/Footer.tsx`
- Modify: `frontend/app/layout.tsx` (AuthProvider + Header/Footer)
- Create: `frontend/__tests__/kelepir-stamp.test.tsx`, `frontend/__tests__/header.test.tsx`

**Interfaces:**
- Consumes: `authApi`, `SessionUser`.
- Produces:
  - `AuthProvider` + `useAuth(): { user: SessionUser | null; loading: boolean; login; register; logout; refreshUser }`
  - `<KelepirStamp discount={number} price?={string} label?={string} />` — imza die-cut etiket
  - `<Wordmark />`, `<Header />`, `<Footer />` (auth-aware)

- [ ] **Step 1: auth-context.tsx'i yaz**

Create `frontend/context/auth-context.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, SessionUser } from '@/lib/auth-api';
import { ApiError } from '@/lib/api';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser({ ...res.user, createdAt: new Date(0).toISOString() });
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (email: string, password: string) => {
    const res = await authApi.register({ email, password });
    setUser({ ...res.user, createdAt: new Date(0).toISOString() });
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 2: KelepirStamp imza bileşenini yaz**

Create `frontend/components/brand/KelepirStamp.tsx`:

```tsx
interface KelepirStampProps {
  discount: number; // ör. 70 -> "-%70"
  price?: string; // ör. "149,99 ₺"
  regular?: string; // üstü çizili
  label?: string; // varsayılan "EN UCUZ"
  className?: string;
}

export function KelepirStamp({
  discount,
  price,
  regular,
  label = 'EN UCUZ',
  className = '',
}: KelepirStampProps) {
  return (
    <div
      className={`relative inline-flex -rotate-3 flex-col rounded-lg border border-coral/40 bg-coral px-5 py-4 text-coral-ink shadow-lg ${className}`}
      role="img"
      aria-label={`${label}: yüzde ${discount} indirim${price ? `, ${price}` : ''}`}
    >
      {/* delik (die-cut) */}
      <span className="absolute -top-2 left-4 h-3 w-3 rounded-full bg-ink" aria-hidden />
      <span className="font-mono text-xs font-bold uppercase tracking-widest">
        {label}
      </span>
      <span className="mt-1 font-display text-3xl font-extrabold leading-none">
        -%{discount}
      </span>
      {price && (
        <span className="mt-2 font-mono text-sm">
          {regular && <s className="mr-2 text-coral-ink/60">{regular}</s>}
          <span className="font-bold">{price}</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wordmark'ı yaz**

Create `frontend/components/brand/Wordmark.tsx`:

```tsx
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-extrabold tracking-tight ${className}`}>
      KELEPİR
      <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-coral align-middle" aria-hidden />
    </span>
  );
}
```

- [ ] **Step 4: Header'ı yaz (auth-aware)**

Create `frontend/components/layout/Header.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Kelepir ana sayfa">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-3 font-body text-sm">
          {!loading && user ? (
            <>
              <Link href="/favoriler" className="text-muted-2 hover:text-bone">
                Favoriler
              </Link>
              <Link href="/alarmlarim" className="text-muted-2 hover:text-bone">
                Alarmlarım
              </Link>
              <Button variant="secondary" size="sm" onClick={() => void logout()}>
                Çıkış
              </Button>
            </>
          ) : (
            !loading && (
              <>
                <Link href="/giris" className="text-muted-2 hover:text-bone">
                  Giriş
                </Link>
                <Button asChild size="sm">
                  <Link href="/kayit">Kayıt ol</Link>
                </Button>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Footer'ı yaz**

Create `frontend/components/layout/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-8 font-mono text-xs text-muted-2">
        Kelepir — en ucuzu bul, kaçırma. · Fiyatlar IsThereAnyDeal üzerinden.
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: layout.tsx'e AuthProvider + Header/Footer ekle**

`frontend/app/layout.tsx`'te `<Providers>` içeriğini sar:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { display, body, mono } from './fonts';
import { Providers } from './providers';
import { AuthProvider } from '@/context/auth-context';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Kelepir — En ucuz oyun fiyatları',
  description: 'Oyunların mağaza fiyatlarını karşılaştır, kelepiri kaçırma.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink text-bone">
        <Providers>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Render testlerini yaz + çalıştır**

Create `frontend/__tests__/kelepir-stamp.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KelepirStamp } from '@/components/brand/KelepirStamp';

describe('KelepirStamp', () => {
  it('indirim ve fiyatı gösterir, erişilebilir etikete sahip', () => {
    render(<KelepirStamp discount={70} price="149,99 ₺" regular="499,99 ₺" />);
    expect(screen.getByText('-%70')).toBeInTheDocument();
    expect(screen.getByText('149,99 ₺')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /yüzde 70 indirim/i })).toBeInTheDocument();
  });
});
```

Create `frontend/__tests__/header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '@/components/layout/Header';

// useAuth'u mock'la (giriş yapmamış durum)
vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn() }),
}));

describe('Header', () => {
  it('giriş yapmamışken Giriş + Kayıt gösterir', () => {
    render(<Header />);
    expect(screen.getByText('Giriş')).toBeInTheDocument();
    expect(screen.getByText('Kayıt ol')).toBeInTheDocument();
  });
});
```

Run: `cd frontend && npm run test`
Expected: PASS (stamp + header + page).

- [ ] **Step 8: Build kontrolü**

Run: `cd frontend && npm run build`
Expected: Build hatasız.

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "feat(frontend): auth context + Kelepir damgası imzası + app shell (Faz 7)"
```

---

### Task 4: Giriş + Kayıt sayfaları (Gece Pazarı)

**Files:**
- Create: `frontend/components/auth/LoginForm.tsx`, `frontend/components/auth/RegisterForm.tsx`
- Create: `frontend/app/giris/page.tsx`, `frontend/app/kayit/page.tsx`
- Create: `frontend/__tests__/login-form.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, shadcn `Button`/`Input`/`Label`, `KelepirStamp`, `ApiError`.
- Produces: `/giris` ve `/kayit` sayfaları — sol marka tezi + canlı kelepir damgası, sağ form; başarıda `/`'a yönlendirir; hata mesajı gösterir.

- [ ] **Step 1: LoginForm'u yaz**

Create `frontend/components/auth/LoginForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  return <CredentialForm mode="register" />;
}
export function LoginForm() {
  return <CredentialForm mode="login" />;
}

function CredentialForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Bir şeyler ters gitti, tekrar dene.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sen@ornek.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="En az 8 karakter"
        />
      </div>
      {error && (
        <p role="alert" className="font-mono text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Bir saniye…' : isLogin ? 'Giriş yap' : 'Kayıt ol'}
      </Button>
      <p className="text-center font-body text-sm text-muted-2">
        {isLogin ? (
          <>
            Hesabın yok mu?{' '}
            <Link href="/kayit" className="text-coral hover:underline">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten üye misin?{' '}
            <Link href="/giris" className="text-coral hover:underline">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
```

- [ ] **Step 2: RegisterForm'u ayrı dosyaya çıkar (temiz import)**

Create `frontend/components/auth/RegisterForm.tsx`:

```tsx
export { RegisterForm } from './LoginForm';
```

> Not: Ortak `CredentialForm` `LoginForm.tsx`'te; `RegisterForm` oradan re-export edilir. Böylece tek kaynak, iki isim.

- [ ] **Step 3: Ortak auth layout (marka tezi + damga) — giriş sayfası**

Create `frontend/app/giris/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthAside } from '@/components/auth/AuthAside';

export default function GirisPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <AuthAside />
      <div className="flex justify-center md:justify-start">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-display text-3xl font-extrabold">Giriş yap</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
```

Create `frontend/app/kayit/page.tsx`:

```tsx
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthAside } from '@/components/auth/AuthAside';

export default function KayitPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <AuthAside />
      <div className="flex justify-center md:justify-start">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-display text-3xl font-extrabold">Kayıt ol</h1>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: AuthAside (marka tezi + canlı damga)**

Create `frontend/components/auth/AuthAside.tsx`:

```tsx
import { KelepirStamp } from '@/components/brand/KelepirStamp';

export function AuthAside() {
  return (
    <aside className="hidden flex-col gap-8 md:flex">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-coral">
          gece pazarı
        </p>
        <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight">
          En ucuzu bul.
          <br />
          Kelepiri kaçırma.
        </h2>
        <p className="mt-4 max-w-sm text-muted-2">
          Steam, Epic, GOG ve fazlasında fiyatları karşılaştır. Hedef fiyata
          düşünce sana haber verelim.
        </p>
      </div>
      <KelepirStamp discount={70} price="149,99 ₺" regular="499,99 ₺" />
    </aside>
  );
}
```

- [ ] **Step 5: Failing login-form testini yaz**

Create `frontend/__tests__/login-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const loginMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ login: loginMock, register: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
  });

  it('alanları gösterir ve submit login çağırıp yönlendirir', async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-posta'), 'a@b.co');
    await user.type(screen.getByLabelText('Şifre'), 'supersecret1');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(loginMock).toHaveBeenCalledWith('a@b.co', 'supersecret1');
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 6: `@testing-library/user-event` kurulu mu, değilse kur**

Run: `cd frontend && npm ls @testing-library/user-event || npm install --save-dev @testing-library/user-event`

- [ ] **Step 7: Testi çalıştır, geçtiğini doğrula**

Run: `cd frontend && npm run test -- login-form`
Expected: PASS (alanlar + submit → login + push).

- [ ] **Step 8: Tüm testler + build**

Run: `cd frontend && npm run test && npm run build`
Expected: hepsi PASS, build hatasız.

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "feat(frontend): giriş + kayıt sayfaları (Gece Pazarı) (Faz 7)"
```

---

### Task 5: Next middleware (korumalı route'lar) + korumalı placeholder sayfalar

**Files:**
- Create: `frontend/middleware.ts`
- Create: `frontend/app/favoriler/page.tsx`, `frontend/app/alarmlarim/page.tsx`
- Create: `frontend/__tests__/middleware.test.ts`

**Interfaces:**
- Produces: `/favoriler` ve `/alarmlarim` middleware ile korunur — `refresh_token` cookie yoksa `/giris`'e yönlendirir. (Gerçek doğrulama API'de; middleware kaba cookie-varlık kapısı.)

- [ ] **Step 1: middleware.ts'i yaz**

Create `frontend/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/favoriler', '/alarmlarim'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }
  const hasSession = req.cookies.has('refresh_token');
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/giris';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/favoriler/:path*', '/alarmlarim/:path*'],
};
```

- [ ] **Step 2: Korumalı placeholder sayfaları yaz**

Create `frontend/app/favoriler/page.tsx`:

```tsx
export default function FavorilerPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Favoriler</h1>
      <p className="mt-3 font-mono text-sm text-muted-2">
        Takip ettiğin oyunlar yakında burada.
      </p>
    </main>
  );
}
```

Create `frontend/app/alarmlarim/page.tsx`:

```tsx
export default function AlarmlarimPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Alarmlarım</h1>
      <p className="mt-3 font-mono text-sm text-muted-2">
        Fiyat alarmların yakında burada.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Failing middleware testini yaz**

Create `frontend/__tests__/middleware.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

function reqFor(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(new URL(`http://localhost:3000${path}`), { headers });
}

describe('middleware', () => {
  it('cookie yoksa korumalı sayfa /giris\'e yönlenir', () => {
    const res = middleware(reqFor('/favoriler'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/giris');
  });

  it('refresh_token cookie varsa geçer', () => {
    const res = middleware(reqFor('/favoriler', 'refresh_token=abc'));
    // NextResponse.next() -> yönlendirme yok (status 200)
    expect(res.headers.get('location')).toBeNull();
  });

  it('korumasız sayfaya dokunmaz', () => {
    const res = middleware(reqFor('/'));
    expect(res.headers.get('location')).toBeNull();
  });
});
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `cd frontend && npm run test -- middleware`
Expected: PASS (yönlendirme / geçiş / dokunmama). (Test önce başarısız olacaksa middleware yoktur — TDD: yaz, çalıştır.)

> Not: middleware bu task'ta yazıldığı için test ilk çalıştırmada geçebilir; yine de RED'i görmek istersen testi middleware'den önce yazıp çalıştır.

- [ ] **Step 5: Tüm testler + build**

Run: `cd frontend && npm run test && npm run build`
Expected: hepsi PASS, build hatasız.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(frontend): korumalı route middleware + favoriler/alarmlarim placeholder (Faz 7)"
```

---

## Faz 7 Bitiş Kriteri (Definition of Done)

- `cd frontend && npm run test` → tüm render/unit testler geçer; `npm run build` hatasız
- Tailwind **v4** + Gece Pazarı token'ları devrede (bg-ink, text-coral, text-savings, font-display/body/mono); shadcn bileşenleri coral-primary ile temalı; eski v3/yarım shadcn artefaktları temizlendi
- API client `credentials: 'include'` + `NEXT_PUBLIC_API_URL`; auth API (register/login/logout/me/refresh)
- `AuthProvider` `/auth/me` ile hydrate; Header auth-aware (giriş/çıkış)
- `/giris` + `/kayit` Gece Pazarı dilinde (marka tezi + kelepir damgası + form), başarıda `/`'a yönlenir, hata gösterir
- Kelepir damgası imza bileşeni erişilebilir (`role="img"` + aria-label)
- `/favoriler` + `/alarmlarim` middleware ile korunur (cookie yoksa `/giris`)
- Quality floor: responsive, görünür focus, reduced-motion saygısı

## Sonraki Faz

Faz 8 — Arama + oyun detay (ana sayfa arama + sonuçlar; `oyun/[slug]` fiyat karşılaştırma + en ucuz kelepir damgası + bölge seçici; TanStack Query ile backend `/games/*`). Canlı ITAD verisi gerçek `ITAD_API_KEY` eklenince; o zamana kadar backend mock/placeholder. Deploy öncesi: sameSite/cross-site kararı + gövdeden refresh token çıkarma (Faz 6 notları).
