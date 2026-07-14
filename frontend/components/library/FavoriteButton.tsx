'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { ApiError } from '@/lib/api';

export function FavoriteButton({ itadId }: { itadId: string }) {
  const { user } = useAuth();
  const { favorites, addFavorite, removeFavorite, isMutating } = useFavorites();
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fav = favorites.find((f) => f.game.itadId === itadId);
  const isFav = Boolean(fav);

  async function onClick() {
    setError(null);
    if (!user) {
      setNeedLogin(true);
      return;
    }
    setNeedLogin(false);
    try {
      if (fav) {
        await removeFavorite(fav.id);
      } else {
        await addFavorite(itadId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem başarısız.');
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={isFav ? 'secondary' : 'outline'}
        size="sm"
        aria-pressed={isFav}
        aria-label={isFav ? 'Favoride, favorilerden çıkar' : 'Favorile, favorilere ekle'}
        disabled={isMutating}
        onClick={() => void onClick()}
      >
        <Heart className={isFav ? 'fill-coral text-coral' : ''} />
        {isFav ? 'Favoride' : 'Favorile'}
      </Button>
      {needLogin && (
        <p role="status" className="font-mono text-xs text-muted-2">
          Önce{' '}
          <Link href="/giris" className="text-coral hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="font-mono text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
