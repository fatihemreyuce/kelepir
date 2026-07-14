import { KelepirStamp } from '@/components/brand/KelepirStamp';
import { CoverWall } from '@/components/brand/CoverWall';

// "B-canlı": sağ sütun — canlı kapak duvarı + forma doğru koyulaşan perde +
// coral ışıma; üstünde gece pazarı başlığı ve iki eğik fiyat etiketi.
export function AuthAside() {
  return (
    <aside className="relative hidden min-h-[28rem] overflow-hidden rounded-2xl border border-line md:flex">
      {/* kapak duvarı */}
      <div className="absolute inset-0 scale-105">
        <CoverWall columns={4} />
      </div>
      {/* perde: sola (forma) doğru koyulaşan yanal + alttan karartma */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, var(--ink) 0%, rgba(22,19,17,.4) 42%, transparent 78%), linear-gradient(180deg, transparent 38%, var(--ink) 96%)',
        }}
      />
      {/* coral ışıma */}
      <div
        className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,90,60,.38), transparent 62%)',
        }}
      />
      {/* içerik */}
      <div className="relative z-10 flex flex-col justify-end gap-4 p-8">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-coral">
          <span className="inline-block size-2 rounded-full bg-savings shadow-[0_0_8px_#2fbf71]" />
          gece pazarı açık
        </p>
        <h2 className="font-display text-4xl font-extrabold leading-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,.6)]">
          En ucuzu bul.
          <br />
          Kelepiri kaçırma.
        </h2>
        <p className="max-w-sm font-body text-sm text-bone/80 [text-shadow:0_1px_10px_rgba(0,0,0,.7)]">
          Steam, Epic, GOG ve fazlasında fiyatları karşılaştır. Hedef fiyata
          düşünce sana haber verelim.
        </p>
        <div className="mt-2 flex items-end gap-3">
          <KelepirStamp discount={70} price="149,99 ₺" regular="499,99 ₺" />
          <KelepirStamp discount={45} tone="savings" label="DÜŞTÜ" className="rotate-3" />
        </div>
      </div>
    </aside>
  );
}
