# Kelepir Faz 5 — Cron + E-posta + Fiyat Geçmişi Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aktif fiyat alarmlarını periyodik tarayan bir cron: her oyunun güncel en düşük fiyatını ITAD'dan çeker, hedefin altına düşen alarmlar için Resend ile e-posta gönderir, alarmı tetiklendi olarak işaretler, ve fiyat geçmişi grafiği için `PriceSnapshot` biriktirir. Bu, backend'in son fazıdır.

**Architecture:** `@nestjs/schedule` ile zamanlanan `PriceCheckService.checkAllAlerts()` (cron'dan bağımsız, doğrudan çağrılabilir → test edilebilir). Fiyat verisi paylaşılan `ItadModule` (@Global; Faz 3'ün `ItadClient`/`InMemoryCache`'ini bu fazda ortak modüle çıkarıyoruz). E-posta izole `MailService` arkasında (native fetch → Resend REST API, key yoksa dev'de sessiz atlar), testlerde mock'lanır. Snapshot'lar her taranan oyun için birikir.

**Tech Stack:** NestJS 10, `@nestjs/schedule` (yeni, resmi), Prisma 6, native `fetch` (Resend için — ekstra HTTP kütüphanesi yok), Jest.

## Global Constraints

- Bu faz **yalnızca backend** (`backend/`) — `frontend/` değişmez
- NO Supabase, NO Redis, NO Vercel Cron (cron NestJS içinde `@nestjs/schedule`)
- E-posta: **Resend REST API** native `fetch` ile (SDK/axios YOK); `RESEND_API_KEY` env; key boşsa dev'de gönderim **sessizce atlanır** (crash yok)
- Fiyat verisi paylaşılan `ItadModule` (@Global) üzerinden; testler `ItadClient` ve `MailService`'i mock'lar — hiçbir test gerçek ITAD/Resend'e gitmez
- Cron: `@Cron('0 9,21 * * *')` (günde 2 kez); cron metodu ince, mantık `checkAllAlerts()`'te (testler bunu doğrudan çağırır)
- Tetiklenen alarm: mail gönder → `triggeredAt` set + `isActive=false` (tekrar mail atmasın); mail hatası alarmı **aktif bırakır** (retry), tüm cron'u bozmaz
- `PriceSnapshot` her taranan (oyun, region) için biriktirilir (grafik verisi)
- Yeni env değişkeni hem `backend/.env` hem `backend/.env.example`'a; `backend/.env` git'e girmez
- Prisma 6.x, DB host 5433; yeni migration yok (PriceSnapshot şeması Faz 1'de hazır)

---

## Dosya Yapısı (bu fazda oluşacak / değişecek)

```
backend/
  src/
    itad/
      itad.module.ts             YENİ: @Global, ItadClient + InMemoryCache provide/export
    games/
      games.module.ts            (Modify) ItadClient/InMemoryCache'i providers'tan çıkar (global oldu)
    mail/
      mail.types.ts              PriceAlertMail tipi
      mail.service.ts            Resend (native fetch), key yoksa skip
      mail.service.spec.ts       birim testi (global.fetch mock)
      mail.module.ts             MailService provide/export
    price-check/
      price-check.service.ts     checkAllAlerts() + @Cron
      price-check.module.ts
    app.module.ts                (Modify) ScheduleModule.forRoot() + ItadModule + MailModule + PriceCheckModule
    .env / .env.example          (Modify) RESEND_API_KEY, MAIL_FROM
  test/
    price-check.e2e-spec.ts      cron mantığı entegrasyon testi (ItadClient + MailService mock)
```

---

### Task 1: Paylaşılan ItadModule (@Global) refactor

**Files:**
- Create: `backend/src/itad/itad.module.ts`
- Modify: `backend/src/games/games.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces: `ItadModule` (@Global) → `ItadClient` ve `InMemoryCache`'i app geneli export eder. `GamesModule` ve (Task 3) `PriceCheckModule` bunları inject eder.
- Davranış değişmez (saf refactor); mevcut games e2e doğrular.

> Bu, Faz 3'ten ertelenen "ItadClient/InMemoryCache per-module → shared module" carry-forward'ıdır. Faz 5 cron'u ItadClient'a ihtiyaç duyduğu için şimdi yapıyoruz. Yan fayda: `InMemoryCache` artık app geneli tek örnek (gerçek singleton).

- [ ] **Step 1: ItadModule'ü oluştur**

Create `backend/src/itad/itad.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { ItadClient } from './itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';

@Global()
@Module({
  providers: [ItadClient, InMemoryCache],
  exports: [ItadClient, InMemoryCache],
})
export class ItadModule {}
```

- [ ] **Step 2: GamesModule'den ItadClient/InMemoryCache'i çıkar**

`backend/src/games/games.module.ts` içeriğini değiştir (artık global sağlanıyor):

```typescript
import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
```

- [ ] **Step 3: AppModule'e ItadModule ekle**

`backend/src/app.module.ts` `imports` dizisine `ItadModule` ekle (mevcut tüm modüller korunur). `import { ItadModule } from './itad/itad.module';` ekle ve imports dizisine `ItadModule` koy (ConfigModule'den sonra, GamesModule'den önce uygundur).

- [ ] **Step 4: Games e2e hâlâ geçiyor mu doğrula (refactor regresyon kontrolü)**

Run: `cd backend && npm run test:e2e -- games`
Expected: PASS (5/5 — davranış değişmedi; `.overrideProvider(ItadClient)` global provider'ı da geçersiz kılar).

- [ ] **Step 5: Tüm e2e suite yeşil mi**

Run: `cd backend && npm run test:e2e`
Expected: health + auth + games + favorites + alerts hepsi PASS.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "refactor(backend): ItadClient/InMemoryCache'i paylaşılan @Global ItadModule'e çıkar (Faz 5)"
```

---

### Task 2: MailService (Resend, izole) + env

**Files:**
- Create: `backend/src/mail/mail.types.ts`, `mail.service.ts`, `mail.service.spec.ts`, `mail.module.ts`
- Modify: `backend/.env`, `backend/.env.example`

**Interfaces:**
- Produces:
  - tip `PriceAlertMail = { to; gameTitle; targetPrice; currentPrice; currency; url }`
  - `MailService.sendPriceAlert(mail: PriceAlertMail): Promise<void>` — `RESEND_API_KEY` boşsa sessizce döner (dev); doluysa Resend REST API'ye POST; non-ok → hata fırlatır
  - `MailModule` (export MailService). Task 3 inject eder / test'te mock'lar.

- [ ] **Step 1: mail.types.ts oluştur**

Create `backend/src/mail/mail.types.ts`:

```typescript
export interface PriceAlertMail {
  to: string;
  gameTitle: string;
  targetPrice: number;
  currentPrice: number;
  currency: string;
  url: string;
}
```

- [ ] **Step 2: Failing mail birim testini yaz**

Create `backend/src/mail/mail.service.spec.ts`:

```typescript
import { MailService } from './mail.service';
import { PriceAlertMail } from './mail.types';

const sample: PriceAlertMail = {
  to: 'user@kelepir.dev',
  gameTitle: 'Test Game',
  targetPrice: 200,
  currentPrice: 149.99,
  currency: 'TRY',
  url: 'http://store/deal',
};

describe('MailService', () => {
  let service: MailService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new MailService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  });

  it('RESEND_API_KEY yoksa fetch çağırmadan sessizce döner', async () => {
    process.env.RESEND_API_KEY = '';
    await service.sendPriceAlert(sample);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('key varsa Resend API\'ye doğru POST atar', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'Kelepir <a@b.co>';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) } as Response);

    await service.sendPriceAlert(sample);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const req = init as RequestInit;
    expect(req.method).toBe('POST');
    expect((req.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(req.body as string);
    expect(body.from).toBe('Kelepir <a@b.co>');
    expect(body.to).toBe('user@kelepir.dev');
    expect(body.subject).toContain('Test Game');
  });

  it('Resend non-ok yanıtında hata fırlatır', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    fetchMock.mockResolvedValue({ ok: false, status: 422 } as Response);
    await expect(service.sendPriceAlert(sample)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm test -- mail.service`
Expected: FAIL (`MailService` yok).

- [ ] **Step 4: MailService'i yaz**

Create `backend/src/mail/mail.service.ts`:

```typescript
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PriceAlertMail } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey(): string {
    return process.env.RESEND_API_KEY ?? '';
  }

  private get from(): string {
    return process.env.MAIL_FROM ?? 'Kelepir <onboarding@resend.dev>';
  }

  async sendPriceAlert(mail: PriceAlertMail): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        `RESEND_API_KEY yok — "${mail.gameTitle}" için mail atlandı (${mail.to})`,
      );
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: mail.to,
        subject: `${mail.gameTitle} hedef fiyatına düştü! 🎮`,
        html:
          `<p><strong>${mail.gameTitle}</strong> takip ettiğin fiyata ulaştı.</p>` +
          `<p>Hedef: ${mail.targetPrice} ${mail.currency} · ` +
          `Güncel: <strong>${mail.currentPrice} ${mail.currency}</strong></p>` +
          `<p><a href="${mail.url}">Mağazada gör</a></p>` +
          `<p>— Kelepir</p>`,
      }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Resend failed: ${res.status}`);
    }
  }
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm test -- mail.service`
Expected: PASS (3 test).

- [ ] **Step 6: MailModule'ü yaz**

Create `backend/src/mail/mail.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 7: Env değişkenlerini ekle (hem .env hem .env.example)**

