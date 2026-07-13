import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KelepirStamp } from '@/components/brand/KelepirStamp';

describe('KelepirStamp', () => {
  it('indirim ve fiyatı gösterir, erişilebilir etikete sahip', () => {
    render(<KelepirStamp discount={70} price="149,99 ₺" regular="499,99 ₺" />);
    expect(screen.getByText('-%70')).toBeInTheDocument();
    expect(screen.getByText('149,99 ₺')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /yüzde 70 indirim/i })).toBeInTheDocument();
  });
});
