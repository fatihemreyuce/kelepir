import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/favoriler', '/alarmlarim'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }
  const hasSession = req.cookies.has('refresh_token');
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/giris';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/favoriler/:path*', '/alarmlarim/:path*'],
};
