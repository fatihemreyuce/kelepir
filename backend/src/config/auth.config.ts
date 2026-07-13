export interface AuthConfig {
  accessSecret: string;
  accessExpires: string;
  refreshExpiresDays: number;
}

export function authConfig(): AuthConfig {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not set');
  }
  return {
    accessSecret,
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresDays: Number(process.env.REFRESH_EXPIRES_DAYS ?? '7'),
  };
}
