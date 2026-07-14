import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertRow } from '../AlertRow';
import type { Alert } from '@/lib/alerts-api';

const alert: Alert = {
  id: 'a1',
  targetPrice: '149.99',
  region: 'TR',
  currency: 'TRY',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  game: { itadId: 'abc', slug: 'w3', title: 'The Witcher 3', cover: null },
};

describe('AlertRow', () => {
  it('oyun başlığı, hedef fiyat ve bölgeyi gösterir', () => {
    render(<AlertRow alert={alert} onRemove={() => {}} />);
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByText(/149,99/)).toBeInTheDocument(); // tr-TR biçim
    expect(screen.getByText('TR')).toBeInTheDocument();
  });

  it('sil butonu onRemove çağırır', async () => {
    const onRemove = vi.fn();
    render(<AlertRow alert={alert} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /sil/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
