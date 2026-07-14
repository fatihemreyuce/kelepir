'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatPrice } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  coral: '#ff5a3c',
  savings: '#2fbf71',
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

  const min = points.length ? Math.min(...points.map((p) => p.price)) : undefined;
  const minPoint =
    min !== undefined ? points.find((p) => p.price === min) : undefined;

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-extrabold text-bone">
          Fiyat geçmişi
        </h2>
        <span className="font-mono text-[11px] text-muted-2">son 90 gün</span>
      </div>

      {isPending ? (
        <Skeleton className="mt-3 h-48 w-full" role="status" aria-label="Yükleniyor" />
      ) : points.length < 2 ? (
        <p className="mt-3 font-mono text-sm text-muted-2">
          Fiyat geçmişi için yeterli veri henüz yok.
        </p>
      ) : (
        <>
          {min !== undefined && (
            <p className="mt-1 font-mono text-[11px] text-muted-2">
              90 günün en düşüğü{' '}
              <span className="font-bold text-savings">
                {formatPrice(min, currency)}
              </span>
            </p>
          )}
          <div
            className="mt-3 h-48 w-full"
            role="img"
            aria-label="Fiyat geçmişi grafiği"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
              >
                <defs>
                  <linearGradient id="ph-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.coral} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={COLORS.coral} stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={COLORS.coral}
                  strokeWidth={2}
                  fill="url(#ph-fill)"
                  dot={false}
                />
                {minPoint && (
                  <ReferenceDot
                    x={minPoint.date}
                    y={minPoint.price}
                    r={4}
                    fill={COLORS.savings}
                    stroke={COLORS.surface}
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
