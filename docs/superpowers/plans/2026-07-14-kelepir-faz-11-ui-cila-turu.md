# Faz 11 — UI Cila Turu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, otonom) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dört ekranı (auth, ana sayfa, oyun detayı, favoriler/alarmlar) tek "Gece Pazarı" görsel diline oturtan frontend cila turu — yeni backend/veri yok.

**Architecture:** Paylaşılan görsel bileşenler (CoverWall, StoreIcon, PopularChips, EmptyState) önce; sonra her ekran bu bileşenleri kullanacak şekilde güncellenir. Mevcut Tailwind v4 token'ları (globals.css) değişmez. İndirim%/eski-fiyat zaten `GamePriceRow` (`cut`, `regular`, `isCheapest`) içinde; tasarruf tutarı istemcide hesaplanır.

**Tech Stack:** Next.js 14 (App Router), Tailwind v4 (CSS-first), TanStack Query v5, recharts 3, vitest + Testing Library. Yeni bağımlılık: `simple-icons` (mağaza SVG'leri, yerel bundle).

## Global Constraints

- Mevcut renk token'ları değişmez: `--ink #161311 --surface #211c18 --surface-2 #2c2621 --bone #f2ebe3 --muted #9a8f84 --line #3a332c --coral #ff5a3c --coral-ink #1a0e0a --savings #2fbf71`.
- Font sınıfları: `font-display` (Bricolage), `font-body` (Hanken), `font-mono` (Space Mono).
- Runtime dış ağ çağrısı YOK: mağaza ikonları `simple-icons`'tan bundle; popüler kapaklar/çipler statik sabit liste.
- Yeni endpoint / veri modeli YOK. Uydurulmuş veri durumu (ör. alarmda "düştü") gösterilmez — anlık fiyat alarm listesinde yok, o yüzden alarm rozeti "bekliyor/aktif" ile sınırlı.
- Testler: yeni mantık taşıyan birimler için vitest (`npm run test`), her görsel görev sonu `npm run build` temiz.
- Bash cwd `frontend`. Commit: `git add -A .` dizin içinde. Base branch `master`.
- Erişilebilirlik: dekoratif görseller `aria-hidden`; ikonlarda erişilebilir ad; durum renge ek metinle.

---

### Task 1: `simple-icons` bağımlılığı + StoreIcon bileşeni

**Files:**
- Modify: `frontend/package.json` (dep ekle)
- Create: `frontend/components/games/StoreIcon.tsx`
- Test: `frontend/components/games/__tests__/StoreIcon.test.tsx`

**Interfaces:**
- Produces: `StoreIcon({ shopName: string; className?: string })` — mağaza adına göre marka SVG'si (karo içinde), Microsoft için 4-kare, bilinmeyende harf-fallback.
- Consumes: `simple-icons` (`siSteam`, `siEpicgames`, `siGogdotcom`, `siHumblebundle`, `siUbisoft` → `{ path, hex, title }`).

- [ ] **Step 1: `npm i simple-icons` (frontend içinde), build'in hâlâ derlendiğini gör** (`npm run build` sonra).
- [ ] **Step 2: Test yaz** — `StoreIcon` "Steam" için `<svg>` (title "Steam"), "Microsoft Store" için 4 `<rect>`, bilinmeyen "Zoo Games" için harf "Z" render eder.
- [ ] **Step 3: Uygula** — normalize edilmiş `shopName` → ikon haritası (substring eşleme: steam/epic/gog/humble/ubisoft). Marka rengi `#hex`; tile `rounded-lg border border-line bg-surface-2`. MS = 4 renkli rect. Fallback = `initialOf(shopName)`.
- [ ] **Step 4: `npm run test` StoreIcon geçer.**
- [ ] **Step 5: Commit** `feat(frontend): StoreIcon (simple-icons) mağaza logoları + fallback (Faz 11)`

---

### Task 2: CoverWall + statik popüler kapaklar

**Files:**
- Create: `frontend/lib/popular-covers.ts` (sabit ITAD kapak URL dizisi)
- Create: `frontend/components/brand/CoverWall.tsx`
- Test: `frontend/components/brand/__tests__/CoverWall.test.tsx`

**Interfaces:**
- Produces: `CoverWall({ columns?: number; className?: string })` — `POPULAR_COVERS`'tan `background-image` div grid, `aria-hidden`, opacity/perde çağıran ebeveyne bırakılır (saf grid + görseller wrapper'da).
- `POPULAR_COVERS: string[]` — ~12 gerçek ITAD boxart URL'si.

- [ ] **Step 1: Test yaz** — `CoverWall` ~12 kapak hücresi render eder ve kök `aria-hidden` taşır.
- [ ] **Step 2: Uygula** — `POPULAR_COVERS` sabitleri; grid `grid-cols-{columns}` gap; her hücre `bg-cover` inline `backgroundImage`.
- [ ] **Step 3: `npm run test` geçer.**
- [ ] **Step 4: Commit** `feat(frontend): CoverWall + statik popüler kapaklar (Faz 11)`

