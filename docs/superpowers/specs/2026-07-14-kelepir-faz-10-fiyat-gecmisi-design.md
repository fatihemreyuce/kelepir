# Faz 10 — Fiyat Geçmişi Grafiği (Tasarım)

**Tarih:** 2026-07-14
**Durum:** Onaylandı (brainstorming), plan yazılacak
**Bağlam:** Oyun detay sayfasında (`/oyun/[itadId]`) güncel mağaza fiyatlarının altına, o oyunun seçili bölgedeki fiyat trendini gösteren bir çizgi grafiği eklenir. Backend'de geçmişi okuyan bir endpoint, frontend'de Recharts ile bir grafik bileşeni.

## Kararlar (kullanıcı onaylı)

1. **Snapshot stratejisi:** Cron'a ek olarak `prices` çağrısında da snapshot yazılır (throttle'lı). Böylece yalnızca aktif alarmı olan oyunlar değil, **görüntülenen tüm oyunlar** için geçmiş birikir.
2. **Grafik içeriği:** Günlük en ucuz — tek çizgi (seçili region'a göre).
3. **Zaman penceresi:** Son 90 gün.
4. **Yerleşim:** `PriceTable`'ın altında.

## Mevcut durum (doğrulandı)

- `PriceSnapshot` modeli: `{ id, gameId, store, price(Decimal), discount(Int), region@default(TR), url, fetchedAt@default(now) }`, `@@index([gameId, fetchedAt])`. **`currency` alanı yok.**
- Cron (`price-check.service.ts`, `@Cron('0 9,21 * * *')`, günde 2×) yalnızca aktif alarmı olan oyunlar için `priceSnapshot.createMany` yazıyor.
- `games.service.ts#getGamePrices` ITAD'dan çekip `Game`'e upsert ediyor ama snapshot yazmıyor.
- Okuyan endpoint yok. Frontend'de Recharts kurulu değil.
- Backend testleri jest; games için henüz unit spec yok. Frontend testleri vitest.

## Backend

### 1. `getGamePrices`'a throttle'lı snapshot yazımı

`games.service.ts#getGamePrices` içinde, `Game.upsert` sonucunu yakala (`const game = await this.prisma.game.upsert(...)`) ve ITAD deals'i çekildikten sonra:

- **Throttle:** o `game.id` + `country` için en son snapshot'ın `fetchedAt`'ine bak; **son 12 saat** içinde snapshot varsa yazma (cron ile aynı ritim; aynı oyuna tekrar tekrar bakınca şişmez).
- Yazım cron'daki desenle aynı: `priceSnapshot.createMany({ data: deals.map(d => ({ gameId: game.id, store: d.shopName, price: d.price, discount: d.cut, region: country, url: d.url })) })`.
- **Best-effort:** try/catch ile sarılır; snapshot yazımı başarısız olursa `getGamePrices` yanıtını bozmaz, sadece `logger.warn` ile loglanır.
- `deals.length === 0` ise yazma.

Sabit: `SNAPSHOT_THROTTLE_MS = 12 * 60 * 60 * 1000`.

### 2. `getGameHistory` servisi

Yeni metod `games.service.ts#getGameHistory(itadId: string, region?: string): Promise<GameHistory>`:

1. `country = region ?? DEFAULT_REGION`.
2. `game = prisma.game.findUnique({ where: { itadId } })`. **Yoksa** → `{ region: country, points: [] }` (boş, hata değil).
3. `since = new Date(Date.now() - 90*24*60*60*1000)`.
4. `snaps = prisma.priceSnapshot.findMany({ where: { gameId: game.id, region: country, fetchedAt: { gte: since } }, orderBy: { fetchedAt: 'asc' }, select: { price, fetchedAt } })`.
5. **Kodda gün bazında grupla:** her gün (UTC `YYYY-MM-DD`) için minimum `price`. `Decimal` → `Number()`.
6. Dönüş: `{ region: country, points: [{ date, price }] }`, tarihe göre artan.

### 3. Controller endpoint

`games.controller.ts`'e `prices` deseninin aynısı:

```ts
@Get(':itadId/history')
history(@Param('itadId') itadId: string, @Query() query: PricesQueryDto) {
  return this.games.getGameHistory(itadId, query.region);
}
```

`PricesQueryDto` (opsiyonel 2-harf region) yeniden kullanılır.

### 4. Tipler

`games.types.ts`'e:

```ts
export interface GameHistoryPoint { date: string; price: number; }
export interface GameHistory { region: string; points: GameHistoryPoint[]; }
```

### 5. Backend testleri

`games.service.spec.ts` (jest unit, **DB'siz** — `PrismaService`/`ItadClient`/`InMemoryCache` mock'lanır):

- `getGameHistory`: game yoksa `points: []`; snapshot'lar gün bazında en ucuza indirgeniyor (aynı günde 3 snapshot → 1 nokta, min fiyat); farklı günler artan sıralı; region filtresi geçiyor.
- `getGamePrices` snapshot throttle: son snapshot 12 saatten eski/yok → `createMany` çağrılır; 12 saatten yeni → çağrılmaz; `createMany` reddedilse bile `getGamePrices` yine de fiyat döndürür (best-effort).

## Frontend

### 1. API katmanı

`lib/games-api.ts`'e tipler + çağrı:

```ts
export interface GameHistoryPoint { date: string; price: number; }
export interface GameHistory { region: string; points: GameHistoryPoint[]; }
// gamesApi.history:
history: (itadId, region) => api<GameHistory>(`/games/${enc(itadId)}/history?region=${enc(region)}`)
```

### 2. Hook

`hooks/use-price-history.ts` — public (auth gate yok):

```ts
useQuery({ queryKey: ['price-history', itadId, region], queryFn: () => gamesApi.history(itadId, region), placeholderData: keepPreviousData })
```

`{ points, isPending, isError }` benzeri döndürür.

### 3. Bileşen — `PriceHistoryChart`

`components/games/PriceHistoryChart.tsx`, `'use client'`. Props: `{ itadId, region, currency }` (currency GameDetail'deki güncel `prices` yanıtından gelir). İçeride `usePriceHistory` çağrılır.

Durumlar:
- **isPending:** `Skeleton` (grafik yüksekliğinde).
- **isError:** sessiz — bölüm hiç render edilmez (grafik ikincil, hata detay sayfasını bozmasın). `null` döner.
- **points.length < 2:** boş durum — "Fiyat geçmişi için yeterli veri henüz yok." (grafik en az 2 nokta ister).
- **Aksi halde:** Recharts `ResponsiveContainer` + `LineChart`.

Grafik (Gece Pazarı teması, sabit hex — Recharts SVG'de CSS var riskli):
- Çizgi: `stroke="#ff5a3c"` (coral), `dot=false`, `strokeWidth={2}`, `type="monotone"`.
- `CartesianGrid` `stroke="#3a332c"` (line).
- `XAxis dataKey="date"` — tick `tr-TR` kısa (gün/ay), `stroke="#9a8f84"`.
- `YAxis` — `formatPrice` ile, `stroke="#9a8f84"`, dar genişlik.
- `Tooltip` — `surface` (#211c18) arka plan, `bone` metin, tarih + `formatPrice(price, currency)`.
- Başlık: "Fiyat geçmişi (son 90 gün)" küçük mono etiket, `role` uygun.

### 4. GameDetail entegrasyonu

`app/oyun/[itadId]/GameDetail.tsx`'te `PriceTable`'dan sonra, `AlertForm`'dan önce/sonra:

```tsx
<PriceHistoryChart itadId={itadId} region={region} currency={data.currency} />
```

`region` değişince query key değişir → otomatik yeniden çekilir (remount gerekmez).

### 5. Recharts kurulumu

`npm install recharts` (frontend). React 18 / Next 14 uyumlu.

### 6. Frontend testleri

`components/games/__tests__/PriceHistoryChart.test.tsx` (vitest). `usePriceHistory` veya `gamesApi.history` mock'lanır (`ResponsiveContainer` jsdom'da 0-boyut → chart branch'i yerine **durum branch'leri** test edilir):
- boş durum mesajı (`points: []` ve tek nokta),
- loading skeleton,
- error → hiçbir şey render edilmez (`null`).

`lib/__tests__/games-api.test.ts`'e `history` çağrısının doğru URL'i kurduğu eklenir (mevcut desen).

## Kapsam dışı (YAGNI)

- Mağaza başına çoklu çizgi (sadece günlük en ucuz).
- Zaman penceresi seçici (sabit 90 gün).
- Snapshot'a `currency` alanı ekleme (region → tek birim varsayımı; frontend güncel currency'i kullanır).
- Zoom/pan, indirme, veri dışa aktarma.

## Doğrulama

- Backend: `npm run test` (jest unit, DB'siz).
- Frontend: `npm run test` (vitest) + `npm run build`.
- Atomik commit'ler; `master`'a fast-forward merge (yerel-only repo).
