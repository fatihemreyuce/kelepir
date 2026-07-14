import { GamesService } from './games.service';

describe('GamesService.getGameHistory', () => {
  const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
  let prisma: any;
  let service: GamesService;

  beforeEach(() => {
    prisma = {
      game: { findUnique: jest.fn(), upsert: jest.fn() },
      priceSnapshot: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
    };
    const cache = { get: jest.fn(), set: jest.fn() };
    const itad = { getGameInfo: jest.fn(), getPrices: jest.fn(), searchGames: jest.fn() };
    service = new GamesService(itad as any, cache as any, prisma as any);
  });

  it('oyun DB’de yoksa boş points döner', async () => {
    prisma.game.findUnique.mockResolvedValue(null);
    const res = await service.getGameHistory('itad-x', 'TR');
    expect(res).toEqual({ region: 'TR', points: [] });
    expect(prisma.priceSnapshot.findMany).not.toHaveBeenCalled();
  });

  it('aynı günün birden çok snapshotını en ucuza indirger, günleri artan sıralar', async () => {
    prisma.game.findUnique.mockResolvedValue({ id: 'g1' });
    prisma.priceSnapshot.findMany.mockResolvedValue([
      { price: 200, fetchedAt: day('2026-07-10') },
      { price: 150, fetchedAt: day('2026-07-10') },
      { price: 180, fetchedAt: day('2026-07-12') },
    ]);
    const res = await service.getGameHistory('itad-1', 'TR');
    expect(res.region).toBe('TR');
    expect(res.points).toEqual([
      { date: '2026-07-10', price: 150 },
      { date: '2026-07-12', price: 180 },
    ]);
    const arg = prisma.priceSnapshot.findMany.mock.calls[0][0];
    expect(arg.where.gameId).toBe('g1');
    expect(arg.where.region).toBe('TR');
    expect(arg.where.fetchedAt.gte).toBeInstanceOf(Date);
  });

  it('region verilmezse DEFAULT_REGION (TR) kullanır', async () => {
    prisma.game.findUnique.mockResolvedValue(null);
    const res = await service.getGameHistory('itad-1');
    expect(res.region).toBe('TR');
  });
});

describe('GamesService.getGamePrices snapshot throttle', () => {
  let prisma: any;
  let itad: any;
  let service: GamesService;

  beforeEach(() => {
    prisma = {
      game: {
        upsert: jest.fn().mockResolvedValue({ id: 'g1', itadId: 'itad-1' }),
        findUnique: jest.fn(),
      },
      priceSnapshot: { findFirst: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const cache = { get: jest.fn().mockReturnValue(undefined), set: jest.fn() };
    itad = {
      getGameInfo: jest.fn().mockResolvedValue({ id: 'itad-1', title: 'X', slug: 'x', cover: null }),
      getPrices: jest.fn().mockResolvedValue(
        new Map([
          [
            'itad-1',
            [
              {
                shopId: 61,
                shopName: 'Steam',
                price: 150,
                currency: 'TRY',
                regular: 300,
                cut: 50,
                url: 'http://s',
              },
            ],
          ],
        ]),
      ),
      searchGames: jest.fn(),
    };
    service = new GamesService(itad as any, cache as any, prisma as any);
  });

  it('son snapshot yoksa createMany çağırır', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue(null);
    await service.getGamePrices('itad-1', 'TR');
    expect(prisma.priceSnapshot.createMany).toHaveBeenCalledTimes(1);
    const data = prisma.priceSnapshot.createMany.mock.calls[0][0].data;
    expect(data[0]).toMatchObject({
      gameId: 'g1',
      store: 'Steam',
      price: 150,
      discount: 50,
      region: 'TR',
      url: 'http://s',
    });
  });

  it('son snapshot 12 saatten yeniyse createMany çağırmaz', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue({
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    await service.getGamePrices('itad-1', 'TR');
    expect(prisma.priceSnapshot.createMany).not.toHaveBeenCalled();
  });

  it('createMany reddedilse bile fiyat döndürür (best-effort)', async () => {
    prisma.priceSnapshot.findFirst.mockResolvedValue(null);
    prisma.priceSnapshot.createMany.mockRejectedValue(new Error('db down'));
    const res = await service.getGamePrices('itad-1', 'TR');
    expect(res.prices.length).toBe(1);
  });
});
