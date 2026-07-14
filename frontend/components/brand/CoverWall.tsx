import { POPULAR_COVERS } from '@/lib/popular-covers';
import { cn } from '@/lib/utils';

// Dekoratif "gece pazarı" kapak duvarı: popüler oyun kapaklarından bir grid.
// Opaklık/perde/ışıma çağıran ebeveyne bırakılır (bu bileşen sadece grid + görseller).
export function CoverWall({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('grid h-full w-full gap-1.5', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {POPULAR_COVERS.map((url, i) => (
        <div
          key={i}
          data-cover
          className="aspect-[3/4] rounded-md bg-surface-2 bg-cover bg-center"
          style={{ backgroundImage: `url('${url}')` }}
        />
      ))}
    </div>
  );
}
