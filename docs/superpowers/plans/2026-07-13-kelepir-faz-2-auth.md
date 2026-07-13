# Kelepir Faz 2 — Auth Çekirdeği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'de kendi JWT auth çekirdeğimizi kurmak: email/şifre kayıt-giriş, kısa ömürlü access token + DB'de saklanan (iptal edilebilir, rotation'lı) refresh token, `JwtAuthGuard` ile korunan `GET /auth/me`, ve tam e2e test kapsamı.

**Architecture:** NestJS `auth` modülü. Access token imzalı JWT (`@nestjs/jwt`, 15dk). Refresh token opak rastgele dizi; DB'de yalnızca SHA-256 hash'i (`RefreshToken` tablosu) saklanır, iptal (`revokedAt`) ve rotation destekli. Şifreler `bcryptjs` ile hash'lenir. DTO doğrulaması `class-validator` + global `ValidationPipe`. Bu faz yalnızca backend'dir — frontend'e dokunulmaz.

**Tech Stack:** NestJS 10, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs`, `class-validator`, `class-transformer`, Prisma 6, Jest e2e + supertest.

## Global Constraints

- Bu faz **yalnızca backend** (`backend/`) — `frontend/` değişmez
- ORM Prisma **6.x**, DB host portu **5433**, DATABASE_URL değişmez
- NO Supabase, NO Redis, NO Vercel Cron
- Şifre hash: **`bcryptjs`** (native `bcrypt` DEĞİL — Windows'ta node-gyp derleme sorununu önlemek için), cost factor **10**
- Access token: imzalı JWT, secret `JWT_ACCESS_SECRET` (env), ömür **15 dakika**, payload `{ sub: userId, email }`
- Refresh token: **opak** `crypto.randomBytes(32).toString('hex')`; DB'de yalnızca **SHA-256 hash** saklanır (`RefreshToken.tokenHash`), ömür **7 gün** (`REFRESH_EXPIRES_DAYS`), her `refresh`'te **rotation** (eski revoke + yeni üret), `logout`'ta revoke
- Endpoint'ler token'ları JSON gövdesinde döner (cookie yönetimi sonraki faza — frontend işi)
- Yeni env değişkeni eklenince **aynı anda** `backend/.env` ve `backend/.env.example`'a eklenir; `backend/.env` git'e girmez
- Global `ValidationPipe({ whitelist: true, transform: true })` açık
- HTTP durum kodları: kayıt başarı **201**, giriş/refresh başarı **200**, doğrulama hatası **400**, kimlik hatası **401**, çakışan email **409**

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
backend/
  prisma/
    schema.prisma                      RefreshToken modeli eklenir; User'a refreshTokens[] eklenir
    migrations/*_refresh_token/         yeni migration
  src/
    main.ts                            (Modify) global ValidationPipe
    app.module.ts                      (Modify) AuthModule eklenir; AppController/AppService kaldırılır
    app.controller.ts                  (Delete) Hello World scaffold
    app.service.ts                     (Delete)
    app.controller.spec.ts             (Delete)
    config/
      auth.config.ts                   env okuma yardımcıları (access secret, süreler)
    auth/
      auth.module.ts
      auth.controller.ts               register/login/refresh/logout/me
      auth.service.ts                  iş mantığı (bcrypt, token üretimi/rotation)
      dto/
        register.dto.ts
        login.dto.ts
        refresh.dto.ts
      strategies/
        jwt.strategy.ts                passport-jwt access doğrulama
      guards/
        jwt-auth.guard.ts              AuthGuard('jwt')
      types/
        jwt-payload.ts                 JwtPayload + AuthUser tipleri
  test/
    app.e2e-spec.ts                    (Delete) Hello World e2e
    auth.e2e-spec.ts                   tüm auth akışı e2e
  package.json                         (Modify) auth deps; prisma -> devDependencies
```

---

### Task 1: Backend temizlik + auth bağımlılıkları + config + global ValidationPipe

**Files:**
- Delete: `backend/src/app.controller.ts`, `backend/src/app.service.ts`, `backend/src/app.controller.spec.ts`, `backend/test/app.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`, `backend/src/main.ts`, `backend/package.json`
- Create: `backend/src/config/auth.config.ts`
- Modify: `backend/.env`, `backend/.env.example`

**Interfaces:**
- Consumes: Faz 1'in AppModule'ü (HealthController, PrismaModule).
- Produces: `authConfig()` helper (access secret + süreler), açık global ValidationPipe, kurulu auth kütüphaneleri. Hello World endpoint'i artık yok (`GET /` → 404).

- [ ] **Step 1: Auth bağımlılıklarını kur**

Run (repo kökünden):
```bash
cd backend && npm install @nestjs/jwt @nestjs/passport @nestjs/config passport passport-jwt bcryptjs class-validator class-transformer && npm install --save-dev @types/passport-jwt @types/bcryptjs
```

