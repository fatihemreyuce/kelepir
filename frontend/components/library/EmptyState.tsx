import type { ReactNode } from 'react';
import Link from 'next/link';
import { CoverWall } from '@/components/brand/CoverWall';

// Cilalı boş durum: loş kapak-duvarı fonu + ikon + metin + coral CTA.
export function EmptyState({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <CoverWall columns={6} />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 70% at 50% 40%, transparent, var(--ink) 90%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {icon}
        </span>
        <h2 className="font-display text-lg font-extrabold text-bone">{title}</h2>
        <p className="max-w-xs font-body text-sm text-muted-2">{description}</p>
        <Link
          href={ctaHref}
          className="mt-2 rounded-lg bg-coral px-4 py-2 font-mono text-sm font-bold text-coral-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
