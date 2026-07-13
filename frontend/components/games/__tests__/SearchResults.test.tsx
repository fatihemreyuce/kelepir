import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchResults } from '../SearchResults';
import { gamesApi } from '@/lib/games-api';

vi.mock('@/lib/games-api', () => ({
  gamesApi: { search: vi.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('SearchResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('2 karakterden kısa terimde istek atmaz ve boş kalır', () => {
    renderWithClient(<SearchResults query="a" />);
    expect(gamesApi.search).not.toHaveBeenCalled();
  });

  it('sonuç gelince kartları listeler', async () => {
    vi.mocked(gamesApi.search).mockResolvedValue([
      { itadId: 'x', slug: 'witcher', title: 'Witcher', cover: null },
    ]);
    renderWithClient(<SearchResults query="witcher" />);
    expect(await screen.findByText('Witcher')).toBeInTheDocument();
  });

  it('boş sonuçta "bulunamadı" mesajı gösterir', async () => {
    vi.mocked(gamesApi.search).mockResolvedValue([]);
    renderWithClient(<SearchResults query="zzzz" />);
    expect(await screen.findByText(/bulunamadı/i)).toBeInTheDocument();
  });

  it('hata durumunda hata mesajı gösterir', async () => {
    vi.mocked(gamesApi.search).mockRejectedValue(new Error('patladı'));
    renderWithClient(<SearchResults query="witcher" />);
    expect(await screen.findByText(/ters gitti/i)).toBeInTheDocument();
  });
});
