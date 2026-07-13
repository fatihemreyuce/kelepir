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
