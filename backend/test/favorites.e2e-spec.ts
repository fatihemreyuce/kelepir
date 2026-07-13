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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = app.get(PrismaService);
    await app.init();

    // temizlik + seed
    await prisma.favorite.deleteMany({ where: { game: { itadId } } });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: [email, email2] } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    const game = await prisma.game.create({
      data: { itadId, title: 'Fav Game', slug: 'fav-game', coverUrl: null },
    });
    gameId = game.id;

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    token = reg.body.accessToken;
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email2, password })
      .expect(201);
    token2 = reg2.body.accessToken;
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany({ where: { gameId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: [email, email2] } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [email, email2] } } });
    await prisma.game.deleteMany({ where: { itadId } });
    await app.close();
  });

  it('token olmadan POST /favorites 401', async () => {
    await request(app.getHttpServer())
      .post('/favorites')
      .send({ itadId })
      .expect(401);
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
      .get('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const favId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/favorites/${favId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
  });

  it('sahibi favoriyi siler (200), sonra liste boş', async () => {
    const list = await request(app.getHttpServer())
      .get('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const favId = list.body[0].id;
    await request(app.getHttpServer())
      .delete(`/favorites/${favId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body).toHaveLength(0);
  });
});
