import { api } from './api';

export interface SessionUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  register: (dto: { email: string; password: string }) =>
    api<AuthResult>('/auth/register', { method: 'POST', body: dto }),
  login: (dto: { email: string; password: string }) =>
    api<AuthResult>('/auth/login', { method: 'POST', body: dto }),
  logout: () => api<{ success: true }>('/auth/logout', { method: 'POST' }),
  me: () => api<SessionUser>('/auth/me'),
  refresh: () => api<AuthResult>('/auth/refresh', { method: 'POST' }),
};
