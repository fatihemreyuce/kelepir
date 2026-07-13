import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('Kelepir başlığını gösterir', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Kelepir' }),
    ).toBeInTheDocument();
  });
});
