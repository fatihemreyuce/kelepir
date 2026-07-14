'use client';

// Statik popüler arama önerileri — backend gerektirmez. Tıklayınca aramayı doldurur.
export const POPULAR_QUERIES = [
  'Elden Ring',
  'Hades',
  'Cyberpunk 2077',
  "Baldur's Gate 3",
  'Hollow Knight',
];

export function PopularChips({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-wide text-muted-2">
        popüler
      </span>
      {POPULAR_QUERIES.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onPick(q)}
          className="rounded-full border border-line bg-surface-2 px-3 py-1 font-body text-sm text-bone transition-colors hover:border-coral hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
