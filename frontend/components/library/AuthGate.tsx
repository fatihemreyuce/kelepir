import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export function AuthGate() {
  return (
    <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
      <p className="font-body text-sm text-muted-2">
        Bu sayfayı görmek için giriş yapmalısın.
      </p>
      <Link href="/giris" className={`${buttonVariants({ size: 'sm' })} mt-4`}>
        Giriş yap
      </Link>
    </div>
  );
}
