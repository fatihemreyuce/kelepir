# Kelepir Faz 6 — httpOnly Cookie Auth + CORS Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auth uçlarını, JSON token yanıtına ek olarak **httpOnly cookie** set edecek şekilde genişletmek; access token'ı cookie'den (veya Bearer'dan) doğrulamak; refresh/logout'u cookie üzerinden çalıştırmak; ve frontend'in kimlik doğrulaması için **CORS'u credentials ile açmak**. Frontend fazının köprüsü.

**Architecture:** Auth controller, `@Res({ passthrough: true })` ile login/register/refresh'te httpOnly cookie set eder (access + refresh), logout'ta temizler; JSON gövdesi **geriye dönük uyumluluk için korunur** (Faz 2 testleri bozulmaz). `JwtStrategy` access token'ı önce cookie'den, sonra Authorization header'dan çıkarır. `main.ts` `cookie-parser` + `enableCors({ credentials: true })`. Cookie yönetimi küçük bir yardımcı modülde toplanır.

**Tech Stack:** NestJS 10, `cookie-parser` (yeni), passport-jwt cookie extractor, Jest e2e + supertest (agent ile cookie akışı).

## Global Constraints

- Bu faz **yalnızca backend** (`backend/`) — `frontend/` değişmez
- Auth uçları JSON token gövdesini **KORUR** (Faz 2 e2e testleri geçmeye devam eder) + ek olarak httpOnly cookie set eder
- Cookie adları: `access_token`, `refresh_token`; opsiyonlar: `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV==='production'`, `path: '/'`; maxAge access 15dk, refresh 7g
- Access token doğrulama: önce `access_token` cookie, yoksa `Authorization: Bearer` (ikisi de çalışır)
- Refresh/logout: token önce `refresh_token` cookie'den, yoksa body'den (`RefreshDto` opsiyonel olur); ikisi de yoksa 401
- CORS: `credentials: true`, origin env `FRONTEND_URL` (default `http://localhost:3000`)
- Yeni env değişkeni hem `backend/.env` hem `.env.example`'a; `backend/.env` git'e girmez
- NO Supabase/Redis; Prisma 6.x; yeni migration yok; tek yeni bağımlılık `cookie-parser`

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
backend/
  src/
    main.ts                          (Modify) cookieParser() + enableCors(credentials)
    auth/
      auth.cookies.ts                YENİ: setAuthCookies / clearAuthCookies + cookie opsiyonları
      auth.controller.ts             (Modify) login/register/refresh/logout cookie set/clear + @Res passthrough
      dto/refresh.dto.ts             (Modify) refreshToken opsiyonel
      strategies/jwt.strategy.ts     (Modify) cookie extractor (access_token) + header fallback
    .env / .env.example              (Modify) FRONTEND_URL
  test/
    auth-cookies.e2e-spec.ts         YENİ: cookie akışı (set / me-via-cookie / refresh / logout)
```

---

### Task 1: cookie-parser + CORS + cookie yardımcıları + login/register cookie set

**Files:**
- Modify: `backend/src/main.ts`, `backend/package.json`
- Create: `backend/src/auth/auth.cookies.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/.env`, `backend/.env.example`
- Create: `backend/test/auth-cookies.e2e-spec.ts`

**Interfaces:**
- Produces: `setAuthCookies(res, { accessToken, refreshToken })`, `clearAuthCookies(res)`; login/register artık httpOnly cookie set eder + JSON döner; CORS credentials açık.

- [ ] **Step 1: cookie-parser'ı kur**

Run: `cd backend && npm install cookie-parser && npm install --save-dev @types/cookie-parser`

- [ ] **Step 2: main.ts'e cookieParser + CORS ekle**

`backend/src/main.ts` içeriğini değiştir:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 3: auth.cookies.ts yardımcılarını oluştur**

Create `backend/src/auth/auth.cookies.ts`:

```typescript
import { Response } from 'express';

const isProd = () => process.env.NODE_ENV === 'production';

