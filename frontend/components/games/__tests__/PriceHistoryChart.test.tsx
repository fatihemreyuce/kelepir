import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceHistoryChart } from '../PriceHistoryChart';

const mockHook = vi.fn();
vi.mock('@/hooks/use-price-history', () => ({
  usePriceHistory: (...args: unknown[]) => mockHook(...args),
}));

describe('PriceHistoryChart', () => {
  beforeEach(() => mockHook.mockReset());

  it('yeterli veri yoksa (0-1 nokta) boş durum mesajı', () => {
    mockHook.mockReturnValue({
      points: [{ date: '2026-07-10', price: 100 }],
      isPending: false,
      isError: false,
    });
    render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(screen.getByText(/yeterli veri/i)).toBeInTheDocument();
  });

  it('yüklenirken skeleton (status) gösterir', () => {
    mockHook.mockReturnValue({ points: [], isPending: true, isError: false });
    render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hata olduğunda hiçbir şey render etmez', () => {
    mockHook.mockReturnValue({ points: [], isPending: false, isError: true });
    const { container } = render(
      <PriceHistoryChart itadId="i" region="TR" currency="TRY" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('yeterli veri varsa 90 günün en düşüğünü gösterir', () => {
    mockHook.mockReturnValue({
      points: [
        { date: '2026-07-10', price: 200 },
        { date: '2026-07-11', price: 149 },
        { date: '2026-07-12', price: 180 },
      ],
      isPending: false,
      isError: false,
    });
    render(<PriceHistoryChart itadId="i" region="TR" currency="TRY" />);
    expect(screen.getByText(/90 günün en düşüğü/i)).toBeInTheDocument();
    expect(screen.getByText(/149/)).toBeInTheDocument();
  });
});