---

### Task 3: PopularChips + EmptyState

**Files:**
- Create: `frontend/components/games/PopularChips.tsx`
- Create: `frontend/components/library/EmptyState.tsx`
- Test: `frontend/components/games/__tests__/PopularChips.test.tsx`, `frontend/components/library/__tests__/EmptyState.test.tsx`

**Interfaces:**
- Produces: `PopularChips({ onPick?: (q: string) => void })` — statik `POPULAR_QUERIES` çipleri; tıklayınca `onPick(q)` ya da `/?q=` link.
- Produces: `EmptyState({ icon: ReactNode; title: string; description: string; ctaHref: string; ctaLabel: string })` — kapak-duvarı fonlu boş durum kartı.

- [ ] **Step 1: PopularChips testi** — ~4 çip render, tıklayınca `onPick` doğru terimle çağrılır.
- [ ] **Step 2: PopularChips uygula** (statik `['Elden Ring','Hades','Cyberpunk 2077','Baldur\'s Gate 3']`).
- [ ] **Step 3: EmptyState testi** — başlık/açıklama/CTA (doğru href) render.
- [ ] **Step 4: EmptyState uygula** — `CoverWall` düşük opacity fon + ikon + başlık + açıklama + coral CTA link.
- [ ] **Step 5: `npm run test` geçer.**
- [ ] **Step 6: Commit** `feat(frontend): PopularChips + EmptyState bileşenleri (Faz 11)`

---

### Task 4: Auth ekranı — "B-canlı"

**Files:**
- Modify: `frontend/components/auth/AuthAside.tsx` (kapak-duvarı + etiketler)
- Read/Modify: `frontend/app/giris/page.tsx`, `frontend/app/kayit/page.tsx` (form solda / aside sağda sıralama)
- Modify: `frontend/components/ui/input.tsx` VEYA form input className (coral odak halkası — mevcut `--ring` zaten coral, focus stilini garanti et)

- [ ] **Step 1:** giris/kayit page'lerini oku; grid sırasını **form solda, AuthAside sağda** yap.
- [ ] **Step 2:** `AuthAside`'ı yeniden yaz: arkada `CoverWall` (canlı, yanal+alt perde, coral radial ışıma), önde "gece pazarı açık" + yeşil canlı nokta, başlık, alt metin, iki eğik etiket (`KelepirStamp` coral -%70 + yeşil "DÜŞTÜ" varyantı). `KelepirStamp`'e `tone?: 'coral'|'savings'` prop ekle.
- [ ] **Step 3:** Input focus halkasını doğrula (coral ring görünür).
- [ ] **Step 4:** `npm run build` temiz; mevcut auth testleri (varsa) geçer.
- [ ] **Step 5: Commit** `feat(frontend): auth ekranı B-canlı — kapak-duvarı + form solda (Faz 11)`

---

### Task 5: Ana sayfa — "B"

**Files:**
- Modify: `frontend/app/page.tsx` (CoverWall fon + PopularChips)
- Modify: `frontend/components/games/SearchBox.tsx` (arama aktifken fonu söndürme sinyali + çip entegrasyonu)

- [ ] **Step 1:** `app/page.tsx`: hero'yu koru (sol hizalı), arkaya `CoverWall` fon (loş, üstten karartma), arama kutusu altına `PopularChips`.
- [ ] **Step 2:** Çip tıklaması aramayı doldursun: `SearchBox`'a opsiyonel başlangıç/`onPick` köprüsü ya da `?q=` navigasyonu. Arama sonucu görünürken (`q>=2`) kapak-duvarı fonunu gizle.
- [ ] **Step 3:** `npm run build` + mevcut SearchBox/SearchResults testleri geçer.
- [ ] **Step 4: Commit** `feat(frontend): ana sayfa B — kapak-duvarı fon + popüler çipler (Faz 11)`

---

### Task 6: Oyun detayı — hero + fiyat tablosu

