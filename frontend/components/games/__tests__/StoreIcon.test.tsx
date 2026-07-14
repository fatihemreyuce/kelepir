import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StoreIcon } from '../StoreIcon';

describe('StoreIcon', () => {
  it('renders a brand svg for Steam', () => {
    const { container } = render(<StoreIcon shopName="Steam" />);
    expect(screen.getByRole('img', { name: 'Steam' })).toBeInTheDocument();
    expect(container.querySelector('path')).toBeTruthy();
  });

  it('matches Epic Game Store by substring', () => {
    render(<StoreIcon shopName="Epic Game Store" />);
    expect(screen.getByRole('img', { name: 'Epic Games' })).toBeInTheDocument();
  });

  it('renders the four-square glyph for Microsoft Store', () => {
    const { container } = render(<StoreIcon shopName="Microsoft Store" />);
    expect(screen.getByRole('img', { name: 'Microsoft Store' })).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(4);
  });

  it('falls back to the initial for an unknown shop', () => {
    render(<StoreIcon shopName="Zoo Games" />);
    expect(screen.getByRole('img', { name: 'Zoo Games' })).toHaveTextContent('Z');
  });
});
