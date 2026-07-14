import {
  siSteam,
  siEpicgames,
  siGogdotcom,
  siHumblebundle,
  siUbisoft,
} from 'simple-icons';
import { initialOf } from '@/lib/format';
import { cn } from '@/lib/utils';

// Mağaza adı → marka ikonu. Renkler koyu karoda okunur olacak şekilde seçildi
// (Steam/Epic/Ubisoft marka hex'i siyah → bone'a çevrildi; GOG moru açıldı).
interface Brand {
  match: RegExp;
  title: string;
  path: string;
  color: string;
}

const BRANDS: Brand[] = [
  { match: /steam/i, title: 'Steam', path: siSteam.path, color: '#f2ebe3' },
  { match: /epic/i, title: 'Epic Games', path: siEpicgames.path, color: '#f2ebe3' },
  { match: /gog/i, title: 'GOG.com', path: siGogdotcom.path, color: '#c07ec4' },
  { match: /humble/i, title: 'Humble', path: siHumblebundle.path, color: '#f06a3f' },
  { match: /ubisoft|uplay/i, title: 'Ubisoft', path: siUbisoft.path, color: '#f2ebe3' },
];

function isMicrosoft(name: string): boolean {
  return /microsoft|xbox|windows store/i.test(name);
}

const TILE =
  'flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2';

export function StoreIcon({
  shopName,
  className,
}: {
  shopName: string;
  className?: string;
}) {
  if (isMicrosoft(shopName)) {
    return (
      <span className={cn(TILE, className)} role="img" aria-label={shopName}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1" y="1" width="10" height="10" fill="#f25022" />
          <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
          <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
          <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
        </svg>
      </span>
    );
  }

  const brand = BRANDS.find((b) => b.match.test(shopName));
  if (brand) {
    return (
      <span className={cn(TILE, className)} role="img" aria-label={brand.title}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={brand.color}
          aria-hidden="true"
        >
          <path d={brand.path} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn(TILE, 'font-display text-sm font-bold text-muted-2', className)}
      role="img"
      aria-label={shopName}
    >
      {initialOf(shopName)}
    </span>
  );
}