`backend/.env` VE `backend/.env.example` sonuna ekle:

```
RESEND_API_KEY=""
MAIL_FROM="Kelepir <onboarding@resend.dev>"
```

> `RESEND_API_KEY` boş; gerçek key sonra. Boşken cron mail atlar (crash yok).

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): MailService (Resend, native fetch, izole) + env (Faz 5)"
```

---

### Task 3: @nestjs/schedule + PriceCheckService (cron + snapshot + trigger)

**Files:**
- Modify: `backend/package.json` (`@nestjs/schedule` kurulumu)
- Create: `backend/src/price-check/price-check.service.ts`, `price-check.module.ts`
- Modify: `backend/src/app.module.ts` (ScheduleModule.forRoot() + MailModule + PriceCheckModule)
- Create: `backend/test/price-check.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (global), `ItadClient` (global ItadModule), `MailService` (MailModule).
- Produces: `PriceCheckService.checkAllAlerts(): Promise<{ checked: number; triggered: number }>` — aktif alarmları tarar, snapshot biriktirir, tetiklenenlere mail atıp işaretler. `@Cron('0 9,21 * * *')` ile zamanlanır.

- [ ] **Step 1: @nestjs/schedule'ı kur**

Run: `cd backend && npm install @nestjs/schedule`

- [ ] **Step 2: Failing entegrasyon testini yaz**

