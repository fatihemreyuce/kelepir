# Kelepir Faz 8 — Frontend Arama + Oyun Detay + Bölgesel Fiyat — Tasarım Dokümanı

**Tarih:** 2026-07-13
**Durum:** Onaylandı (brainstorming çıktısı)
**Bağlam:** Ana tasarım → `2026-07-13-kelepir-design.md`. Faz 7 (frontend temeli: Tailwind v4, Gece Pazarı token'ları, app shell, auth, korumalı route) tamamlandı ve master'a merge edildi.

## 1. Amaç

Ürünün çekirdek değerini (**"En ucuzu bul"**) frontend'e getirmek: kullanıcı ana sayfada oyun arar, sonuçları görür, bir oyuna tıklayıp seçtiği ülkeye göre mağaza fiyatlarını karşılaştırmalı görür. Bu faz **halka açıktır** — auth gerektirmez. Favoriler/alarmlar (auth'lu) ve fiyat geçmişi grafiği sonraki fazlara bırakılmıştır.

Backend hazır ve bu fazda **dokunulmuyor**:
- `GET /games/search?q=` → `SearchItem[]`
- `GET /games/:itadId/prices?region=XX` → `GamePrices` (region: 2 harfli ülke kodu, varsayılan TR)

## 2. Kapsam

**Dahil:**
- Ana sayfada canlı (debounced) arama + sonuç listesi, `?q=` URL senkronizasyonu.
- `/oyun/[itadId]` oyun detay sayfası: kapak/başlık + kürasyonlu ülke seçici + karşılaştırmalı fiyat tablosu.
- `lib/games-api.ts` (mevcut `authApi` deseninde) + TanStack Query ile veri katmanı.
- Yükleniyor / boş / hata durumları, kenar durumlar (kapak yok, fiyat yok, currency null).
- shadcn'e `select` ve `skeleton` bileşenlerinin eklenmesi.
- Birim/bileşen testleri (Vitest + Testing Library).

**Hariç (sonraki fazlar):**
- Faz 9: Favoriler + alarmlar UI (auth'lu, placeholder'ların doldurulması).
- Faz 10: Fiyat geçmişi grafiği (backend'e `PriceSnapshot` okuyan `history` endpoint'i + Recharts).

## 3. Rotalar

| Rota | Açıklama |
|---|---|
| `/` | Hero + canlı arama kutusu. Yazdıkça (~300ms debounce) sonuç kartları hero altında belirir. Arama terimi `?q=witcher` olarak URL'e yansır (paylaşılabilir, geri tuşu ve yenileme çalışır). |
| `/oyun/[itadId]` | Oyun detay. Rota anahtarı `itadId` (backend fiyat endpoint'i onunla çalışır — slug'ı ayrıca taşımaya gerek yok). `?region=US` searchParam ile bölge. |

**Neden ana sayfada inline arama** (ayrı `/ara` yerine): Canlı aramada doğal olan bu; kullanıcı tek ekranda yazıp anında sonuç görür. `?q=` senkronizasyonu paylaşılabilirliği korur.

## 4. Veri Katmanı

Yeni `lib/games-api.ts` — mevcut `lib/auth-api.ts` desenini birebir izler:

```ts
export const gamesApi = {
  search: (q: string) =>
    api<SearchItem[]>(`/games/search?q=${encodeURIComponent(q)}`),
  prices: (itadId: string, region: string) =>
    api<GamePrices>(`/games/${itadId}/prices?region=${region}`),
};
```

Tipler backend `games.types.ts` ile ayna:

```ts
interface SearchItem { itadId: string; slug: string; title: string; cover: string | null; }
interface GamePriceRow {
  shopId: number; shopName: string; price: number; currency: string;
  regular: number; cut: number; url: string; isCheapest: boolean;
}
interface GamePrices {
  game: { itadId: string; slug: string; title: string; cover: string | null };
  region: string; currency: string | null; prices: GamePriceRow[];
}
```

