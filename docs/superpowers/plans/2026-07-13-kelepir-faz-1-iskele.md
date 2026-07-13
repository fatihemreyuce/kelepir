# Kelepir Faz 1 — İskele Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İki uygulamalı (Next.js frontend + NestJS backend) tek repo'yu ayağa kaldırmak; Docker Postgres, Prisma şeması + migration, backend health endpoint ve frontend ana iskeleti çalışır ve test edilir hâle getirmek.

**Architecture:** `frontend/` (Next.js 14 App Router) ve `backend/` (NestJS) tek git repo altında yan yana. Dev veritabanı `docker-compose.yml` içindeki Postgres. Backend Prisma ile Postgres'e bağlanır. Bu faz iş mantığı içermez — sadece çalışan, test edilebilir iskele üretir.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, TanStack Query, NestJS, Prisma, PostgreSQL 16 (Docker), Jest (backend e2e), Vitest + Testing Library (frontend).

## Global Constraints

- Node.js ≥ 20 (Next.js 14 + NestJS 10 gerektiriyor)
- Backend framework: NestJS 10, ORM: Prisma — Supabase/Redis/Vercel Cron YOK
- Auth kendi JWT'miz olacak (bu fazda değil, Faz 2) — bu fazda auth kodu yazılmaz
- DB dev: Docker Postgres; prod: Neon (bu fazda sadece dev)
- `.env` git'e girmez; her yeni env değişkeni aynı anda `.env.example`'a eklenir
- Frontend URL'leri Türkçe (`/oyun/[slug]` vb. — sonraki fazlar)
- Görsel dil: koyu zemin + yeşil "en ucuz" vurgusu (detay sonraki fazlar)
- DB kimlik: user `kelepir`, password `kelepir`, db `kelepir`, port `5432`
- `DATABASE_URL="postgresql://kelepir:kelepir@localhost:5432/kelepir?schema=public"`

---

## Dosya Yapısı (bu fazda oluşacak)

```
kelepir/
  docker-compose.yml            Postgres 16 servisi
  .env.example                  Kök örnek env (DATABASE_URL)
  README.md                     Kurulum talimatları (güncellenir)
  backend/
    src/
      app.module.ts
      main.ts
      health/
        health.controller.ts    GET /health -> {status:'ok'}
      prisma/
        prisma.service.ts       PrismaClient wrapper
        prisma.module.ts
    prisma/
      schema.prisma             5 model (User, Game, Favorite, PriceAlert, PriceSnapshot)
    test/
      health.e2e-spec.ts        health endpoint e2e testi
      prisma.e2e-spec.ts        DB bağlantı + User create/read testi
    .env                        DATABASE_URL (git'e girmez)
  frontend/
    app/
      layout.tsx                kök layout (koyu tema)
      page.tsx                  ana sayfa iskeleti
      providers.tsx             TanStack Query provider
    components/ui/              shadcn bileşenleri (init)
    __tests__/
      page.test.tsx             ana sayfa render testi
    vitest.config.ts
    vitest.setup.ts
```

---

### Task 1: Docker Postgres + kök env

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: Çalışan Postgres (`localhost:5432`, db `kelepir`), sonraki tasklar `DATABASE_URL` ile bağlanır.

- [ ] **Step 1: docker-compose.yml oluştur**

```yaml
services:
  db:
    image: postgres:16
    container_name: kelepir-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: kelepir
      POSTGRES_PASSWORD: kelepir
      POSTGRES_DB: kelepir
    ports:
      - "5432:5432"
    volumes:
      - kelepir-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kelepir"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  kelepir-pgdata:
```

- [ ] **Step 2: .env.example oluştur**

```
DATABASE_URL="postgresql://kelepir:kelepir@localhost:5432/kelepir?schema=public"
```

- [ ] **Step 3: README'ye kurulum notu ekle**

`README.md` içine ekle:

```markdown
# Kelepir — Oyun Fiyat Karşılaştırma Platformu

## Geliştirme Kurulumu
1. `docker compose up -d` — Postgres'i başlatır
2. `cd backend && npm install && npx prisma migrate dev`
3. `cd frontend && npm install`

Detay: `docs/superpowers/specs/2026-07-13-kelepir-design.md`
```

- [ ] **Step 4: Postgres'i başlat ve hazır olduğunu doğrula**

