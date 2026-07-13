import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from '../GameCard';

const base = { itadId: 'abc', slug: 'the-witcher-3', title: 'The Witcher 3' };

describe('GameCard', () => {
  it("başlığı gösterir ve /oyun/[itadId] linkine yönlendirir", () => {
    render(<GameCard item={{ ...base, cover: 'http://img/x.jpg' }} />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/oyun/abc');
  });

  it('kapak varsa görseli, yoksa baş harf fallback gösterir', () => {
    const { rerender } = render(
      <GameCard item={{ ...base, cover: 'http://img/x.jpg' }} />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://img/x.jpg');

    rerender(<GameCard item={{ ...base, cover: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // "The" baş harfi
  });
});
