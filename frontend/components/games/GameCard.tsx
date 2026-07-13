import Link from 'next/link';
import type { SearchItem } from '@/lib/games-api';
import { initialOf } from '@/lib/format';

export function GameCard({ item }: { item: SearchItem }) {
  const initial = initialOf(item.title);
  return (
    <Link
      href={`/oyun/${item.itadId}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <div className="aspect-[3/4] w-full bg-surface-2">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-muted-2">
            {initial}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm font-semibold leading-snug text-bone">
          {item.title}
        </h3>
      </div>
    </Link>
  );
}
