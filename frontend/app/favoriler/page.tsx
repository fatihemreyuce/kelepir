'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { AuthGate } from '@/components/library/AuthGate';
import { FavoriteCard } from '@/components/library/FavoriteCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function FavorilerPage() {
  const { user, loading } = useAuth();
  const { favorites, isLoading, isError, refetch, removeFavorite, isMutating } = useFavorites();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Favoriler</h1>

      {loading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !user ? (
        <div className="mt-6">
          <AuthGate />
        </div>
      ) : isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 font-mono text-sm text-destructive">
          Favoriler yüklenemedi.{' '}
          <button type="button" onClick={() => refetch()} className="text-coral hover:underline">
            Tekrar dene
          </button>
        </p>
      ) : favorites.length === 0 ? (
        <p className="mt-6 font-mono text-sm text-muted-2">
          Henüz favori yok.{' '}
          <Link href="/" className="text-coral hover:underline">
            Bir oyun bul
          </Link>
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {favorites.map((f) => (
            <FavoriteCard
              key={f.id}
              game={f.game}
              removing={isMutating}
              onRemove={() => void removeFavorite(f.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
