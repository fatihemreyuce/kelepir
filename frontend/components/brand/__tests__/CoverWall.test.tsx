import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CoverWall } from '../CoverWall';
import { POPULAR_COVERS } from '@/lib/popular-covers';

describe('CoverWall', () => {
  it('renders one decorative cell per popular cover', () => {
    const { container } = render(<CoverWall />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelectorAll('[data-cover]')).toHaveLength(POPULAR_COVERS.length);
  });

  it('sets a background image on each cell', () => {
    const { container } = render(<CoverWall />);
    const first = container.querySelector('[data-cover]') as HTMLElement;
    expect(first.style.backgroundImage).toContain('url(');
  });
});