Run: `docker compose up -d && docker compose exec -T db pg_isready -U kelepir`
Expected: `/var/run/postgresql:5432 - accepting connections`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example README.md
git commit -m "chore: Docker Postgres + kök env (Faz 1)"
```

---

### Task 2: NestJS backend iskeleti + health endpoint

**Files:**
- Create: `backend/` (nest new çıktısı)
- Create: `backend/src/health/health.controller.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /health` → `{ status: 'ok' }`. Backend `main.ts` portu `3001` (frontend 3000 ile çakışmasın).

- [ ] **Step 1: NestJS projesini oluştur**

Run (kök `kelepir/` içinde):
```bash
npx --yes @nestjs/cli@10 new backend --package-manager npm --skip-git --strict
```
Expected: `backend/` klasörü oluşur, `npm install` biter.

- [ ] **Step 2: Portu 3001 yap**

`backend/src/main.ts` içindeki `await app.listen(process.env.PORT ?? 3000);` satırını değiştir:

```typescript
await app.listen(process.env.PORT ?? 3001);
```

- [ ] **Step 3: Health e2e testini yaz (failing)**

Create `backend/test/health.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> {status:"ok"}', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- health`
Expected: FAIL — `/health` 404 döner (controller yok).

- [ ] **Step 5: HealthController'ı yaz**

Create `backend/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 6: Controller'ı AppModule'e ekle**

`backend/src/app.module.ts` — `controllers` dizisine `HealthController` ekle ve import et:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- health`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): NestJS iskeleti + /health endpoint (Faz 1)"
```

---

### Task 3: Prisma + şema + migration + DB bağlantı testi

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/.env`
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/prisma.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 1'in Postgres'i, Task 2'nin AppModule'ü.
- Produces: `PrismaService` (injectable, `PrismaClient` genişletir), 5 tablo migrate edilmiş DB. Sonraki fazlar `PrismaService`'i inject eder.

- [ ] **Step 1: Prisma paketlerini kur**

Run: `cd backend && npm install prisma @prisma/client && npm install --save-dev @types/supertest`
(Not: supertest tipi Task 2 testinde de gerekebilir; burada garanti altına alınır.)

- [ ] **Step 2: Prisma'yı başlat**

Run: `cd backend && npx prisma init --datasource-provider postgresql`
Expected: `backend/prisma/schema.prisma` ve `backend/.env` oluşur.

- [ ] **Step 3: backend/.env içine DATABASE_URL yaz**

`backend/.env` içeriğini şununla değiştir:

```
DATABASE_URL="postgresql://kelepir:kelepir@localhost:5432/kelepir?schema=public"
```

- [ ] **Step 4: schema.prisma'yı yaz (5 model)**

`backend/prisma/schema.prisma` içeriğini değiştir:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String?
  googleId     String?      @unique
  createdAt    DateTime     @default(now())

  favorites    Favorite[]
  alerts       PriceAlert[]
}

model Game {
  id        String       @id @default(cuid())
  itadId    String       @unique
  title     String
  slug      String       @unique
  coverUrl  String?
  createdAt DateTime     @default(now())

  favorites Favorite[]
  alerts    PriceAlert[]
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  gameId    String
  user      User     @relation(fields: [userId], references: [id])
  game      Game     @relation(fields: [gameId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, gameId])
}

model PriceAlert {
  id          String    @id @default(cuid())
  userId      String
  gameId      String
  user        User      @relation(fields: [userId], references: [id])
  game        Game      @relation(fields: [gameId], references: [id])
  targetPrice Decimal
  currency    String    @default("TRY")
  region      String    @default("TR")
  isActive    Boolean   @default(true)
  triggeredAt DateTime?
  createdAt   DateTime  @default(now())
}

