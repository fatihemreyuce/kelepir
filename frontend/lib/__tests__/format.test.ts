import { describe, it, expect } from 'vitest';
import { formatPrice } from '../format';

describe('formatPrice', () => {
  it('currency verilince para birimiyle formatlar', () => {
    // tr-TR locale: currency sembolü + değer; boşluk türleri değişebildiği için içeriği kontrol et
    const out = formatPrice(179.99, 'TRY');
    expect(out).toContain('179,99');
    expect(out).toMatch(/₺|TRY/);
  });

  it('USD formatlar', () => {
    const out = formatPrice(19.99, 'USD');
    expect(out).toContain('19,99');
    expect(out).toMatch(/\$|USD/);
  });

  it('currency null ise sade sayı döner (para simgesi yok)', () => {
    const out = formatPrice(50, null);
    expect(out).toBe('50,00');
  });
});
