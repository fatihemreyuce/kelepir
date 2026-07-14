'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button, buttonVariants } from '@/components/ui/button';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Kelepir ana sayfa">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-2 font-body text-sm sm:gap-3">
          {!loading && user ? (
            <>
              <Link href="/favoriler" className="text-muted-2 hover:text-bone">
                Favoriler
              </Link>
              <Link href="/alarmlarim" className="text-muted-2 hover:text-bone">
                Alarmlarım
              </Link>
              <Button variant="secondary" size="sm" onClick={() => void logout()}>
                Çıkış
              </Button>
            </>
          ) : (
            !loading && (
              <>
                <Link href="/giris" className="text-muted-2 hover:text-bone">
                  Giriş
                </Link>
                <Link href="/kayit" className={buttonVariants({ size: 'sm' })}>
                  Kayıt ol
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
