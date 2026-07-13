'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { SearchResults } from './SearchResults';

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounced = useDebounce(value, 300);

  function onChange(next: string) {
    setValue(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next.trim()) {
      params.set('q', next);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }

  return (
    <div className="mt-8">
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="oyun ara…"
        aria-label="Oyun ara"
        className="h-12 max-w-xl font-mono text-base"
      />
      <SearchResults query={debounced} />
    </div>
  );
}
