'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatPrice } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  coral: '#ff5a3c',
  line: '#3a332c',
  muted: '#9a8f84',
  surface: '#211c18',
  bone: '#f2ebe3',
};

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function PriceHistoryChart({
  itadId,
  region,
  currency,
}: {
  itadId: string;
  region: string;
  currency: string | null;
}) {
  const { points, isPending, isError } = usePriceHistory(itadId, region);

  if (isError) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-muted-2">
        Fiyat geçmişi (son 90 gün)
      </h2>
      {isPending ? (
        <Skeleton className="h-56 w-full" role="status" aria-label="Yükleniyor" />
      ) : points.length < 2 ? (
        <p className="font-mono text-sm text-muted-2">
          Fiyat geçmişi için yeterli veri henüz yok.
        </p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label="Fiyat geçmişi grafiği">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                stroke={COLORS.muted}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                minTickGap={24}
              />
              <YAxis
                stroke={COLORS.muted}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                width={64}
                tickFormatter={(v: number) => formatPrice(v, currency)}
              />
              <Tooltip
                contentStyle={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 8,
                  color: COLORS.bone,
                  fontSize: 12,
                }}
                labelFormatter={(label) => formatDay(String(label))}
                formatter={(value) => [formatPrice(Number(value), currency), 'En ucuz']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={COLORS.coral}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
