# Kelepir Faz 9 — Favoriler + Alarmlar UI — Tasarım Dokümanı

**Tarih:** 2026-07-14
**Durum:** Onaylandı (brainstorming çıktısı)
**Bağlam:** Ana tasarım → `2026-07-13-kelepir-design.md`. Faz 8 (frontend arama + oyun detay + bölgesel fiyat) tamamlandı ve master'a merge edildi. Backend Faz 4 favoriler/alarmlar CRUD'u zaten hazır — bu fazda **backend değişmiyor**.

## 1. Amaç

Giriş yapmış kullanıcının **favori oyunlarını** ve **fiyat alarmlarını** frontend'den uçtan uca yönetebilmesi. Bugün `app/favoriler/page.tsx` ve `app/alarmlarim/page.tsx` sadece placeholder metin gösteriyor; Header giriş yapınca bu iki linki gösteriyor ama sayfalar boş. Bu faz o boşluğu doldurur ve ekleme aksiyonlarını (favori kalp butonu + alarm formu) oyun detay sayfasına bağlar.

Backend hazır ve bu fazda **dokunulmuyor** (tümü korumalı; tokensız 401):

- Favoriler: `POST /favorites {itadId}` (201) · `GET /favorites` (200) · `DELETE /favorites/:id` (200) — 409 dedup, 404 bilinmeyen oyun / başkasının kaydı
- Alarmlar: `POST /alerts {itadId, targetPrice, region?}` (201) · `GET /alerts` (200) · `DELETE /alerts/:id` (200) — 400 geçersiz `targetPrice`, defaults `region=TR` / `currency=TRY` / `isActive=true`; `targetPrice` yanıtta **string** döner (Prisma Decimal)

Liste yanıtlarındaki `game` alanı **ham Prisma Game** modelidir (`{ id, itadId, title, slug, coverUrl, ... }`) — `coverUrl`, mevcut frontend `SearchItem`'daki `cover` değil.

## 2. Kapsam

**Dahil:**

