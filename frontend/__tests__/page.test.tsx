import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@/app/page';

// SearchBox (rendered inside HomePage) needs next/navigation's App Router
// context, which isn't present when rendering the page component in
// isolation outside of app/layout.tsx.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('HomePage', () => {
  it('Kelepir başlığını gösterir', () => {
    renderWithClient(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Kelepir' }),
    ).toBeInTheDocument();
  });
});
