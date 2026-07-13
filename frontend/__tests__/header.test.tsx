import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '@/components/layout/Header';

// useAuth'u mock'la (giriş yapmamış durum)
vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn() }),
}));

describe('Header', () => {
  it('giriş yapmamışken Giriş + Kayıt gösterir', () => {
    render(<Header />);
    expect(screen.getByText('Giriş')).toBeInTheDocument();
    expect(screen.getByText('Kayıt ol')).toBeInTheDocument();
  });
});
