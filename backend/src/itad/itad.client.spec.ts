import { ItadClient } from './itad.client';

describe('ItadClient', () => {
  let client: ItadClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.ITAD_API_KEY = 'test-key';
    process.env.ITAD_BASE_URL = 'https://api.example.test';
    client = new ItadClient();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('searchGames doğru URL çağırır ve sonuçları map\'ler', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'uuid-1',
          slug: 'game-one',
          title: 'Game One',
          assets: { boxart: 'http://img/box.jpg' },
        },
      ],
    } as Response);

    const res = await client.searchGames('game one', 5);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/games/search/v1');
    expect(calledUrl).toContain('title=game+one');
    expect(calledUrl).toContain('results=5');
    expect(calledUrl).toContain('key=test-key');
    expect(res).toEqual([
      { id: 'uuid-1', slug: 'game-one', title: 'Game One', cover: 'http://img/box.jpg' },
    ]);
  });

  it('getPrices POST ile UUID dizisi ve country gönderir, deal\'leri map\'ler', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'uuid-1',
          deals: [
            {
              shop: { id: 61, name: 'Steam' },
              price: { amount: 149.99, currency: 'TRY' },
              regular: { amount: 299.99, currency: 'TRY' },
              cut: 50,
              url: 'http://steam/app',
            },
          ],
        },
      ],
    } as Response);

    const res = await client.getPrices(['uuid-1'], 'TR');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/games/prices/v3');
    expect(url).toContain('country=TR');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(['uuid-1']);
    expect(res.get('uuid-1')).toEqual([
      {
        shopId: 61,
        shopName: 'Steam',
        price: 149.99,
        currency: 'TRY',
        regular: 299.99,
        cut: 50,
        url: 'http://steam/app',
      },
    ]);
  });

  it('fetch ok değilse hata fırlatır', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(client.searchGames('x')).rejects.toThrow();
  });
});