Create `backend/test/price-check.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ItadClient } from './../src/itad/itad.client';
import { MailService } from './../src/mail/mail.service';
import { PriceCheckService } from './../src/price-check/price-check.service';

const itadMock = { searchGames: jest.fn(), getGameInfo: jest.fn(), getPrices: jest.fn() };
const mailMock = { sendPriceAlert: jest.fn() };

describe('PriceCheck (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: PriceCheckService;
  const email = 'pc-test@kelepir.dev';
  const g1 = 'pc-game-1';
  const g2 = 'pc-game-2';
  let userId: string;
  let alert1Id: string;
  let alert2Id: string;

  const clean = async () => {
    await prisma.priceSnapshot.deleteMany({ where: { game: { itadId: { in: [g1, g2] } } } });
    await prisma.priceAlert.deleteMany({ where: { game: { itadId: { in: [g1, g2] } } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.game.deleteMany({ where: { itadId: { in: [g1, g2] } } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ItadClient).useValue(itadMock)
      .overrideProvider(MailService).useValue(mailMock)
      .compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    service = app.get(PriceCheckService);
    await app.init();

    await clean();
    const user = await prisma.user.create({ data: { email, passwordHash: 'x' } });
    userId = user.id;
    const game1 = await prisma.game.create({ data: { itadId: g1, title: 'PC Game 1', slug: 'pc-game-1', coverUrl: null } });
    const game2 = await prisma.game.create({ data: { itadId: g2, title: 'PC Game 2', slug: 'pc-game-2', coverUrl: null } });
    // alert1: hedef 200, en ucuz 150 -> TETİKLENİR
    const a1 = await prisma.priceAlert.create({ data: { userId, gameId: game1.id, targetPrice: 200, region: 'TR' } });
    alert1Id = a1.id;
    // alert2: hedef 50, en ucuz 150 -> TETİKLENMEZ
    const a2 = await prisma.priceAlert.create({ data: { userId, gameId: game2.id, targetPrice: 50, region: 'TR' } });
    alert2Id = a2.id;
  });

  afterAll(async () => {
    await clean();
    await app.close();
  });

  it('tetiklenen alarma mail atar + işaretler, diğerini bırakır, snapshot biriktirir', async () => {
    itadMock.getPrices.mockResolvedValue(
      new Map([
        [g1, [{ shopId: 61, shopName: 'Steam', price: 150, currency: 'TRY', regular: 300, cut: 50, url: 'http://s1' }]],
        [g2, [{ shopId: 35, shopName: 'GOG', price: 150, currency: 'TRY', regular: 150, cut: 0, url: 'http://s2' }]],
      ]),
    );

    const result = await service.checkAllAlerts();

    // İZOLASYON: checkAllAlerts GLOBAL'dir (tüm aktif alarmlar). Jest e2e
    // dosyaları aynı DB'de paralel koşabildiğinden `checked` başka suite'lerin
    // alarmlarından etkilenebilir. Bizim iddialarımız yalnızca kendi oyunlarımıza
    // dayanır: mock getPrices yalnızca g1/g2 döndürdüğü için başka oyunların
    // alarmları boş deals -> ne tetiklenir ne mail alır. Sadece g1 (150<=200)
    // tetiklenir, dolayısıyla toplam mail == 1 ve triggered == 1 deterministiktir.
    expect(result.triggered).toBe(1);
    expect(result.checked).toBeGreaterThanOrEqual(2);

    // mail sadece alert1 için, doğru içerikle (global olarak tek tetiklenme)
    expect(mailMock.sendPriceAlert).toHaveBeenCalledTimes(1);
    expect(mailMock.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ to: email, gameTitle: 'PC Game 1', currentPrice: 150, currency: 'TRY' }),
    );

    // alert1 tetiklendi, alert2 aktif
    const a1 = await prisma.priceAlert.findUnique({ where: { id: alert1Id } });
    const a2 = await prisma.priceAlert.findUnique({ where: { id: alert2Id } });
    expect(a1?.isActive).toBe(false);
    expect(a1?.triggeredAt).not.toBeNull();
    expect(a2?.isActive).toBe(true);
    expect(a2?.triggeredAt).toBeNull();

    // her iki oyun için snapshot biriktirildi
    const snaps = await prisma.priceSnapshot.findMany({ where: { game: { itadId: { in: [g1, g2] } } } });
    expect(snaps.length).toBeGreaterThanOrEqual(2);
  });

  it('kendi alarmlarımız pasifken bizim oyunlarımız için mail atılmaz', async () => {
    mailMock.sendPriceAlert.mockClear();
    itadMock.getPrices.mockResolvedValue(
      new Map([
        [g1, [{ shopId: 61, shopName: 'Steam', price: 150, currency: 'TRY', regular: 300, cut: 50, url: 'http://s1' }]],
        [g2, [{ shopId: 35, shopName: 'GOG', price: 150, currency: 'TRY', regular: 150, cut: 0, url: 'http://s2' }]],
      ]),
    );
    // bu kullanıcının tüm alarmlarını pasifleştir (alert1 zaten tetiklenmiş olabilir)
    await prisma.priceAlert.updateMany({ where: { userId }, data: { isActive: false } });

    const result = await service.checkAllAlerts();

    // İZOLASYON: `checked` global olduğu için mutlak değere bakmıyoruz. Bizim
    // g1/g2 alarmlarımız pasif olduğundan onlar için tetikleme/mail olmamalı;
    // başka oyunlar mock'ta olmadığından zaten tetiklenmez -> triggered 0.
    expect(result.triggered).toBe(0);
    expect(mailMock.sendPriceAlert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `cd backend && npm run test:e2e -- price-check`
Expected: FAIL (`PriceCheckService` yok / provider bulunamaz).

- [ ] **Step 4: PriceCheckService'i yaz**

Create `backend/src/price-check/price-check.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ItadClient } from '../itad/itad.client';
import { ItadDeal } from '../itad/itad.types';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PriceCheckService {
  private readonly logger = new Logger(PriceCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly itad: ItadClient,
    private readonly mail: MailService,
  ) {}

  @Cron('0 9,21 * * *')
  async handleCron(): Promise<void> {
    const { checked, triggered } = await this.checkAllAlerts();
    this.logger.log(`Fiyat kontrolü: ${checked} alarm tarandı, ${triggered} tetiklendi`);
  }

  async checkAllAlerts(): Promise<{ checked: number; triggered: number }> {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { isActive: true },
      include: { game: true, user: true },
    });
    if (alerts.length === 0) {
      return { checked: 0, triggered: 0 };
    }

    // (region -> distinct itadId set) ve (itadId -> gameId) haritaları
    const idsByRegion = new Map<string, Set<string>>();
    const gameIdByItad = new Map<string, string>();
    for (const a of alerts) {
      if (!idsByRegion.has(a.region)) {
        idsByRegion.set(a.region, new Set());
      }
      idsByRegion.get(a.region)!.add(a.game.itadId);
      gameIdByItad.set(a.game.itadId, a.gameId);
    }

    // region başına tek ITAD çağrısı; `${itadId}:${region}` -> deals
    const dealsByKey = new Map<string, ItadDeal[]>();
    for (const [region, ids] of idsByRegion) {
      const map = await this.itad.getPrices([...ids], region);
      for (const [itadId, deals] of map) {
        dealsByKey.set(`${itadId}:${region}`, deals);
      }
    }

    // fiyat geçmişi: her taranan (oyun, region) için snapshot biriktir
    for (const [key, deals] of dealsByKey) {
      const [itadId, region] = key.split(':');
      const gameId = gameIdByItad.get(itadId);
      if (!gameId || deals.length === 0) {
        continue;
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
    }

    // tetikleme
    let triggered = 0;
    for (const a of alerts) {
      const deals = dealsByKey.get(`${a.game.itadId}:${a.region}`) ?? [];
      if (deals.length === 0) {
        continue;
      }
      const cheapest = deals.reduce((min, d) => (d.price < min.price ? d : min));
      if (cheapest.price <= Number(a.targetPrice)) {
        try {
          await this.mail.sendPriceAlert({
            to: a.user.email,
            gameTitle: a.game.title,
            targetPrice: Number(a.targetPrice),
            currentPrice: cheapest.price,
            currency: cheapest.currency,
            url: cheapest.url,
          });
          await this.prisma.priceAlert.update({
            where: { id: a.id },
            data: { triggeredAt: new Date(), isActive: false },
          });
          triggered++;
        } catch (err) {
          // mail hatası: alarmı aktif bırak (retry), cron'u bozma
          this.logger.error(
            `Alarm ${a.id} maili gönderilemedi: ${(err as Error).message}`,
          );
        }
      }
    }

    return { checked: alerts.length, triggered };
  }
}
```

- [ ] **Step 5: PriceCheckModule'ü yaz**

Create `backend/src/price-check/price-check.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PriceCheckService } from './price-check.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [PriceCheckService],
})
export class PriceCheckModule {}
```

- [ ] **Step 6: AppModule'e ScheduleModule + PriceCheckModule ekle**

`backend/src/app.module.ts`: `ScheduleModule.forRoot()`, `MailModule`, `PriceCheckModule` ekle (mevcut tüm modüller korunur). Importlar:

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';
import { PriceCheckModule } from './price-check/price-check.module';
```