model PriceSnapshot {
  id        String   @id @default(cuid())
  gameId    String
  store     String
  price     Decimal
  discount  Int
  region    String   @default("TR")
  url       String
  fetchedAt DateTime @default(now())

  @@index([gameId, fetchedAt])
}
```

- [ ] **Step 5: İlk migration'ı çalıştır**

Run: `cd backend && npx prisma migrate dev --name init`
Expected: `backend/prisma/migrations/*_init/` oluşur, "Your database is now in sync" mesajı.

- [ ] **Step 6: PrismaService'i yaz**

Create `backend/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 7: PrismaModule'ü yaz**

Create `backend/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 8: PrismaModule'ü AppModule'e ekle**

`backend/src/app.module.ts` `imports` dizisine `PrismaModule` ekle:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 9: DB bağlantı testini yaz (failing)**

Create `backend/test/prisma.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './../src/prisma/prisma.service';
import { PrismaModule } from './../src/prisma/prisma.module';

describe('Prisma (e2e)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@kelepir.dev' } });
    await prisma.$disconnect();
  });

  it('User kaydı oluşturup okuyabilir', async () => {
    const created = await prisma.user.create({
      data: { email: 'test@kelepir.dev', passwordHash: 'x' },
    });
    expect(created.id).toBeDefined();

    const found = await prisma.user.findUnique({
      where: { email: 'test@kelepir.dev' },
    });
    expect(found?.email).toBe('test@kelepir.dev');
  });
});
```

- [ ] **Step 10: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- prisma`
Expected: PASS (Postgres ayakta ve migrate edilmiş olmalı).

- [ ] **Step 11: Commit**

```bash
git add backend
git commit -m "feat(backend): Prisma şeması + 5 model + migration + DB testi (Faz 1)"
```

---

### Task 4: Next.js frontend iskeleti + TanStack Query + render testi

**Files:**
- Create: `frontend/` (create-next-app çıktısı)
- Create: `frontend/app/providers.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Create: `frontend/__tests__/page.test.tsx`
- Modify: `frontend/package.json` (test script)

**Interfaces:**
- Consumes: yok (bağımsız).
- Produces: Çalışan Next.js app (port 3000), TanStack Query provider sarılı, ana sayfada "Kelepir" başlığı.

- [ ] **Step 1: Next.js projesini oluştur**

Run (kök `kelepir/` içinde):
```bash
npx --yes create-next-app@14 frontend --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm
```
Expected: `frontend/` oluşur, bağımlılıklar kurulur.

- [ ] **Step 2: TanStack Query + shadcn bağımlılıklarını kur**

Run: `cd frontend && npm install @tanstack/react-query`
Run: `cd frontend && npx --yes shadcn@latest init -d`
Expected: `@tanstack/react-query` eklenir; shadcn `components.json` + `components/ui/` hazırlığı yapılır (varsayılanlar).

- [ ] **Step 3: Query provider'ı yaz**

Create `frontend/app/providers.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: layout.tsx'i koyu tema + provider ile güncelle**

`frontend/app/layout.tsx` içeriğini değiştir:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Kelepir — Oyun Fiyat Karşılaştırma',
  description: 'Oyunların mağaza fiyatlarını karşılaştır, fiyat alarmı kur.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Ana sayfa iskeletini yaz**

`frontend/app/page.tsx` içeriğini değiştir:

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold">Kelepir</h1>
      <p className="mt-2 text-zinc-400">
        Oyunların en ucuz fiyatını bul, fiyat alarmı kur.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Vitest'i kur**

Run: `cd frontend && npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`

- [ ] **Step 7: vitest config + setup yaz**

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Create `frontend/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: test script'ini ekle**

`frontend/package.json` `scripts` bölümüne ekle:

```json
"test": "vitest run"
```

- [ ] **Step 9: Ana sayfa render testini yaz (failing önce)**

Create `frontend/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('Kelepir başlığını gösterir', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Kelepir' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Testi çalıştır, geçtiğini doğrula**

Run: `cd frontend && npm run test`
Expected: PASS (page.tsx zaten Step 5'te yazıldı).

- [ ] **Step 11: Dev sunucu smoke kontrolü**

Run: `cd frontend && npm run build`
Expected: Build hatasız tamamlanır.

- [ ] **Step 12: Commit**

```bash
git add frontend
git commit -m "feat(frontend): Next.js iskeleti + TanStack Query + ana sayfa + render testi (Faz 1)"
```

---

## Faz 1 Bitiş Kriteri (Definition of Done)

- `docker compose up -d` ile Postgres ayakta
- `cd backend && npm run test:e2e` → health + prisma testleri geçer
- `cd frontend && npm run test` → render testi geçer, `npm run build` hatasız
- 4 commit atılmış, `.env` dosyaları git'te değil

## Sonraki Faz

Faz 2 — Auth çekirdeği (email/şifre kayıt-giriş, JWT, korumalı route). Planı Faz 1 tamamlanınca yazılacak.
