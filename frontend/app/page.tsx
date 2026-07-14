import { Suspense } from 'react';
import { SearchBox } from '@/components/games/SearchBox';
import { CoverWall } from '@/components/brand/CoverWall';

export default function HomePage() {
  return (
    <main className="relative mx-auto max-w-5xl px-6 py-24">
      {/* hero bölgesi kapak-duvarı fonu — sonuçlardan önce ink'e sönümlenir */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.10]">
          <CoverWall columns={6} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(22,19,17,.55) 0%, var(--ink) 86%)',
          }}
        />
      </div>

      <div className="relative z-10">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-coral">
          <span className="inline-block size-2 rounded-full bg-savings shadow-[0_0_8px_#2fbf71]" />
          gece pazarı açık
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight">
          Kelepir
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-2">
          En ucuzu bul. Kelepiri kaçırma.
        </p>
        <Suspense fallback={null}>
          <SearchBox />
        </Suspense>
      </div>
    </main>
  );
}
