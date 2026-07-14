import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title, description and a CTA link', () => {
    render(
      <EmptyState
        icon={<span>🏷️</span>}
        title="Henüz favori yok"
        description="Beğendiğin oyunları kaydet."
        ctaHref="/"
        ctaLabel="Oyun ara"
      />,
    );
    expect(screen.getByText('Henüz favori yok')).toBeInTheDocument();
    expect(screen.getByText('Beğendiğin oyunları kaydet.')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Oyun ara/ });
    expect(cta).toHaveAttribute('href', '/');
  });
});
