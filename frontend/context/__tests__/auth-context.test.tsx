import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../auth-context';
import { authApi } from '@/lib/auth-api';

vi.mock('@/lib/auth-api', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function Consumer() {
  const { logout, loading } = useAuth();
  if (loading) return null;
  return (
    <button type="button" onClick={() => void logout()}>
      Çıkış yap
    </button>
  );
}

describe('AuthProvider logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logout çağrıldığında query cache temizlenir', async () => {
    vi.mocked(authApi.me).mockResolvedValue(null as never);
    vi.mocked(authApi.logout).mockResolvedValue({ success: true });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const clearSpy = vi.spyOn(client, 'clear');

    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Çıkış yap' });
    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => expect(authApi.logout).toHaveBeenCalled());
    expect(clearSpy).toHaveBeenCalled();
  });
});
