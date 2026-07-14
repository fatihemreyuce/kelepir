import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlarmlarimPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';

vi.mock('@/context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/use-alerts', () => ({ useAlerts: vi.fn() }));

const baseAlerts = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  addAlert: vi.fn(),
  removeAlert: vi.fn(),
  isMutating: false,
};

describe('AlarmlarimPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('giriş yoksa AuthGate gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({ ...baseAlerts, alerts: [] } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByRole('link', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('boş listede bilgilendirme gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({ ...baseAlerts, alerts: [] } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByText(/henüz alarm yok/i)).toBeInTheDocument();
  });

  it('alarmları gösterir', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, loading: false } as never);
    vi.mocked(useAlerts).mockReturnValue({
      ...baseAlerts,
      alerts: [
        {
          id: 'a1',
          targetPrice: '149.99',
          region: 'TR',
          currency: 'TRY',
          isActive: true,
          createdAt: '',
          game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null },
        },
      ],
    } as never);
    render(<AlarmlarimPage />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
  });
});
