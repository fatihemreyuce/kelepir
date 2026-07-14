'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useAlerts } from '@/hooks/use-alerts';
import { ApiError } from '@/lib/api';

function suggest(cheapestPrice?: number): string {
  if (cheapestPrice && cheapestPrice > 0) {
    return String(Math.max(1, Math.floor(cheapestPrice * 0.9)));
  }
  return '';
}

export function AlertForm({
  itadId,
  region,
  cheapestPrice,
}: {
  itadId: string;
  region: string;
  cheapestPrice?: number;
}) {
  const { user } = useAuth();
  const { addAlert, isMutating } = useAlerts();
  const [price, setPrice] = useState(() => suggest(cheapestPrice));
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!user) {
      setNeedLogin(true);
      return;
    }
    setNeedLogin(false);
    const target = Number(price);
    if (!Number.isFinite(target) || target <= 0) {
      setError('Geçerli bir hedef fiyat gir.');
      return;
    }
    try {
      await addAlert({ itadId, targetPrice: target, region });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Alarm kurulamadı.');
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-bone">Fiyat alarmı kur</h2>
      <p className="mt-1 font-mono text-xs text-muted-2">
        {region} bölgesinde hedef fiyatın altına düşünce e-posta al.
      </p>
      <div className="mt-3 flex items-end gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          step="0.01"
          aria-label="Hedef fiyat"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-40"
        />
        <Button type="submit" size="sm" disabled={isMutating}>
          Alarm kur
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}
      {needLogin && (
        <p role="status" className="mt-2 font-mono text-xs text-muted-2">
          Önce{' '}
          <Link href="/giris" className="text-coral hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
      {done && (
        <p role="status" className="mt-2 font-mono text-xs text-savings">
          Alarm kuruldu.{' '}
          <Link href="/alarmlarim" className="text-coral hover:underline">
            Alarmlarım
          </Link>
        </p>
      )}
    </form>
  );
}
