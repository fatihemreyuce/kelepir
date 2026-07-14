'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { SearchResults } from './SearchResults';
import { PopularChips } from './PopularChips';

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounced = useDebounce(value, 300);

  useEffect(() => {
    const term = debounced.trim();
    const current = searchParams.get('q');
    const next = term ? term : null;
    if (next === current) {
      // No change (e.g. hydrated from an existing ?q= on mount) — skip nav.
      return;
    }
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next) {
      params.set('q', next);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [debounced, router, searchParams]);

  return (
    <div className="mt-8">
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="oyun ara…"
        aria-label="Oyun ara"
        className="h-12 max-w-xl font-mono text-base"
      />
      {value.trim().length < 2 && <PopularChips onPick={setValue} />}
      <SearchResults query={debounced} />
    </div>
  );
}
