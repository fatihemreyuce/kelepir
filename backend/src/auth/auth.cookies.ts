import { Response } from 'express';

const isProd = () => process.env.NODE_ENV === 'production';

const base = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd(),
  path: '/',
});

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 dk
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 gün

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie('access_token', tokens.accessToken, {
    ...base(),
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...base(),
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', base());
  res.clearCookie('refresh_token', base());
}