Veri çekme **TanStack Query** ile (Faz 1'den kurulu):
- Arama: `useQuery(['search', q], () => gamesApi.search(q), { enabled: q.trim().length >= 2 })` — 2 karakter altında istek atılmaz.
- Fiyat: `useQuery(['prices', itadId, region], () => gamesApi.prices(itadId, region), { placeholderData: keepPreviousData })` — bölge değişince eski veri korunur, titreme olmaz.

## 5. Bileşenler

Gece Pazarı token'larına sadık, her biri tek sorumluluklu.

**Arama (ana sayfa):**
- `SearchBox` — büyük input, `--coral` odak halkası, Space Mono placeholder ("oyun ara…"). Anlık değer `useState`, gecikmeli terim `useDebounce(300ms)`; debounce'lı terim `?q=`'ya `router.replace` ile yazılır (history kirletmez). Sayfa `?q=` ile açılırsa input o değerle hydrate olur.
- `SearchResults` — durum makinesi: yükleniyor (iskelet kartlar) · boş sonuç ("kelepir bulunamadı") · hata (retry butonu) · sonuç ızgarası.
- `GameCard` — kapak görseli (yoksa `--surface-2` üzerinde baş harf fallback), başlık (Bricolage), tıklanınca `/oyun/[itadId]`.

**Oyun detay (`/oyun/[itadId]`):**
- `GameHeader` — büyük kapak + başlık + `RegionSelect`.
- `RegionSelect` — kürasyonlu ülke dropdown'u (~12 popüler ülke: TR, US, GB, DE, FR, PL, CA, AU, BR, RU, JP, NL). Seçim `?region=US` olarak URL'e yansır. shadcn `select` üzerine kurulur.
- `PriceTable` — mağaza satırları: mağaza adı · fiyat (`Intl.NumberFormat` ile currency formatlı) · indirim yüzdesi (`cut > 0` ise `--coral` etiket) · "Mağazaya git" linki (`url`, yeni sekme). **En ucuz satır** (`isCheapest`) `--savings` yeşil vurgu + "en ucuz" rozeti.

**Ortak:**
- `Skeleton` — basit shimmer (shadcn'de yok, eklenir).
- `formatPrice(amount, currency)` — `lib/format.ts`; `currency` null ise sade sayı.

## 6. Veri Akışı

**Arama:** yaz → `useDebounce(300ms)` → `?q=` güncelle → `useQuery` (≥2 karakter) → TanStack cache aynı terimde anında sonuç.

**Detay:** `/oyun/[itadId]?region=XX` → `itadId` param + `region` searchParam (varsayılan `TR`) → `useQuery` → `RegionSelect` değişince `?region=` güncellenir → query anahtarı değişir → otomatik refetch, `keepPreviousData` ile eski tablo korunur.

## 7. Hata ve Kenar Durumlar

Mevcut `api.ts` zaten hatayı Türkçeleştirip `ApiError(status, message)` fırlatıyor — yeni hata altyapısı yok, aynen kullanılır.

| Durum | Davranış |
|---|---|
| Boş arama sonucu (200, `[]`) | "kelepir bulunamadı" boş durumu (hata değil) |
| 404 detayda (oyun yok) | "Oyun bulunamadı" + ana sayfaya dönüş linki |
| Ağ / 500 | "Bir şeyler ters gitti, tekrar dene" + `refetch` butonu |
| Kapak `null` | Baş harf fallback (`--surface-2`) |
| `prices: []` ama oyun var | "Bu bölgede fiyat bulunamadı" |
| `currency: null` | Fiyat sade sayı olarak gösterilir |

## 8. Test

- `useDebounce` — sahte zamanlayıcı: gecikme sonrası değer güncelleniyor.
- `gamesApi` — mevcut `api.test.ts` deseni: doğru path/method, `?q=` ve `?region=` kodlaması.
- `SearchResults` — Testing Library: yükleniyor → sonuç, boş sonuç, hata render'ı.
- `PriceTable` — en ucuz satır vurgusu, indirim etiketi, para formatı, boş fiyat durumu.
- `formatPrice` — currency var/null, farklı locale.
- `gamesApi` mock'lanır (mevcut desen; MSW yok).

## 9. Sonraya Bırakılanlar

- **Faz 9:** Favoriler + alarmlar UI — detay sayfasına "favorile" / "alarm kur" aksiyonları, `/favoriler` ve `/alarmlarim` CRUD (auth'lu, placeholder'lar doldurulur).
- **Faz 10:** Fiyat geçmişi grafiği — backend'e `PriceSnapshot` okuyan endpoint + Recharts. (Backend'de model dolu ama okuma endpoint'i yok, eklenmeli.)
- İleri ülke seçici (tam ISO listesi / bayraklar) — şimdilik kürasyonlu liste yeterli.
