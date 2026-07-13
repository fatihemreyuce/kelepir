import type { GamePriceRow } from '@/lib/games-api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PriceTable({
  prices,
  currency,
}: {
  prices: GamePriceRow[];
  currency: string | null;
}) {
  if (prices.length === 0) {
    return (
      <p className="mt-6 font-mono text-sm text-muted-2">
        Bu bölgede fiyat bulunamadı.
      </p>
    );
  }

  return (
    <ul className="mt-6 flex flex-col gap-2">
      {prices.map((row) => (
        <li
          key={row.shopId}
          className={cn(
            'flex items-center justify-between gap-4 rounded-lg border bg-surface px-4 py-3',
            row.isCheapest ? 'border-savings' : 'border-line',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-bone">{row.shopName}</span>
            {row.isCheapest && (
              <span className="rounded bg-savings px-2 py-0.5 font-mono text-xs font-bold text-ink">
                en ucuz
              </span>
            )}
            {row.cut > 0 && (
              <span className="rounded bg-coral px-2 py-0.5 font-mono text-xs font-bold text-coral-ink">
                -%{row.cut}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                row.isCheapest ? 'text-savings' : 'text-bone',
              )}
            >
              {formatPrice(row.price, currency ?? row.currency)}
            </span>
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-coral hover:underline"
            >
              Mağazaya git →
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
