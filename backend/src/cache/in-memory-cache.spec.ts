import { InMemoryCache } from './in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('set edilen değeri TTL içinde döner', () => {
    cache.set('k', { a: 1 }, 10_000);
    expect(cache.get<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('olmayan anahtar için undefined döner', () => {
    expect(cache.get('yok')).toBeUndefined();
  });

  it('süresi geçmiş anahtar undefined döner', () => {
    cache.set('k', 'v', -1); // geçmişte sona eriyor
    expect(cache.get('k')).toBeUndefined();
  });
});
