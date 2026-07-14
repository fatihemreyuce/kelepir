'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { Alert } from '@/lib/alerts-api';
import { formatPrice, initialOf } from '@/lib/format';

export function AlertRow({
  alert,
  onRemove,
  removing,
}: {
  alert: Alert;
  onRemove: () => void;
  removing?: boolean;
}) {
  const { game } = alert;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <Link
        href={`/oyun/${game.itadId}`}
        className="flex min-w-0 flex-1 items-center gap-3 hover:text-coral"
      >
        <span className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
          {game.cover ? (
            <img src={game.cover} alt={game.title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-sm font-bold text-muted-2">
              {initialOf(game.title)}
            </span>
          )}
        </span>
        <span className="truncate font-body text-sm text-bone">{game.title}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden font-mono text-xs text-muted-2 sm:inline">
          {alert.region}
        </span>
        {alert.isActive && (
          <span className="rounded bg-savings px-2 py-0.5 font-mono text-xs font-bold text-ink">
            aktif
          </span>
        )}
        <span className="font-mono text-sm tabular-nums text-bone">
          ≤ {formatPrice(Number(alert.targetPrice), alert.currency)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`${game.title} alarmını sil`}
          className="text-muted-2 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}