> `@nestjs/config` şart: Jest e2e çalışırken Nest `.env`'i otomatik yüklemez (Prisma kendi bağlantısı için yükler ama `process.env.JWT_ACCESS_SECRET` set olmaz). `ConfigModule.forRoot` bunu `backend/.env`'den yükler.

- [ ] **Step 2: `prisma` CLI'yi devDependencies'e taşı**

`backend/package.json` içinde `"prisma": "^6.x"` satırını `dependencies`'ten `devDependencies`'e taşı (`@prisma/client` `dependencies`'te KALIR). Sonra doğrula:

Run: `cd backend && npm install && npx prisma -v`
Expected: Prisma CLI 6.x sürümü yazar (hata yok).

- [ ] **Step 3: Hello World scaffold dosyalarını sil**

Sil: `backend/src/app.controller.ts`, `backend/src/app.service.ts`, `backend/src/app.controller.spec.ts`, `backend/test/app.e2e-spec.ts`.

- [ ] **Step 4: AppModule'ü güncelle (AppController/AppService kaldır, ConfigModule ekle)**

`backend/src/app.module.ts` içeriğini AŞAĞIDAKİYLE DEĞİŞTİR. Bu task'ta `AuthModule` HENÜZ YOK (Task 3'te eklenecek); `AppController`/`AppService` referansları kaldırılır; `ConfigModule` global olarak eklenir (env yükleme için):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```

> `ConfigModule.forRoot()` import anında `backend/.env`'i `process.env`'e yükler; böylece Task 3+'da `authConfig()` (JWT_ACCESS_SECRET) hem runtime'da hem Jest e2e'de değerleri bulur.

- [ ] **Step 5: Global ValidationPipe'ı aç**

`backend/src/main.ts` içeriğini değiştir:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 6: auth.config.ts oluştur**

Create `backend/src/config/auth.config.ts`:

```typescript
export interface AuthConfig {
  accessSecret: string;
  accessExpires: string;
  refreshExpiresDays: number;
}

export function authConfig(): AuthConfig {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not set');
  }
  return {
    accessSecret,
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresDays: Number(process.env.REFRESH_EXPIRES_DAYS ?? '7'),
  };
}
```

- [ ] **Step 7: Env değişkenlerini ekle (hem .env hem .env.example)**

`backend/.env` VE `backend/.env.example` sonuna EKLE (DATABASE_URL satırına dokunma):

`.env.example` (placeholder değerler):
```
JWT_ACCESS_SECRET="dev-access-secret-change-me"
JWT_ACCESS_EXPIRES="15m"
REFRESH_EXPIRES_DAYS="7"
```

`.env` (aynı satırlar — dev için placeholder yeterli):
```
JWT_ACCESS_SECRET="dev-access-secret-change-me"
JWT_ACCESS_EXPIRES="15m"
REFRESH_EXPIRES_DAYS="7"
```

- [ ] **Step 8: Health e2e hâlâ geçiyor mu doğrula**

Run: `cd backend && npm run test:e2e -- health`
Expected: PASS (health endpoint temizlikten etkilenmedi; Hello World e2e artık yok).

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "chore(backend): Hello World scaffold temizliği + auth bağımlılıkları + ValidationPipe (Faz 2)"
```

---

### Task 2: RefreshToken şeması + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/*_refresh_token/migration.sql` (generate ile)

**Interfaces:**
- Consumes: Faz 1'in `User` modeli, `PrismaService`.
- Produces: `RefreshToken` tablosu (userId FK, tokenHash unique, expiresAt, revokedAt?). `prisma.refreshToken` erişimi sonraki task'larda kullanılır.

- [ ] **Step 1: schema.prisma'ya RefreshToken modeli + User ilişkisi ekle**

`backend/prisma/schema.prisma` `User` modeline `refreshTokens RefreshToken[]` ilişki alanını ekle (mevcut alanları koru):

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String?
  googleId      String?        @unique
  createdAt     DateTime       @default(now())

  favorites     Favorite[]
  alerts        PriceAlert[]
  refreshTokens RefreshToken[]
}
```

Dosyanın sonuna yeni model ekle:

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}
```

- [ ] **Step 2: Postgres ayakta mı doğrula, sonra migration üret**

Run: `docker compose up -d && docker compose exec -T db pg_isready -U kelepir`
Expected: `accepting connections`

Run: `cd backend && npx prisma migrate dev --name refresh_token`
Expected: `backend/prisma/migrations/*_refresh_token/` oluşur, "Your database is now in sync".

- [ ] **Step 3: Migration'ın RefreshToken tablosunu ürettiğini doğrula**

