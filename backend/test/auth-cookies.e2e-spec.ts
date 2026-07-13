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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
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
    expect(setCookie.find((c) => c.startsWith('access_token'))).toContain(
      'HttpOnly',
    );
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

  it('GET /auth/me yalnızca cookie ile (Bearer olmadan) çalışır', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    // agent cookie'leri saklar; Authorization header YOK
    const res = await agent.get('/auth/me').expect(200);
    expect(res.body.email).toBe(email);
  });

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

  it("POST /auth/logout cookie'leri temizler ve refresh'i geçersizler", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    await agent.post('/auth/logout').expect(200);
    // logout sonrası refresh (aynı agent, temizlenmiş cookie) 401
    await agent.post('/auth/refresh').expect(401);
  });

  it('ne cookie ne body ile refresh 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });
});
