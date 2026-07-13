import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

function reqFor(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(new URL(`http://localhost:3000${path}`), { headers });
}

describe('middleware', () => {
  it('cookie yoksa korumalı sayfa /giris\'e yönlenir', () => {
    const res = middleware(reqFor('/favoriler'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/giris');
  });

  it('refresh_token cookie varsa geçer', () => {
    const res = middleware(reqFor('/favoriler', 'refresh_token=abc'));
    // NextResponse.next() -> yönlendirme yok (status 200)
    expect(res.headers.get('location')).toBeNull();
  });

  it('korumasız sayfaya dokunmaz', () => {
    const res = middleware(reqFor('/'));
    expect(res.headers.get('location')).toBeNull();
  });
});
