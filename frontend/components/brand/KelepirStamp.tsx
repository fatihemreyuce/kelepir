import { cn } from '@/lib/utils';

interface KelepirStampProps {
  discount: number; // ör. 70 -> "-%70"
  price?: string; // ör. "149,99 ₺"
  regular?: string; // üstü çizili
  label?: string; // varsayılan "EN UCUZ"
  tone?: 'coral' | 'savings'; // coral = normal etiket, savings = "düştü" yeşil
  className?: string;
}

export function KelepirStamp({
  discount,
  price,
  regular,
  label = 'EN UCUZ',
  tone = 'coral',
  className = '',
}: KelepirStampProps) {
  return (
    <div
      className={cn(
        'relative inline-flex -rotate-3 flex-col rounded-lg border px-5 py-4 text-coral-ink shadow-lg',
        tone === 'savings'
          ? 'border-savings/40 bg-savings'
          : 'border-coral/40 bg-coral',
        className,
      )}
      role="img"
      aria-label={`${label}: yüzde ${discount} indirim${price ? `, ${price}` : ''}`}
    >
      {/* delik (die-cut) */}
      <span className="absolute -top-2 left-4 h-3 w-3 rounded-full bg-ink" aria-hidden />
      <span className="font-mono text-xs font-bold uppercase tracking-widest">
        {label}
      </span>
      <span className="mt-1 font-display text-3xl font-extrabold leading-none">
        -%{discount}
      </span>
      {price && (
        <span className="mt-2 font-mono text-sm">
          {regular && <s className="mr-2 text-coral-ink/60">{regular}</s>}
          <span className="font-bold">{price}</span>
        </span>
      )}
    </div>
  );
}