const base = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd(),
  path: '/',
});

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 dk
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 gün

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie('access_token', tokens.accessToken, {
    ...base(),
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...base(),
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', base());
  res.clearCookie('refresh_token', base());
}
```

- [ ] **Step 4: FRONTEND_URL env'i ekle (hem .env hem .env.example)**

`backend/.env` VE `backend/.env.example` sonuna ekle:

```
FRONTEND_URL="http://localhost:3000"
```

- [ ] **Step 5: Failing cookie e2e testini yaz (login/register cookie set eder)**

Create `backend/test/auth-cookies.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth cookies (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = 'cookie-test@kelepir.dev';
  const password = 'supersecret1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
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

  function cookieNames(setCookie: string[] | undefined): string[] {
    return (setCookie ?? []).map((c) => c.split('=')[0]);
  }

  it('register httpOnly access_token + refresh_token cookie set eder ve JSON de döner', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(cookieNames(setCookie)).toEqual(
      expect.arrayContaining(['access_token', 'refresh_token']),
    );
    // httpOnly işaretli
    expect(setCookie.find((c) => c.startsWith('access_token'))).toContain('HttpOnly');
    // JSON gövdesi hâlâ mevcut (geriye dönük uyum)
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user.email).toBe(email);
  });

  it('login de cookie set eder', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(cookieNames(setCookie)).toEqual(
      expect.arrayContaining(['access_token', 'refresh_token']),
    );
  });
});
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth-cookies`
Expected: FAIL (henüz cookie set edilmiyor → Set-Cookie yok).

- [ ] **Step 7: AuthController login/register'ı cookie set edecek şekilde güncelle**

`backend/src/auth/auth.controller.ts`'i AŞAĞIDAKİYLE DEĞİŞTİR. register/login artık `@Res({ passthrough: true })` ile cookie set eder; **`refresh`/`logout` bu task'ta Faz 2'deki body-tabanlı hâlleriyle AYNEN korunur** (Task 3 onları cookie'li yapacak) — böylece hiçbir mevcut test kırılmaz:

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './types/jwt-payload';
import { setAuthCookies } from './auth.cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    setAuthCookies(res, result);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    setAuthCookies(res, result);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

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
}
```

> Not: `refresh`/`logout` bu hâlde Faz 2'deki gibi `dto.refreshToken` (body) kullanır. **Bu task'ta `RefreshDto` hâlâ Faz 2 hâlidir (`refreshToken: string`, zorunlu).** Task 3'te DTO opsiyonel yapılıp refresh/logout cookie'den okuyacak. Yani bu task Faz 2 refresh/logout testlerini KIRMAZ.

- [ ] **Step 8: Testleri çalıştır (cookie + mevcut auth), geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth`
Expected: PASS — `auth.e2e-spec` (register/login/me/refresh/logout, Faz 2) + `auth-cookies.e2e-spec` (yeni) hepsi geçer.

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "feat(backend): CORS(credentials) + cookie-parser + login/register httpOnly cookie set (Faz 6)"
```

---

### Task 2: Access token'ı cookie'den doğrula (JwtStrategy cookie extractor)

**Files:**
- Modify: `backend/src/auth/strategies/jwt.strategy.ts`
- Modify: `backend/test/auth-cookies.e2e-spec.ts` (me-via-cookie testi)

**Interfaces:**
- Consumes: `access_token` cookie (Task 1 set eder).
- Produces: `JwtStrategy` access token'ı önce cookie'den, yoksa Bearer header'dan çıkarır — her iki akış da `/auth/me` ve tüm korumalı uçlarda çalışır.

- [ ] **Step 1: Failing me-via-cookie testini ekle**

