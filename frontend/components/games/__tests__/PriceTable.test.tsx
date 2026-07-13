import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceTable } from '../PriceTable';
import type { GamePriceRow } from '@/lib/games-api';

const rows: GamePriceRow[] = [
  { shopId: 1, shopName: 'Steam', price: 179, currency: 'TRY', regular: 359, cut: 50, url: 'http://steam', isCheapest: true },
  { shopId: 2, shopName: 'Epic', price: 219, currency: 'TRY', regular: 219, cut: 0, url: 'http://epic', isCheapest: false },
];

describe('PriceTable', () => {
  it('mağaza satırlarını ve mağazaya git linklerini gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText('Steam')).toBeInTheDocument();
    expect(screen.getByText('Epic')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /mağazaya git/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'http://steam');
  });

  it('en ucuz satırda "en ucuz" rozeti gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText(/en ucuz/i)).toBeInTheDocument();
  });

  it('indirim (cut>0) olan satırda yüzde etiketi gösterir', () => {
    render(<PriceTable prices={rows} currency="TRY" />);
    expect(screen.getByText('-%50')).toBeInTheDocument();
  });

  it('fiyat yoksa boş durum mesajı gösterir', () => {
    render(<PriceTable prices={[]} currency={null} />);
    expect(screen.getByText(/bu bölgede fiyat bulunamadı/i)).toBeInTheDocument();
  });
});