Migration SQL'inde `CREATE TABLE "RefreshToken"`, `RefreshToken_tokenHash_key` unique index, `RefreshToken_userId_idx`, ve `RefreshToken_userId_fkey` FK bulunmalı. Gözle kontrol et.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma
git commit -m "feat(backend): RefreshToken şeması + migration (Faz 2)"
```

---

### Task 3: Auth service + register/login endpoint'leri + DTO'lar

**Files:**
- Create: `backend/src/auth/types/jwt-payload.ts`
- Create: `backend/src/auth/dto/register.dto.ts`, `login.dto.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts` (AuthModule ekle)
- Create: `backend/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `authConfig()`, `@nestjs/jwt`.
- Produces:
  - `AuthService.register(dto: RegisterDto): Promise<AuthResult>`
  - `AuthService.login(dto: LoginDto): Promise<AuthResult>`
  - `AuthService.issueTokens(user: { id: string; email: string }): Promise<AuthResult>`
  - tip `AuthResult = { user: { id: string; email: string }; accessToken: string; refreshToken: string }`
  - `POST /auth/register` (201), `POST /auth/login` (200)
  - `AuthModule` (exports `AuthService`)
  - Task 4/5 bu servisi ve token biçimini kullanır.

- [ ] **Step 1: Tipleri oluştur**

Create `backend/src/auth/types/jwt-payload.ts`:

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 2: DTO'ları oluştur**

Create `backend/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

Create `backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 3: Failing e2e testini yaz (register + login)**

Create `backend/test/auth.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = 'auth-test@kelepir.dev';
  const password = 'supersecret1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get(PrismaService);
    await app.init();
    await prisma.refreshToken.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('POST /auth/register yeni kullanıcı oluşturur ve token döner (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('aynı email ile tekrar kayıt 409 döner', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(409);
  });

  it('geçersiz email 400 döner', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password })
      .expect(400);
  });

  it('POST /auth/login doğru bilgiyle token döner (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('yanlış şifre ile login 401 döner', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrongpassword1' })
      .expect(401);
  });
});
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: FAIL (AuthModule/endpoint yok — derleme veya 404 hatası).

- [ ] **Step 5: AuthService'i yaz**

Create `backend/src/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { authConfig } from '../config/auth.config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResult, JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  private readonly config = authConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Bu email zaten kayıtlı');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });
    return this.issueTokens({ id: user.id, email: user.email });
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }
    return this.issueTokens({ id: user.id, email: user.email });
  }

  async issueTokens(user: { id: string; email: string }): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessExpires,
    });

    const rawRefresh = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
      Date.now() + this.config.refreshExpiresDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken: rawRefresh,
    };
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
```

- [ ] **Step 6: AuthController'ı yaz (register + login)**

Create `backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
```

- [ ] **Step 7: AuthModule'ü yaz**

Create `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 8: AppModule'e AuthModule ekle**

`backend/src/app.module.ts` `imports` dizisine `AuthModule` ekle (ConfigModule, HealthController ve PrismaModule korunur):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 9: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: PASS (register 201 + 409 + 400, login 200 + 401).

- [ ] **Step 10: Commit**

```bash
git add backend
git commit -m "feat(backend): auth register/login + JWT access + refresh üretimi (Faz 2)"
```

---

### Task 4: JWT strategy + JwtAuthGuard + korumalı GET /auth/me

**Files:**
- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Modify: `backend/src/auth/auth.module.ts` (strategy + PassportModule)
- Modify: `backend/src/auth/auth.controller.ts` (`GET /auth/me`)
- Modify: `backend/test/auth.e2e-spec.ts` (me testleri ekle)

**Interfaces:**
- Consumes: Task 3'ün access token'ı, `authConfig().accessSecret`.
- Produces: `JwtAuthGuard` (Bearer access token doğrular, `req.user: AuthUser` set eder), `GET /auth/me` (korumalı, mevcut kullanıcıyı döner). Sonraki fazlar `@UseGuards(JwtAuthGuard)` ile korumalı endpoint yazar.

- [ ] **Step 1: Failing me testlerini ekle**

`backend/test/auth.e2e-spec.ts` içine, en son `it(...)`'ten sonra (kapanış `});`'ten önce) ekle:

```typescript
  it('GET /auth/me token olmadan 401 döner', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me geçerli access token ile kullanıcıyı döner', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.accessToken;
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.email).toBe(email);
    expect(res.body).not.toHaveProperty('passwordHash');
  });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: FAIL (me endpoint yok → 404, "expected 401").

- [ ] **Step 3: JwtStrategy'yi yaz**

Create `backend/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { authConfig } from '../../config/auth.config';
import { AuthUser, JwtPayload } from '../types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig().accessSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { userId: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 4: JwtAuthGuard'ı yaz**

