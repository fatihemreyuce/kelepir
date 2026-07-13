import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './../src/prisma/prisma.service';
import { PrismaModule } from './../src/prisma/prisma.module';

describe('Prisma (e2e)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@kelepir.dev' } });
    await prisma.$disconnect();
  });

  it('User kaydı oluşturup okuyabilir', async () => {
    const created = await prisma.user.create({
      data: { email: 'test@kelepir.dev', passwordHash: 'x' },
    });
    expect(created.id).toBeDefined();

    const found = await prisma.user.findUnique({
      where: { email: 'test@kelepir.dev' },
    });
    expect(found?.email).toBe('test@kelepir.dev');
  });
});
