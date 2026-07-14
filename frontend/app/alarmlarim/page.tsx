'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';
import { AuthGate } from '@/components/library/AuthGate';
import { AlertRow } from '@/components/library/AlertRow';
import { Skeleton } from '@/components/ui/skeleton';

export default function AlarmlarimPage() {
  const { user, loading } = useAuth();
  const { alerts, isLoading, isError, refetch, removeAlert, isMutating } = useAlerts();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold">Alarmlarım</h1>

      {loading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !user ? (
        <div className="mt-6">
          <AuthGate />
        </div>
      ) : isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 font-mono text-sm text-destructive">
          Alarmlar yüklenemedi.{' '}
          <button type="button" onClick={() => refetch()} className="text-coral hover:underline">
            Tekrar dene
          </button>
        </p>
      ) : alerts.length === 0 ? (
        <p className="mt-6 font-mono text-sm text-muted-2">
          Henüz alarm yok.{' '}
          <Link href="/" className="text-coral hover:underline">
            Bir oyun bul
          </Link>
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              removing={isMutating}
              onRemove={() => void removeAlert(a.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