`backend/test/auth-cookies.e2e-spec.ts` içine (kapanış `});`'ten önce) ekle:

```typescript
  it('GET /auth/me yalnızca cookie ile (Bearer olmadan) çalışır', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    // agent cookie'leri saklar; Authorization header YOK
    const res = await agent.get('/auth/me').expect(200);
    expect(res.body.email).toBe(email);
  });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth-cookies`
Expected: FAIL (strategy yalnızca Bearer'a bakıyor → cookie ile 401).

- [ ] **Step 3: JwtStrategy'ye cookie extractor ekle**

`backend/src/auth/strategies/jwt.strategy.ts` içeriğini değiştir:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import { Request } from 'express';
import { authConfig } from '../../config/auth.config';
import { AuthUser, JwtPayload } from '../types/jwt-payload';

const cookieExtractor: JwtFromRequestFunction = (req: Request) => {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig().accessSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { userId: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth-cookies`
Expected: PASS (register/login cookie + me-via-cookie). Bearer akışı da hâlâ çalışır (`auth.e2e-spec` me testi Bearer kullanır).

- [ ] **Step 5: Auth suite regresyon kontrolü**

Run: `cd backend && npm run test:e2e -- auth`
Expected: PASS (hem `auth` hem `auth-cookies`).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(backend): JwtStrategy access token'ı cookie'den de doğrular (Faz 6)"
```

---

### Task 3: Refresh + logout cookie üzerinden (rotation + cookie temizleme)

**Files:**
- Modify: `backend/src/auth/dto/refresh.dto.ts` (refreshToken opsiyonel)
- Modify: `backend/src/auth/auth.controller.ts` (refresh/logout: cookie'den oku, yeni cookie set / temizle)
- Modify: `backend/test/auth-cookies.e2e-spec.ts` (refresh + logout cookie testleri)

**Interfaces:**
- Consumes: `refresh_token` cookie (Task 1 set eder), `AuthService.refresh`/`logout` (Faz 2).
- Produces: `POST /auth/refresh` cookie'den refresh okur, rotate eder, YENİ cookie set eder; `POST /auth/logout` cookie'den okur, revoke eder, cookie'leri temizler. Body fallback korunur (Faz 2 testleri geçer).

- [ ] **Step 1: RefreshDto'yu opsiyonel yap**

`backend/src/auth/dto/refresh.dto.ts` içeriğini değiştir:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
```

> Not: Artık refresh token body'de opsiyonel (cookie'den gelebilir). Token'ın yokluğu (ne cookie ne body) controller'da 401 ile ele alınır.

- [ ] **Step 2: Failing refresh/logout cookie testlerini ekle**

`backend/test/auth-cookies.e2e-spec.ts` içine (kapanış `});`'ten önce) ekle:

```typescript
  it('POST /auth/refresh cookie ile yeni cookie verir ve eskisini geçersizler', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);

    const refreshRes = await agent.post('/auth/refresh').expect(200);
    const setCookie = refreshRes.headers['set-cookie'] as unknown as string[];
    expect((setCookie ?? []).map((c) => c.split('=')[0])).toEqual(
      expect.arrayContaining(['access_token', 'refresh_token']),
    );
    // yeni access cookie ile me çalışır
    await agent.get('/auth/me').expect(200);
  });

  it('POST /auth/logout cookie\'leri temizler ve refresh\'i geçersizler', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    await agent.post('/auth/logout').expect(200);
    // logout sonrası refresh (aynı agent, temizlenmiş cookie) 401
    await agent.post('/auth/refresh').expect(401);
  });

  it('ne cookie ne body ile refresh 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- auth-cookies`
Expected: FAIL (refresh/logout cookie okumuyor/temizlemiyor; token yoksa 401 yerine mevcut davranış).

- [ ] **Step 4: AuthController refresh/logout'u cookie'li hâle getir**

`backend/src/auth/auth.controller.ts` içindeki `refresh` ve `logout` metotlarını değiştir (importlara `Req`, `UnauthorizedException`, `clearAuthCookies` eklenmeli; `Request` zaten import). Metotlar:

```typescript
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      (req.cookies as Record<string, string> | undefined)?.refresh_token ??
      dto.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token yok');
    }
    const result = await this.auth.refresh(token);
    setAuthCookies(res, result);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      (req.cookies as Record<string, string> | undefined)?.refresh_token ??
      dto.refreshToken;
    clearAuthCookies(res);
    if (!token) {
      return { success: true };
    }
    return this.auth.logout(token);
  }
```

Importları güncelle (dosya başı):

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './types/jwt-payload';
import { setAuthCookies, clearAuthCookies } from './auth.cookies';
```

> Not: `logout` cookie'leri her hâlükârda temizler (token yoksa bile) ve idempotenttir. Faz 2'nin body-tabanlı refresh/logout testleri hâlâ geçer (body fallback + `AuthService.refresh/logout` değişmedi).

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- auth-cookies`
Expected: PASS (refresh cookie + logout cookie + no-token 401).

- [ ] **Step 6: Tüm backend testlerini bir kez çalıştır**

Run: `cd backend && npm run test:e2e && npm test`
Expected: tüm e2e (auth, auth-cookies, games, favorites, alerts, price-check, health, prisma) + unit hepsi PASS; çıktı temiz.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "feat(backend): refresh + logout cookie üzerinden (rotation + cookie temizleme) (Faz 6)"
```

---

## Faz 6 Bitiş Kriteri (Definition of Done)

- `cd backend && npm run test:e2e` → tüm e2e (Faz 2 auth + yeni auth-cookies dahil) geçer; `npm test` → birim geçer; çıktı temiz
- login/register/refresh httpOnly `access_token` + `refresh_token` cookie set eder; JSON gövdesi de korunur (geriye dönük uyum)
- `/auth/me` ve korumalı uçlar yalnızca cookie ile (Bearer olmadan) çalışır; Bearer akışı da çalışır
- refresh cookie'den okur + rotate + yeni cookie; logout cookie'den okur + revoke + cookie temizler; token yoksa 401 (refresh) / idempotent temizleme (logout)
- CORS `credentials: true` + `FRONTEND_URL` origin açık; `FRONTEND_URL` hem `.env` hem `.env.example`'da
- Tek yeni bağımlılık `cookie-parser`; yeni migration yok

## Sonraki Faz

Faz 7 — Frontend temeli: Tailwind v4 yükseltme + shadcn temiz kurulum + app shell (koyu tema) + API client (credentials: 'include') + auth sayfaları (giriş/kayıt) + auth context + Next middleware ile korumalı sayfalar (`/favoriler`, `/alarmlarim`). Bu faz frontend'e ilk dokunuş.