Create `backend/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: AuthModule'e PassportModule + JwtStrategy ekle**

`backend/src/auth/auth.module.ts` içeriğini değiştir:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [JwtModule.register({}), PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 6: /auth/me endpoint'ini ekle**

`backend/src/auth/auth.controller.ts` içeriğini değiştir (mevcut register/login korunur, me + guard eklenir):

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './types/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: AuthUser }) {
    return this.auth.me(req.user.userId);
  }
}
```

- [ ] **Step 7: AuthService'e me() ekle**

`backend/src/auth/auth.service.ts` sınıfına metod ekle (import gerekmez, mevcut prisma kullanılır):

```typescript
  async me(userId: string): Promise<{ id: string; email: string; createdAt: Date }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
    return user;
  }
```

- [ ] **Step 8: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: PASS (önceki testler + me 401 + me 200).

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "feat(backend): JWT strategy + JwtAuthGuard + korumalı /auth/me (Faz 2)"
```

---

### Task 5: Refresh (rotation) + logout endpoint'leri

**Files:**
- Create: `backend/src/auth/dto/refresh.dto.ts`
- Modify: `backend/src/auth/auth.service.ts` (`refresh`, `logout`)
- Modify: `backend/src/auth/auth.controller.ts` (`POST /auth/refresh`, `POST /auth/logout`)
- Modify: `backend/test/auth.e2e-spec.ts` (refresh + logout testleri)

**Interfaces:**
- Consumes: Task 3'ün refresh token'ı ve `hashToken`, `issueTokens`.
- Produces:
  - `AuthService.refresh(rawToken: string): Promise<AuthResult>` (eski token revoke edilir, yenisi üretilir)
  - `AuthService.logout(rawToken: string): Promise<{ success: true }>`
  - `POST /auth/refresh` (200), `POST /auth/logout` (200)

- [ ] **Step 1: RefreshDto'yu oluştur**

Create `backend/src/auth/dto/refresh.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

- [ ] **Step 2: Failing refresh/logout testlerini ekle**

`backend/test/auth.e2e-spec.ts` içine (kapanış `});`'ten önce) ekle:

```typescript
  it('POST /auth/refresh geçerli refresh ile yeni token verir ve eskisini geçersizler', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const oldRefresh = login.body.refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(typeof refreshed.body.accessToken).toBe('string');
    expect(refreshed.body.refreshToken).not.toBe(oldRefresh);

    // eski refresh token artık kullanılamaz (rotation)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('geçersiz refresh token 401 döner', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'gecersiz-token' })
      .expect(401);
  });

  it('POST /auth/logout refresh token\'ı geçersizler', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const refresh = login.body.refreshToken;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refresh })
      .expect(200);

    // logout sonrası refresh kullanılamaz
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: FAIL (refresh/logout endpoint yok → 404).

- [ ] **Step 4: AuthService'e refresh + logout ekle**

`backend/src/auth/auth.service.ts` sınıfına metodları ekle:

```typescript
  async refresh(rawToken: string): Promise<AuthResult> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !record ||
      record.revokedAt !== null ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Geçersiz refresh token');
    }
    // rotation: eskiyi revoke et
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens({
      id: record.user.id,
      email: record.user.email,
    });
  }

  async logout(rawToken: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
```

- [ ] **Step 5: AuthController'a refresh + logout ekle**

`backend/src/auth/auth.controller.ts` içine RefreshDto import et ve iki endpoint ekle (mevcutları koru):

```typescript
import { RefreshDto } from './dto/refresh.dto';
```

Sınıf içine ekle:

```typescript
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
```

- [ ] **Step 6: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: PASS (tüm auth akışı: register/login/me/refresh/logout).

- [ ] **Step 7: Tüm backend testlerini bir kez çalıştır**

Run: `cd backend && npm run test:e2e`
Expected: health + auth e2e hepsi PASS, çıktı temiz.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): refresh token rotation + logout (Faz 2)"
```

---

## Faz 2 Bitiş Kriteri (Definition of Done)

- `cd backend && npm run test:e2e` → health + auth e2e hepsi geçer, çıktı temiz
- `POST /auth/register` (201), `/auth/login` (200), `/auth/refresh` (200, rotation), `/auth/logout` (200), korumalı `GET /auth/me` çalışır
- Refresh token'lar DB'de yalnızca SHA-256 hash olarak; rotation ve logout ile revoke edilir
- Şifreler `bcryptjs` ile hash'li; hiçbir yanıt `passwordHash` sızdırmaz
- Hello World scaffold kaldırıldı; `prisma` CLI devDependencies'te
- Yeni env değişkenleri hem `backend/.env` hem `backend/.env.example`'da; `backend/.env` git'te değil

## Sonraki Faz

Faz 3 — Arama + fiyat (ITAD entegrasyonu, oyun detay, bölgesel fiyat). Frontend'e ilk dokunuşta ertelenen shadcn/Tailwind kararı + `NEXT_PUBLIC_API_URL` + CORS ele alınacak.
