import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ilk render anlık değeri döner', () => {
    const { result } = renderHook(() => useDebounce('a', 300));
    expect(result.current).toBe('a');
  });

  it('gecikme dolmadan eski değeri, dolunca yeni değeri döner', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebounce(v, 300),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'ab' });
    expect(result.current).toBe('a'); // henüz gecikme dolmadı
    // act() ile sarmalıyoruz: sahte zamanlayıcıyı ilerletmek state güncellemesi
    // tetikler, bu güncelleme React'in batch'i içinde flush edilmeli.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('ab');
  });
});
