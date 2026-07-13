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

  it('handleCron, checkAllAlerts reddedildiğinde hatayı yutar ve süreci çökertmez', async () => {
    const spy = jest.spyOn(service, 'checkAllAlerts').mockRejectedValueOnce(new Error('boom'));

    await expect(service.handleCron()).resolves.toBeUndefined();

    spy.mockRestore();
  });
});
