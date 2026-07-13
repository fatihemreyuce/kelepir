import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const loginMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ login: loginMock, register: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
  });

  it('alanları gösterir ve submit login çağırıp yönlendirir', async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-posta'), 'a@b.co');
    await user.type(screen.getByLabelText('Şifre'), 'supersecret1');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(loginMock).toHaveBeenCalledWith('a@b.co', 'supersecret1');
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
