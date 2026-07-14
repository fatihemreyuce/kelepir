import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { alertsApi } from '../alerts-api';

describe('alertsApi', () => {
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

  it('list: targetPrice string kalır, game normalize edilir', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'a1',
          targetPrice: '149.99',
          region: 'TR',
          currency: 'TRY',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          game: { id: 'g1', itadId: 'abc', slug: 'w3', title: 'W3', coverUrl: null },
        },
      ],
    });
    const res = await alertsApi.list();
    expect(res[0].targetPrice).toBe('149.99');
    expect(res[0].game).toEqual({ itadId: 'abc', slug: 'w3', title: 'W3', cover: null });
  });

  it('add: POST /alerts gövdesiyle itadId + targetPrice + region gönderir', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    await alertsApi.add({ itadId: 'abc', targetPrice: 90, region: 'DE' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/alerts');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('remove: DELETE /alerts/:id atar', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    await alertsApi.remove('a1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/alerts/a1');
    expect(init.method).toBe('DELETE');
  });
});
