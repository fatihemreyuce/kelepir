'use client';

import { REGIONS } from '@/lib/regions';

export function RegionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <select
      aria-label="Bölge seç"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      {REGIONS.map((r) => (
        <option key={r.code} value={r.code} className="bg-surface text-bone">
          {r.label}
        </option>
      ))}
    </select>
  );
}
