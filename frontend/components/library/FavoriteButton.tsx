'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';

export function FavoriteButton({ itadId }: { itadId: string }) {
  const { user } = useAuth();
  const { favorites, addFavorite, removeFavorite, isMutating } = useFavorites();
  const [needLogin, setNeedLogin] = useState(false);

  const fav = favorites.find((f) => f.game.itadId === itadId);
  const isFav = Boolean(fav);

  async function onClick() {
    if (!user) {
      setNeedLogin(true);
      return;
    }
    if (fav) {
      await removeFavorite(fav.id);
    } else {
      await addFavorite(itadId);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={isFav ? 'secondary' : 'outline'}
        size="sm"
        aria-pressed={isFav}
        aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        disabled={isMutating}
        onClick={() => void onClick()}
      >
        <Heart className={isFav ? 'fill-coral text-coral' : ''} />
        {isFav ? 'Favoride' : 'Favorile'}
      </Button>
      {needLogin && (
        <p className="font-mono text-xs text-muted-2">
          Önce{' '}
          <Link href="/giris" className="text-coral hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
    </div>
  );
}
