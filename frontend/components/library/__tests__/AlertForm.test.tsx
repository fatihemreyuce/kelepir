import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertForm } from '../AlertForm';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/context/auth-context';

vi.mock('@/hooks/use-alerts', () => ({ useAlerts: vi.fn() }));
vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));

const addAlert = vi.fn().mockResolvedValue(undefined);

function mockAlerts() {
  vi.mocked(useAlerts).mockReturnValue({
    alerts: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    addAlert,
    removeAlert: vi.fn(),
    isMutating: false,
  } as never);
}

describe('AlertForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlerts();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
  });

  it('cheapestPrice ile input ön-dolu gelir (%90 altı)', () => {
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={100} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(90);
  });

  it('submit addAlert çağırır (itadId, targetPrice, region)', async () => {
    render(<AlertForm itadId="abc" region="DE" cheapestPrice={100} />);
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).toHaveBeenCalledWith({ itadId: 'abc', targetPrice: 90, region: 'DE' });
  });

  it('geçersiz (0) fiyatta doğrulama hatası, addAlert çağrılmaz', async () => {
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={undefined} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).not.toHaveBeenCalled();
    expect(screen.getByText(/geçerli bir hedef fiyat/i)).toBeInTheDocument();
  });

  it('giriş yoksa tıklayınca giriş ipucu, addAlert çağrılmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    render(<AlertForm itadId="abc" region="TR" cheapestPrice={100} />);
    await userEvent.click(screen.getByRole('button', { name: /alarm kur/i }));
    expect(addAlert).not.toHaveBeenCalled();
    expect(screen.getByText(/giriş yap/i)).toBeInTheDocument();
  });
});
