import type { GamePriceRow } from '@/lib/games-api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StoreIcon } from './StoreIcon';

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

  const highest = Math.max(...prices.map((p) => p.price));

  return (
    <ul className="mt-6 flex flex-col gap-2">
      {prices.map((row) => {
        const cur = currency ?? row.currency;
        const savings = highest - row.price;
        return (
          <li
            key={row.shopId}
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 sm:px-4',
              row.isCheapest
                ? 'border-savings/55 shadow-[0_0_0_1px_rgba(47,191,113,.4),0_12px_26px_rgba(47,191,113,.12)]'
                : 'border-line',
            )}
          >
            <StoreIcon shopName={row.shopName} />

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-sm font-semibold text-bone">
                  {row.shopName}
                </span>
                {row.isCheapest && (
                  <span className="rounded-full bg-savings px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
                    en ucuz
                  </span>
                )}
                {row.cut > 0 && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-bold text-savings">
                    -%{row.cut}
                  </span>
                )}
              </div>
              {savings > 0 && (
                <span className="font-mono text-[11px] text-muted-2">
                  en yüksekten −{formatPrice(savings, cur)}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  row.isCheapest ? 'text-savings' : 'text-coral',
                )}
              >
                {formatPrice(row.price, cur)}
              </span>
              {row.regular > row.price && (
                <s className="font-mono text-[11px] text-muted-2">
                  {formatPrice(row.regular, cur)}
                </s>
              )}
            </div>

            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral',
                row.isCheapest
                  ? 'bg-coral text-coral-ink hover:opacity-90'
                  : 'border border-line text-bone hover:border-coral hover:text-coral',
              )}
            >
              Mağazaya git →
            </a>
          </li>
        );
      })}
    </ul>
  );
}
