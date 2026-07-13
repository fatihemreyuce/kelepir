import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBox } from '../SearchBox';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/games-api', () => ({
  gamesApi: { search: vi.fn().mockResolvedValue([]) },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('SearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('URL senkronunu ancak debounce (300ms) dolunca ?q= ile bir kez yapar', () => {
    renderWithClient(<SearchBox />);
    const input = screen.getByRole('searchbox', { name: 'Oyun ara' });

    act(() => {
      fireEvent.change(input, { target: { value: 'witcher' } });
    });

    // Debounce dolmadan router.replace çağrılmamalı.
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Debounce dolunca tam bir kez, q=witcher içeren URL ile çağrılmalı.
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).toContain('q=witcher');
    expect(replaceMock.mock.calls[0][1]).toEqual({ scroll: false });
  });
});
