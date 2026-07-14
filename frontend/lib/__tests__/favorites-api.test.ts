import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { favoritesApi } from '../favorites-api';

describe('favoritesApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('list: coverUrl -> cover normalize eder', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'f1',
          createdAt: '2026-01-01T00:00:00.000Z',
          game: { id: 'g1', itadId: 'abc', slug: 'w3', title: 'W3', coverUrl: 'http://c/x.jpg' },
        },
      ],
    });
    const res = await favoritesApi.list();
    expect(res).toEqual([
      {
        id: 'f1',
        createdAt: '2026-01-01T00:00:00.000Z',
        game: { itadId: 'abc', slug: 'w3', title: 'W3', cover: 'http://c/x.jpg' },
      },
    ]);
  });

  it('add: POST /favorites gövdesiyle itadId gönderir', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    await favoritesApi.add('abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/favorites');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ itadId: 'abc' });
  });

  it('remove: DELETE /favorites/:id atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    await favoritesApi.remove('f1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/favorites/f1');
    expect(init.method).toBe('DELETE');
  });
});
