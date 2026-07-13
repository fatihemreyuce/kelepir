import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ItadClient } from './../src/itad/itad.client';
import { PrismaService } from './../src/prisma/prisma.service';

const itadMock = {
  searchGames: jest.fn(),
  getGameInfo: jest.fn(),
  getPrices: jest.fn(),
};

describe('Games (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ItadClient)
      .useValue(itadMock)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({
      where: { itadId: { in: ['uuid-1', 'uuid-2'] } },
    });
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /games/search?q= ITAD sonuçlarını map'leyerek döner", async () => {
    itadMock.searchGames.mockResolvedValue([
      {
        id: 'uuid-1',
        slug: 'game-one',
        title: 'Game One',
        cover: 'http://img',
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/games/search')
      .query({ q: 'game one' })
      .expect(200);

    expect(res.body).toEqual([
      {
        itadId: 'uuid-1',
        slug: 'game-one',
        title: 'Game One',
        cover: 'http://img',
      },
    ]);
    expect(itadMock.searchGames).toHaveBeenCalledWith('game one');
  });

  it('q boşsa 400 döner', async () => {
    await request(app.getHttpServer()).get('/games/search').expect(400);
  });

  it('GET /games/:itadId/prices en ucuzu işaretler ve Game upsert eder', async () => {
    itadMock.getGameInfo.mockResolvedValue({
      id: 'uuid-1',
      slug: 'game-one',
      title: 'Game One',
      cover: 'http://img',
    });
    itadMock.getPrices.mockResolvedValue(
      new Map([
        [
          'uuid-1',
          [
            {
              shopId: 61,
              shopName: 'Steam',
              price: 149.99,
              currency: 'TRY',
              regular: 299.99,
              cut: 50,
              url: 'http://steam',
            },
            {
              shopId: 35,
              shopName: 'GOG',
              price: 99.99,
              currency: 'TRY',
              regular: 199.99,
              cut: 50,
              url: 'http://gog',
            },
          ],
        ],
      ]),
    );

    const res = await request(app.getHttpServer())
      .get('/games/uuid-1/prices')
      .query({ region: 'TR' })
      .expect(200);

    expect(res.body.game.itadId).toBe('uuid-1');
    expect(res.body.region).toBe('TR');
    expect(res.body.currency).toBe('TRY');
    const cheapest = res.body.prices.find(
      (p: { isCheapest: boolean }) => p.isCheapest,
    );
    expect(cheapest.shopName).toBe('GOG');
    expect(cheapest.price).toBe(99.99);
    // sadece bir tane en ucuz işaretli
    expect(
      res.body.prices.filter((p: { isCheapest: boolean }) => p.isCheapest),
    ).toHaveLength(1);
    expect(itadMock.getPrices).toHaveBeenCalledWith(['uuid-1'], 'TR');

    // Game DB'ye upsert edilmiş olmalı
    const game = await prisma.game.findUnique({ where: { itadId: 'uuid-1' } });
    expect(game?.title).toBe('Game One');
  });

  it('region verilmezse default TR kullanılır', async () => {
    // farklı id (uuid-2) — cache çakışmasını önler
    itadMock.getGameInfo.mockResolvedValue({
      id: 'uuid-2',
      slug: 'game-two',
      title: 'Game Two',
      cover: null,
    });
    itadMock.getPrices.mockResolvedValue(
      new Map([
        [
          'uuid-2',
          [
            {
              shopId: 61,
              shopName: 'Steam',
              price: 10,
              currency: 'TRY',
              regular: 10,
              cut: 0,
              url: 'http://s',
            },
          ],
        ],
      ]),
    );

    await request(app.getHttpServer()).get('/games/uuid-2/prices').expect(200);
    expect(itadMock.getPrices).toHaveBeenCalledWith(['uuid-2'], 'TR');
  });

  it('bilinmeyen oyun 404 döner', async () => {
    itadMock.getGameInfo.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/games/yok/prices').expect(404);
  });
});
