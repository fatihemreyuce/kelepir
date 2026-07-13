export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}
