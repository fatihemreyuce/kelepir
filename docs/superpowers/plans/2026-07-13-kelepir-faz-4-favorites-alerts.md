# Kelepir Faz 4 — Favoriler + Alarmlar CRUD Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giriş yapmış kullanıcının favori oyunlarını ve fiyat alarmlarını yönetmesi için korumalı CRUD endpoint'leri. Tamamen kendi DB'miz üstünde çalışır — ITAD'a bağımlı değildir.

**Architecture:** İki bağımsız NestJS modülü (`FavoritesModule`, `AlertsModule`), her ikisi de `JwtAuthGuard` ile korunur ve `@CurrentUser()` param decorator'ı ile kimliği doğrulanmış kullanıcıyı alır. Oyun referansı `itadId` ile; servis Game'i `PrismaService` üzerinden bulur, yoksa `NotFoundException` (404). Sahiplik zorlanır: kullanıcı yalnızca kendi kayıtlarını siler/görür.

**Tech Stack:** NestJS 10, Prisma 6, class-validator, Jest e2e + supertest. Yeni bağımlılık yok.

## Global Constraints

- Bu faz **yalnızca backend** (`backend/`) — `frontend/` değişmez
- NO Supabase, NO Redis, NO ITAD çağrısı (favoriler/alarmlar tamamen yerel DB)
- Tüm favori/alarm endpoint'leri **korumalı** (`JwtAuthGuard`); token yoksa **401**
- Oyun referansı `itadId` ile; Game DB'de yoksa **404** (`NotFoundException`)
- Sahiplik: kullanıcı yalnızca kendi favori/alarmını görür ve siler; başkasının kaydını silmeye çalışırsa **404** (varlığı sızdırmadan)
- HTTP kodları: oluşturma **201**, liste/silme başarı **200**, doğrulama hatası **400**, çakışan favori **409**
- `targetPrice` pozitif sayı; alarm `currency` default `TRY`, `region` default `TR`, `isActive` default `true`
- Global `ValidationPipe({ whitelist: true, transform: true })` zaten açık (Faz 2)
- Prisma 6.x, DB host 5433 değişmez; yeni migration yok (şema Faz 1'de hazır)

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
backend/
  src/
    auth/
      decorators/
        current-user.decorator.ts   @CurrentUser() -> req.user (AuthUser)
    favorites/
      favorites.module.ts
      favorites.service.ts
      favorites.controller.ts
      dto/create-favorite.dto.ts
    alerts/
      alerts.module.ts
      alerts.service.ts
      alerts.controller.ts
      dto/create-alert.dto.ts
    app.module.ts                    (Modify) FavoritesModule + AlertsModule
  test/
    favorites.e2e-spec.ts
    alerts.e2e-spec.ts
```

---

### Task 1: @CurrentUser decorator + Favoriler CRUD

**Files:**
- Create: `backend/src/auth/decorators/current-user.decorator.ts`
- Create: `backend/src/favorites/favorites.module.ts`, `favorites.service.ts`, `favorites.controller.ts`, `dto/create-favorite.dto.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/favorites.e2e-spec.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard` (Faz 2), `AuthUser` tipi (`src/auth/types/jwt-payload.ts`), `PrismaService` (global).
- Produces:
  - `@CurrentUser()` param decorator → `AuthUser` ({ userId, email }). Task 2 ve sonraki fazlar kullanır.
  - `FavoritesService.add(userId, itadId)`, `list(userId)`, `remove(userId, favoriteId)`
  - `POST /favorites` (201), `GET /favorites` (200), `DELETE /favorites/:id` (200) — hepsi korumalı
  - `FavoritesModule`

- [ ] **Step 1: @CurrentUser decorator'ı oluştur**

Create `backend/src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/jwt-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
```

- [ ] **Step 2: CreateFavoriteDto'yu oluştur**

Create `backend/src/favorites/dto/create-favorite.dto.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoriteDto {
  @IsString()
  @IsNotEmpty()
  itadId: string;
}
```

- [ ] **Step 3: Failing favorites e2e testini yaz**

Create `backend/test/favorites.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Favorites (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = 'fav-test@kelepir.dev';
  const email2 = 'fav-test2@kelepir.dev';
  const password = 'supersecret1';
  const itadId = 'fav-game-uuid';
  let token: string;
  let token2: string;
  let gameId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get(PrismaService);
    await app.init();

    // temizlik + seed
    await prisma.favorite.deleteMany({ where: { game: { itadId } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [email, email2] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    const game = await prisma.game.create({
      data: { itadId, title: 'Fav Game', slug: 'fav-game', coverUrl: null },
    });
    gameId = game.id;

    const reg = await request(app.getHttpServer())
      .post('/auth/register').send({ email, password }).expect(201);
    token = reg.body.accessToken;
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register').send({ email: email2, password }).expect(201);
    token2 = reg2.body.accessToken;
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany({ where: { gameId } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [email, email2] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    await app.close();
  });

  it('token olmadan POST /favorites 401', async () => {
    await request(app.getHttpServer())
      .post('/favorites').send({ itadId }).expect(401);
  });

  it('POST /favorites favori ekler (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId })
      .expect(201);
    expect(res.body.game.itadId).toBe(itadId);
  });

  it('aynı oyunu tekrar favorilemek 409', async () => {
    await request(app.getHttpServer())
      .post('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId })
      .expect(409);
  });

  it('bilinmeyen oyun 404', async () => {
    await request(app.getHttpServer())
      .post('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId: 'yok-uuid' })
      .expect(404);
  });

  it('GET /favorites kullanıcının favorilerini oyun bilgisiyle döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].game.title).toBe('Fav Game');
  });

  it('başka kullanıcı bu favoriyi silemez (404)', async () => {
    const list = await request(app.getHttpServer())
      .get('/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    const favId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/favorites/${favId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
  });

  it('sahibi favoriyi siler (200), sonra liste boş', async () => {
    const list = await request(app.getHttpServer())
      .get('/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    const favId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/favorites/${favId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- favorites`
Expected: FAIL (`/favorites` yok → 401 beklenen yerde 404, sonraki testler 404).

- [ ] **Step 5: FavoritesService'i yaz**

Create `backend/src/favorites/favorites.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveGameId(itadId: string): Promise<string> {
    const game = await this.prisma.game.findUnique({ where: { itadId } });
    if (!game) {
      throw new NotFoundException('Oyun bulunamadı');
    }
    return game.id;
  }

  async add(userId: string, itadId: string) {
    const gameId = await this.resolveGameId(itadId);
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (existing) {
      throw new ConflictException('Bu oyun zaten favorilerde');
    }
    return this.prisma.favorite.create({
      data: { userId, gameId },
      include: { game: true },
    });
  }

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, favoriteId: string): Promise<{ success: true }> {
    const result = await this.prisma.favorite.deleteMany({
      where: { id: favoriteId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Favori bulunamadı');
    }
    return { success: true };
  }
}
```

> Not: `favorite.findUnique({ where: { userId_gameId: ... } })` — Prisma bileşik unique alanı `@@unique([userId, gameId])`'den `userId_gameId` adını üretir (Faz 1 şemasında tanımlı). `remove` `deleteMany({ id, userId })` kullanır: başkasının kaydı eşleşmez → count 0 → 404 (sahiplik + var-yok tek sorguda, varlık sızdırmadan).

- [ ] **Step 6: FavoritesController'ı yaz**

Create `backend/src/favorites/favorites.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/jwt-payload';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: CreateFavoriteDto) {
    return this.favorites.add(user.userId, dto.itadId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.favorites.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favorites.remove(user.userId, id);
  }
}
```

- [ ] **Step 7: FavoritesModule'ü yaz**

Create `backend/src/favorites/favorites.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
```

- [ ] **Step 8: AppModule'e FavoritesModule ekle**

`backend/src/app.module.ts` `imports` dizisine `FavoritesModule` ekle (mevcut ConfigModule, PrismaModule, AuthModule, GamesModule, HealthController korunur):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { FavoritesModule } from './favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GamesModule,
    FavoritesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 9: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- favorites`
Expected: PASS (401, 201, 409, 404, list, ownership 404, delete + boş liste).

- [ ] **Step 10: Commit**

```bash
git add backend
git commit -m "feat(backend): @CurrentUser decorator + favoriler CRUD (korumalı) (Faz 4)"
```

---

### Task 2: Alarmlar CRUD

**Files:**
- Create: `backend/src/alerts/alerts.module.ts`, `alerts.service.ts`, `alerts.controller.ts`, `dto/create-alert.dto.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/alerts.e2e-spec.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`, `@CurrentUser()` (Task 1), `PrismaService`, `AuthUser`.
- Produces:
  - `AlertsService.add(userId, dto)`, `list(userId)`, `remove(userId, alertId)`
  - `POST /alerts` (201), `GET /alerts` (200), `DELETE /alerts/:id` (200) — korumalı
  - `AlertsModule`

- [ ] **Step 1: CreateAlertDto'yu oluştur**

Create `backend/src/alerts/dto/create-alert.dto.ts`:

```typescript
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  itadId: string;

  @IsNumber()
  @IsPositive()
  targetPrice: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  region?: string;
}
```

- [ ] **Step 2: Failing alerts e2e testini yaz**

Create `backend/test/alerts.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Alerts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = 'alert-test@kelepir.dev';
  const email2 = 'alert-test2@kelepir.dev';
  const password = 'supersecret1';
  const itadId = 'alert-game-uuid';
  let token: string;
  let token2: string;
  let gameId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get(PrismaService);
    await app.init();

    await prisma.priceAlert.deleteMany({ where: { game: { itadId } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [email, email2] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    const game = await prisma.game.create({
      data: { itadId, title: 'Alert Game', slug: 'alert-game', coverUrl: null },
    });
    gameId = game.id;

    const reg = await request(app.getHttpServer())
      .post('/auth/register').send({ email, password }).expect(201);
    token = reg.body.accessToken;
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register').send({ email: email2, password }).expect(201);
    token2 = reg2.body.accessToken;
  });

  afterAll(async () => {
    await prisma.priceAlert.deleteMany({ where: { gameId } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [email, email2] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    await app.close();
  });

  it('token olmadan POST /alerts 401', async () => {
    await request(app.getHttpServer())
      .post('/alerts').send({ itadId, targetPrice: 100 }).expect(401);
  });

  it('POST /alerts alarm kurar (201), default region TR / currency TRY / isActive true', async () => {
    const res = await request(app.getHttpServer())
      .post('/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId, targetPrice: 149.99 })
      .expect(201);
    expect(res.body.game.itadId).toBe(itadId);
    expect(res.body.targetPrice).toBe('149.99');
    expect(res.body.region).toBe('TR');
    expect(res.body.currency).toBe('TRY');
    expect(res.body.isActive).toBe(true);
  });

  it('geçersiz targetPrice (negatif) 400', async () => {
    await request(app.getHttpServer())
      .post('/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId, targetPrice: -5 })
      .expect(400);
  });

  it('bilinmeyen oyun 404', async () => {
    await request(app.getHttpServer())
      .post('/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ itadId: 'yok-uuid', targetPrice: 50 })
      .expect(404);
  });

  it('GET /alerts kullanıcının alarmlarını oyun bilgisiyle döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/alerts').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].game.title).toBe('Alert Game');
  });

  it('başka kullanıcı bu alarmı silemez (404)', async () => {
    const list = await request(app.getHttpServer())
      .get('/alerts').set('Authorization', `Bearer ${token}`).expect(200);
    const alertId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/alerts/${alertId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
  });

  it('sahibi alarmı siler (200)', async () => {
    const list = await request(app.getHttpServer())
      .get('/alerts').set('Authorization', `Bearer ${token}`).expect(200);
    const alertId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/alerts/${alertId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/alerts').set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body).toHaveLength(0);
  });
});
```

> Not: `targetPrice` Prisma `Decimal` olduğundan JSON yanıtında **string** olarak döner (`"149.99"`) — test buna göre yazıldı.

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- alerts`
Expected: FAIL (`/alerts` yok).

- [ ] **Step 4: AlertsService'i yaz**

Create `backend/src/alerts/alerts.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveGameId(itadId: string): Promise<string> {
    const game = await this.prisma.game.findUnique({ where: { itadId } });
    if (!game) {
      throw new NotFoundException('Oyun bulunamadı');
    }
    return game.id;
  }

  async add(userId: string, dto: CreateAlertDto) {
    const gameId = await this.resolveGameId(dto.itadId);
    return this.prisma.priceAlert.create({
      data: {
        userId,
        gameId,
        targetPrice: dto.targetPrice,
        region: dto.region ?? 'TR',
      },
      include: { game: true },
    });
  }

  async list(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, alertId: string): Promise<{ success: true }> {
    const result = await this.prisma.priceAlert.deleteMany({
      where: { id: alertId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Alarm bulunamadı');
    }
    return { success: true };
  }
}
```

> Not: `currency` ve `isActive` şemada default (`TRY` / `true`) olduğu için `create`'te belirtilmez; DB default'ları uygular.

- [ ] **Step 5: AlertsController'ı yaz**

Create `backend/src/alerts/alerts.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/jwt-payload';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertDto) {
    return this.alerts.add(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.alerts.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alerts.remove(user.userId, id);
  }
}
```

- [ ] **Step 6: AlertsModule'ü yaz**

Create `backend/src/alerts/alerts.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
```

- [ ] **Step 7: AppModule'e AlertsModule ekle**

`backend/src/app.module.ts` `imports` dizisine `AlertsModule` ekle (Task 1'deki FavoritesModule dahil mevcutları koru):

```typescript
import { AlertsModule } from './alerts/alerts.module';
```

`imports` dizisi (sıra):

```typescript
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GamesModule,
    FavoritesModule,
    AlertsModule,
  ],
```

- [ ] **Step 8: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- alerts`
Expected: PASS (401, 201 + default'lar, 400, 404, list, ownership 404, delete).

- [ ] **Step 9: Tüm backend testlerini bir kez çalıştır**

Run: `cd backend && npm run test:e2e && npm test`
Expected: e2e (health + auth + games + favorites + alerts) PASS; unit (itad.client + in-memory-cache) PASS; çıktı temiz.

- [ ] **Step 10: Commit**

```bash
git add backend
git commit -m "feat(backend): alarmlar CRUD (korumalı, targetPrice + region) (Faz 4)"
```

---

## Faz 4 Bitiş Kriteri (Definition of Done)

- `cd backend && npm run test:e2e` → health + auth + games + favorites + alerts e2e hepsi geçer; `npm test` → birim testleri geçer; çıktı temiz
- Favoriler: `POST/GET/DELETE /favorites` korumalı çalışır; dedup (409), bilinmeyen oyun (404), sahiplik (başkası silemez → 404)
- Alarmlar: `POST/GET/DELETE /alerts` korumalı çalışır; `targetPrice` doğrulama (400), default region TR / currency TRY / isActive true, sahiplik
- Token olmadan tüm uçlar 401; oyun DB'de yoksa 404; hiç ITAD çağrısı yok
- Yeni migration/bağımlılık yok

## Sonraki Faz

Faz 5 — Cron (fiyat kontrolü) + Resend e-posta + PriceSnapshot birikimi. Bu, aktif alarmları periyodik tarayıp hedefin altına düşince mail atar; ITAD fiyat verisini kullanır (gerçek key gerektirir — canlı çalışması için, ama mantık mock'la test edilir). Backend Faz 5 ile tamamlanır; sonra frontend fazları + ertelenen external-error hardening + shadcn/Tailwind kararı.