`imports` dizisi şu hâle gelsin (mevcut sıra korunarak yenileri eklenir):

```typescript
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ItadModule,
    PrismaModule,
    AuthModule,
    GamesModule,
    FavoritesModule,
    AlertsModule,
    MailModule,
    PriceCheckModule,
  ],
```

- [ ] **Step 7: Testi çalıştır, geçtiğini doğrula**

Run: `cd backend && npm run test:e2e -- price-check`
Expected: PASS (tetikleme + işaretleme + snapshot + boş durum).

- [ ] **Step 8: Tüm backend testlerini bir kez çalıştır**

Run: `cd backend && npm run test:e2e && npm test`
Expected: e2e (health + auth + games + favorites + alerts + price-check) PASS; unit (itad.client + in-memory-cache + mail.service) PASS; çıktı temiz.

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "feat(backend): fiyat kontrolü cron + Resend mail + PriceSnapshot birikimi (Faz 5)"
```

---

## Faz 5 Bitiş Kriteri (Definition of Done)

- `cd backend && npm run test:e2e` → tüm e2e (price-check dahil) geçer; `npm test` → tüm birim (mail.service dahil) geçer; çıktı temiz
- `PriceCheckService.checkAllAlerts()`: aktif alarmları tarar, region başına tek ITAD çağrısı, her oyun için PriceSnapshot biriktirir, hedefin altındaki alarmlara Resend maili atar, `triggeredAt` + `isActive=false` işaretler; mail hatası alarmı aktif bırakır
- Cron `@Cron('0 9,21 * * *')` ile zamanlanır; mantık doğrudan çağrılabilir metotta
- E-posta `MailService` arkasında izole; `RESEND_API_KEY` boşsa sessizce atlar; testler ITAD/Resend'i mock'lar
- `RESEND_API_KEY`/`MAIL_FROM` hem `backend/.env` hem `.env.example`'da; `backend/.env` git'te değil
- Paylaşılan `ItadModule` (@Global) devrede; games e2e regresyonsuz
- Ekstra HTTP kütüphanesi yok (Resend native fetch); tek yeni bağımlılık `@nestjs/schedule`

## Sonraki Adımlar (backend tamam)

Backend Faz 1-5 tamamlanır. Frontend fazlarına geçmeden önce ertelenen **backend hardening batch**'i (tek bir hardening fazı olarak) önerilir:
- Global Prisma exception filter (P2002/P2003 → uygun HTTP kod)
- ITAD upstream hataları → 502/503/429; `@nestjs/throttler` rate limit
- InMemoryCache max-size/LRU + expired sweep
- region uppercase normalize; currency/region tutarlılığı
- PriceSnapshot/expired RefreshToken prune job'ları
- repo-geneli format cleanup (tek commit)

Ardından frontend: shadcn/Tailwind v3-v4 kararı + `NEXT_PUBLIC_API_URL` + CORS, sonra sayfalar. Gerçek `ITAD_API_KEY` + `RESEND_API_KEY` eklendiğinde arama/fiyat/mail canlı doğrulanır.
