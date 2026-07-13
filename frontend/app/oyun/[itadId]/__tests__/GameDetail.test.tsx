import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameDetail } from '../GameDetail';
import { gamesApi } from '@/lib/games-api';
import { ApiError } from '@/lib/api';
import type { GamePrices } from '@/lib/games-api';

const pushSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

vi.mock('@/lib/games-api', () => ({
  gamesApi: { prices: vi.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const validPrices: GamePrices = {
  game: { itadId: 'abc', slug: 'witcher', title: 'The Witcher 3', cover: null },
  region: 'TR',
  currency: 'TRY',
  prices: [
    {
      shopId: 1,
      shopName: 'Steam',
      price: 100,
      currency: 'TRY',
      regular: 200,
      cut: 50,
      url: 'http://steam.example/x',
      isCheapest: true,
    },
  ],
};

describe('GameDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404 döndüğünde "Oyun bulunamadı" mesajını gösterir', async () => {
    vi.mocked(gamesApi.prices).mockRejectedValue(
      new ApiError(404, 'not found'),
    );
    renderWithClient(<GameDetail itadId="abc" region="TR" />);
    expect(await screen.findByText(/Oyun bulunamadı/i)).toBeInTheDocument();
  });

  it('bölge değiştirildiğinde push, region parametresi ve scroll:false ile çağrılır', async () => {
    vi.mocked(gamesApi.prices).mockResolvedValue(validPrices);
    renderWithClient(<GameDetail itadId="abc" region="TR" />);

    const select = await screen.findByRole('combobox');
    const user = userEvent.setup();
    await user.selectOptions(select, 'DE');

    expect(pushSpy).toHaveBeenCalledWith(
      expect.stringContaining('region=DE'),
      { scroll: false },
    );
  });
});
