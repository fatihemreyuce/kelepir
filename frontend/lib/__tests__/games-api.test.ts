import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gamesApi } from '../games-api';

describe('gamesApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('search: q parametresini encode edip GET atar', async () => {
    await gamesApi.search('witcher 3');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/search?q=witcher%203');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('prices: itadId ve region ile GET atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await gamesApi.prices('abc123', 'US');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/abc123/prices?region=US');
  });
});
