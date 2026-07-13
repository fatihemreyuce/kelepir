import { KelepirStamp } from '@/components/brand/KelepirStamp';

export function AuthAside() {
  return (
    <aside className="hidden flex-col gap-8 md:flex">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-coral">
          gece pazarı
        </p>
        <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight">
          En ucuzu bul.
          <br />
          Kelepiri kaçırma.
        </h2>
        <p className="mt-4 max-w-sm text-muted-2">
          Steam, Epic, GOG ve fazlasında fiyatları karşılaştır. Hedef fiyata
          düşünce sana haber verelim.
        </p>
      </div>
      <KelepirStamp discount={70} price="149,99 ₺" regular="499,99 ₺" />
    </aside>
  );
}