- `/favoriler` sayfası: favori listesi (grid) + favoriden çıkarma.
- `/alarmlarim` sayfası: alarm listesi + alarm silme.
- Oyun detay sayfasında (`/oyun/[itadId]`): favori kalp toggle butonu + PriceTable altında inline "alarm kur" formu.
- `lib/favorites-api.ts` + `lib/alerts-api.ts` (mevcut `auth-api`/`games-api` deseninde) — `coverUrl → cover` normalizasyonu ile.
- `hooks/use-favorites.ts` + `hooks/use-alerts.ts` (TanStack Query: liste + add/remove mutation'ları).
- Auth kapısı, yükleniyor / boş / hata durumları.
- Bileşen testleri (Vitest + Testing Library).

**Hariç (sonraki fazlar):**

- Fiyat geçmişi grafiği (Faz 10).
- Alarm düzenleme (edit) / aktif-pasif toggle — bu fazda alarm **oluştur + sil**; düzenleme yok (YAGNI).
- Detay sayfasında kullanıcının o oyuna kurduğu mevcut alarmları listeleme — alarmlar `/alarmlarim`'da toplanır; detay sayfası yalnızca **oluşturma** yüzeyidir.

## 3. Kararlar (brainstorming)

| Konu | Karar |
|---|---|
| Kapsam | Tam akış: iki liste sayfası + detay sayfası ekleme aksiyonları. |
| Auth kapısı (korumalı sayfalar) | Yönlendirme yok. Giriş yoksa sayfa "giriş yap" mesajı + `/giris` linki gösterir (`AuthGate`). URL korunur. |
| Detay aksiyonları (giriş yoksa) | Kalp/alarm butonları **her zaman görünür**; giriş yoksa tıklayınca inline "önce giriş yap" ipucu/linki. Keşfedilebilirlik yüksek. |
| Alarm formu | PriceTable altında **inline** form; hedef fiyat input'u **o anki en ucuz fiyatın biraz altıyla ön-dolu**; `region` = sayfada seçili bölge otomatik. |

## 4. Veri Katmanı (`lib/`)

Mevcut `lib/auth-api.ts` / `lib/games-api.ts` desenini izler. `GameRef`, mevcut `SearchItem` şeklidir (`{ itadId, slug, title, cover }`) — böylece `GameCard` doğrudan yeniden kullanılabilir.

**`lib/favorites-api.ts`**

```ts
import { api } from './api';
import type { SearchItem } from './games-api';

export interface Favorite {
  id: string;
  createdAt: string;
  game: SearchItem; // coverUrl -> cover normalize edilmiş
}

// backend ham Game: { id, itadId, title, slug, coverUrl }
function toGameRef(g: {
  itadId: string; slug: string; title: string; coverUrl: string | null;
}): SearchItem {
  return { itadId: g.itadId, slug: g.slug, title: g.title, cover: g.coverUrl };
}

export const favoritesApi = {
  list: async (): Promise<Favorite[]> => {
    const rows = await api<Array<{ id: string; createdAt: string; game: /*raw*/ any }>>('/favorites');
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, game: toGameRef(r.game) }));
  },
  add: (itadId: string) =>
    api<unknown>('/favorites', { method: 'POST', body: { itadId } }),
  remove: (id: string) =>
    api<{ success: true }>(`/favorites/${id}`, { method: 'DELETE' }),
};
```

**`lib/alerts-api.ts`**

```ts
export interface Alert {
  id: string;
  targetPrice: string;   // Prisma Decimal -> string ("149.99")
  region: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  game: SearchItem;      // normalize edilmiş
}

export const alertsApi = {
  list: async (): Promise<Alert[]> => { /* toGameRef ile map */ },
  add: (dto: { itadId: string; targetPrice: number; region: string }) =>
    api<unknown>('/alerts', { method: 'POST', body: dto }),
  remove: (id: string) =>
    api<{ success: true }>(`/alerts/${id}`, { method: 'DELETE' }),
};
```

`toGameRef` iki modülde ortak — küçük olduğu için tekrar edilebilir ya da `lib/game-ref.ts`'e alınabilir (uygulama sırasında karar; DRY tercih edilirse ortak dosya).

## 5. Data Hooks (`hooks/`, TanStack Query)

Bileşenleri veri getirme/mutasyon ayrıntısından izole eder. Auth'a bağlı `enabled` ile tokensız gereksiz istek atılmaz.

- **`useFavorites()`** → `useQuery({ queryKey: ['favorites'], queryFn: favoritesApi.list, enabled: !!user })`.
  - `addFavorite` / `removeFavorite` mutation'ları → başarıda `queryClient.invalidateQueries(['favorites'])`.
- **`useAlerts()`** → `queryKey: ['alerts']`, aynı desen; `addAlert` / `removeAlert`.

`user`, `useAuth()`'tan alınır. Hook'lar `{ favorites, isLoading, isError, refetch, add, remove, isMutating }` benzeri sade bir arayüz döner.

## 6. Bileşenler (`components/library/`)

- **`AuthGate`** — `{ children }` yok; sadece "Bu sayfayı görmek için giriş yap." mesajı + `/giris` linki. Korumalı sayfalar `!user` iken bunu render eder.
- **`FavoriteButton`** — props: `{ itadId }`. `useFavorites` ile bu `itadId` favori mi bulur (favori ise `id`'sini remove için tutar). `useAuth` ile gate. Giriş yoksa tıklayınca inline "önce giriş yap" ipucu + `/giris` linki. lucide `Heart` (dolu/boş), pending durumu (mutasyon sırasında disabled). a11y: `aria-pressed`, anlamlı `aria-label`.
- **`AlertForm`** — props: `{ itadId, region, cheapestPrice }`. Inline form: sayı input'u (`cheapestPrice` varsa biraz altıyla ön-dolu — ör. `Math.max(0, floor(cheapest * 0.9))` benzeri sade bir kural), "Alarm kur" butonu. Submit → `addAlert({ itadId, targetPrice, region })`. `targetPrice > 0` doğrulaması (aksi halde inline hata). Başarıda geri bildirim ("Alarm kuruldu") + `/alarmlarim` linki. `useAuth` gate.
- **`AlertRow`** — props: `{ alert }`. Kapak+başlık (detaya link), hedef fiyat (`formatPrice(Number(targetPrice), currency)`), bölge, aktif/pasif rozeti, sil butonu (pending durumu).

Favori liste kartı: mevcut **`GameCard`** yeniden kullanılır; üstüne küçük bir "favoriden çıkar" butonu (overlay) eklenir — GameCard'ı kırmamak için sarmalayan küçük bir `FavoriteCard` wrapper.

## 7. Sayfalar

Her ikisi de `'use client'`.

**`app/favoriler/page.tsx`**

```
useAuth() -> loading ise Skeleton; !user ise <AuthGate/>
useFavorites() -> isLoading: Skeleton grid
             -> isError: mesaj + "tekrar dene"
             -> boş: "Henüz favori yok." + aramaya (/) link
             -> dolu: FavoriteCard grid'i
```

**`app/alarmlarim/page.tsx`** — aynı iskelet, `useAlerts()` + `AlertRow` listesi; boş durum "Henüz alarm yok." + "Bir oyun bul" linki.

## 8. Detay Sayfası Entegrasyonu (`app/oyun/[itadId]/GameDetail.tsx`)

- Başlık alanına (GameHeader yanına veya altına) `<FavoriteButton itadId={itadId} />`.
- PriceTable altına `<AlertForm itadId={itadId} region={region} cheapestPrice={cheapest} />`, burada `cheapest = data.prices.find((p) => p.isCheapest)?.price ?? data.prices[0]?.price`.
- Mevcut loading/error davranışı korunur; yeni aksiyonlar yalnızca `data` yüklendiğinde render edilir.

## 9. Durumlar

- **Loading:** mevcut `ui/skeleton` (liste grid'i / satırlar için uygun ölçekte).
- **Boş:** favoriler "Henüz favori yok." + arama linki; alarmlar "Henüz alarm yok." + arama linki.
- **Hata:** mesaj + "tekrar dene" (GameDetail'deki desenle tutarlı — `refetch`).
- **Mutasyon pending:** ilgili buton disabled + hafif geri bildirim; başarısızlıkta inline hata mesajı (`ApiError.message`).

## 10. Test (Vitest + Testing Library)

- `FavoriteButton`: (a) favori değilken tıklama `addFavorite` çağırır; (b) favoriyken dolu kalp + tıklama `removeFavorite`; (c) giriş yoksa tıklama "önce giriş yap" ipucunu gösterir, mutasyon çağırmaz.
- `AlertForm`: (a) `cheapestPrice` ile ön-dolu; (b) submit `addAlert`'i doğru `{ itadId, targetPrice, region }` ile çağırır; (c) `targetPrice <= 0`/boş → doğrulama hatası, çağrı yok.
- `AlertRow`: hedef fiyat + bölge + rozet render'ı; sil butonu `removeAlert(id)` çağırır.
- Sayfalar: `!user` iken `AuthGate`, boş durum, dolu liste (hook'lar mock'lanarak).

`api`/hook'lar mock'lanır; ağ çağrısı yapılmaz (mevcut test deseni).

## 11. Global Kısıtlar

- **Yalnızca `frontend/`** — `backend/` değişmez.
- **Yeni bağımlılık yok** — TanStack Query, lucide-react, base-ui/shadcn bileşenleri zaten mevcut.
- Mevcut `api<T>`, `lib/format`, `GameCard`, `components/ui/*` yeniden kullanılır.
- Gece Pazarı token'ları: `coral`, `savings`, `bone`, `muted-2`, `line`, `surface`, `font-display`/`font-mono`/`font-body`.
- Tüm veri erişimi cookie-auth (`credentials: 'include'`, `api` helper hallediyor).

## 12. Bitiş Kriteri (Definition of Done)

- Giriş yapmış kullanıcı: oyun detayında favoriye ekler/çıkarır; kalp durumu `/favoriler` ile tutarlı.
- `/favoriler` favorileri grid'de gösterir; çıkarma anında listeden düşürür.
- Oyun detayında alarm kurar (bölge sayfadan, fiyat ön-dolu); `/alarmlarim`'da görünür; silinebilir.
- Giriş yapmamış kullanıcı korumalı sayfalarda `AuthGate` görür; detay aksiyonlarında "önce giriş yap" ipucu alır.
- Yükleniyor / boş / hata durumları tüm yüzeylerde çalışır.
- `cd frontend && npm test` yeşil; `npm run lint` temiz.

## Sonraki Faz

Faz 10 — Fiyat geçmişi grafiği: backend'e `PriceSnapshot` okuyan `history` endpoint'i + frontend'de Recharts ile detay sayfasında fiyat trendi.
