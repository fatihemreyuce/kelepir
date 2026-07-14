import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PopularChips, POPULAR_QUERIES } from '../PopularChips';

describe('PopularChips', () => {
  it('renders every popular query as a chip', () => {
    render(<PopularChips onPick={() => {}} />);
    for (const q of POPULAR_QUERIES) {
      expect(screen.getByRole('button', { name: q })).toBeInTheDocument();
    }
  });

  it('calls onPick with the chip label when clicked', async () => {
    const onPick = vi.fn();
    render(<PopularChips onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: POPULAR_QUERIES[0] }));
    expect(onPick).toHaveBeenCalledWith(POPULAR_QUERIES[0]);
  });
});