**Files:**
- Modify: `frontend/components/games/GameHeader.tsx` (sinematik kapak-banner hero)
- Modify: `frontend/components/games/PriceTable.tsx` (StoreIcon + tasarruf tutarı + dolu/hayalet buton)
- Modify: `frontend/app/oyun/[itadId]/GameDetail.tsx` (iki sütun düzeni + hero'ya cheapest/cut/back linki geçişi)

**Interfaces:**
- `GameHeader` yeni prop'lar: `cheapestPrice?: number; cheapestCut?: number; currency: string|null; storeCount: number; onFavorite bölgesi mevcut`. Banner arkada bulanık `cover`, keskin kapak, başlık, "N mağazada satışta", meta (favori+bölge+en-ucuz rozeti), geri linki.
- `PriceTable` satırı: `StoreIcon` + ad + rozet + tasarruf ("en yüksekten −₺X" = maxPrice − row.price) + fiyat (üstü çizili `regular`) + buton (en-ucuz dolu / diğer hayalet).

- [ ] **Step 1:** `PriceTable`: `StoreIcon`, satır başına tasarruf tutarı (max fiyattan fark), en-ucuz satır yeşil parıltı + dolu buton, diğerleri hayalet; `regular>price` ise üstü çizili eski fiyat. Mevcut PriceTable testini güncelle.
- [ ] **Step 2:** `GameHeader`: banner hero (bulanık kapak fon + perde + keskin kapak + iri başlık + "N mağazada satışta" + meta chip'ler + geri linki). FavoriteButton'ı hero meta'ya taşımak için GameDetail'de yerleşim güncelle.
- [ ] **Step 3:** `GameDetail`: iki sütun grid (sol tablo, sağ geçmiş+alarm kartları); hero'ya cheapest/cut/storeCount geçir.
- [ ] **Step 4:** `npm run test` (PriceTable) + `npm run build` temiz.
- [ ] **Step 5: Commit** `feat(frontend): oyun detayı hero + StoreIcon'lu fiyat tablosu (Faz 11)`

---

### Task 7: Fiyat geçmişi grafiği — alan dolgusu + işaretler

**Files:**
- Modify: `frontend/components/games/PriceHistoryChart.tsx`
- Modify: `frontend/components/games/__tests__/PriceHistoryChart.test.tsx` (durum branch'leri korunur)

- [ ] **Step 1:** `Line`+`Area` (recharts `Area` veya `defs` gradient) alt dolgu; en-düşük nokta için `ReferenceDot`; başlıkta "90 günün en düşüğü ₺X" istatistiği (points'ten min). Kart stilinde (`rounded-xl border bg-surface p-4`).
- [ ] **Step 2:** Mevcut test durumları (loading/empty<2/error-null) hâlâ geçer; min-stat için 1 test ekle.
- [ ] **Step 3:** `npm run test` + `npm run build`.
- [ ] **Step 4: Commit** `feat(frontend): fiyat geçmişi grafiği alan dolgusu + en-düşük işareti (Faz 11)`

---

### Task 8: Favoriler + Alarmlar cila

**Files:**
- Modify: `frontend/components/library/FavoriteCard.tsx` (indirim rozeti + fiyat overlay — favori `game` SearchItem, fiyat yoksa sade kart kalır)
- Modify: `frontend/components/library/AlertRow.tsx` (kapak thumb büyüt + hedef + "bekliyor/aktif" rozeti düzeni)
- Modify: `frontend/app/favoriler/page.tsx`, `frontend/app/alarmlarim/page.tsx` (boş durumları `EmptyState` ile değiştir)

- [ ] **Step 1:** favoriler/alarmlar boş durumlarını `EmptyState` (ikon 🏷️/🔔 + metin + "Oyun ara →") ile değiştir.
- [ ] **Step 2:** `FavoriteCard` kalp + (varsa indirim rozeti) düzenini cilala; `AlertRow` kapak thumb + oyun + region + hedef + "bekliyor" rozeti + sil. Mevcut AlertRow/FavoriteButton testleri geçer.
- [ ] **Step 3:** `npm run test` + `npm run build`.
- [ ] **Step 4: Commit** `feat(frontend): favoriler/alarmlar cila + boş durumlar (Faz 11)`

---

### Task 9: Canlı doğrulama + kapanış

- [ ] **Step 1:** Backend (:3001) + frontend (:3002) çalışır; Playwright ile dört ekranı gerçek ITAD verisiyle görsel kontrol (ana sayfa, oyun detayı Hades, giriş, favoriler login'li).
- [ ] **Step 2:** `npm run test` (tümü) + `npm run build` temiz; `npm audit` (simple-icons kaynaklı kritik yok).
- [ ] **Step 3:** `master`'a merge (zaten master'dayız — commit'ler master'da) ya da branch akışına göre; memory güncelle.

## Self-Review

- **Spec coverage:** Auth(T4), Ana sayfa(T5), Oyun detayı(T6+T7), Favoriler/Alarmlar(T8), paylaşılan bileşenler(T1-3), simple-icons(T1), canlı doğrulama(T9). ✔
- **Sapma (spec'ten):** Alarm "düştü ✓" durumu — alarm listesinde anlık fiyat yok → sadece "bekliyor/aktif". Favori kartında indirim rozeti favori verisinde fiyat olmadığından koşullu/atlanabilir. Bunlar Global Constraints "uydurma veri yok" ile uyumlu.
- **Placeholder:** yok (mekanik JSX değişimleri açık tarif; yeni mantık birimleri kod+test).
