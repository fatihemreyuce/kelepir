import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ItadClient } from './../src/itad/itad.client';

const itadMock = {
  searchGames: jest.fn(),
  getGameInfo: jest.fn(),
  getPrices: jest.fn(),
};

describe('Games (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
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
});
