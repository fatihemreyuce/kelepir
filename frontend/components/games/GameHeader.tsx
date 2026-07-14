import type { ReactNode } from 'react';
import Link from 'next/link';
import { RegionSelect } from './RegionSelect';
import { initialOf, formatPrice } from '@/lib/format';

// Sinematik hero: bulanık kapak banner'ı + keskin kapak + başlık + meta
// (favori + bölge) + en-ucuz rozeti + geri linki.
export function GameHeader({
  title,
  cover,
  region,
  onRegionChange,
  storeCount,
  cheapestPrice,
  cheapestCut,
  savings,
  currency,
  favoriteSlot,
}: {
  title: string;
  cover: string | null;
  region: string;
  onRegionChange: (code: string) => void;
  storeCount: number;
  cheapestPrice?: number;
  cheapestCut?: number;
  savings?: number;
  currency: string | null;
  favoriteSlot: ReactNode;
}) {
  const initial = initialOf(title);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line">
      {/* bulanık kapak fonu */}
      {cover && (
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(22,19,17,.35) 0%, rgba(22,19,17,.75) 55%, var(--ink) 98%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-12 right-10 h-56 w-56 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,90,60,.30), transparent 62%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-4 p-6 sm:p-8">
        <Link
          href="/"
          className="w-fit font-mono text-xs text-bone/70 transition-colors hover:text-coral"
        >
          ← Arama sonuçlarına dön
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
              {cover ? (
                <img
                  src={cover}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-muted-2">
                  {initial}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,.55)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-1 font-mono text-xs text-bone/70">
                {storeCount > 0
                  ? `${storeCount} mağazada satışta`
                  : 'Bu bölgede satışta değil'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {favoriteSlot}
                <RegionSelect value={region} onChange={onRegionChange} />
              </div>
            </div>
          </div>

          {cheapestPrice !== undefined && (
            <div className="text-left sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-savings">
                şu an en ucuz
              </p>
              <p className="font-display text-2xl font-extrabold text-white">
                {formatPrice(cheapestPrice, currency)}
              </p>
              {(cheapestCut || savings) && (
                <span className="mt-1 inline-block rounded-full bg-savings px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                  {cheapestCut ? `-%${cheapestCut}` : ''}
                  {cheapestCut && savings ? ' · ' : ''}
                  {savings ? `${formatPrice(savings, currency)} kâr` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
