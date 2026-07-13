import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../api';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('base URL + credentials:include ile çağırır ve JSON döner', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });

    const res = await api<{ hello: string }>('/games/search?q=x');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/games/search?q=x');
    expect(init.credentials).toBe('include');
    expect(res).toEqual({ hello: 'world' });
  });

  it('POST gövdesini JSON serialize eder ve Content-Type ekler', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await api('/auth/login', { method: 'POST', body: { email: 'a@b.co' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co' });
  });

  it('non-ok yanıtta ApiError fırlatır (status + mesaj)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Yetkisiz' }),
    });
    await expect(api('/auth/me')).rejects.toMatchObject({
      constructor: ApiError,
      status: 401,
      message: 'Yetkisiz',
    });
  });
});
