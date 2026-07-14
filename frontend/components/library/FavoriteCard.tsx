'use client';

import { X } from 'lucide-react';
import { GameCard } from '@/components/games/GameCard';
import type { SearchItem } from '@/lib/games-api';

export function FavoriteCard({
  game,
  onRemove,
  removing,
}: {
  game: SearchItem;
  onRemove: () => void;
  removing?: boolean;
}) {
  return (
    <div className="relative">
      <GameCard item={game} />
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={`${game.title} favorilerden çıkar`}
        className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-muted-2 hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral disabled:opacity-50"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
