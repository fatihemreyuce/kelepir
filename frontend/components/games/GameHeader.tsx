import { RegionSelect } from './RegionSelect';
import { initialOf } from '@/lib/format';

export function GameHeader({
  title,
  cover,
  region,
  onRegionChange,
}: {
  title: string;
  cover: string | null;
  region: string;
  onRegionChange: (code: string) => void;
}) {
  const initial = initialOf(title);
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="h-24 w-18 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {cover ? (
            <img
              src={cover}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-muted-2">
              {initial}
            </div>
          )}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-bone">
          {title}
        </h1>
      </div>
      <RegionSelect value={region} onChange={onRegionChange} />
    </div>
  );
}
