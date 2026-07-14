# Faz 11 — UI Cila Turu (Gece Pazarı Görsel Yükseltme)

**Tarih:** 2026-07-14
**Tür:** Frontend görsel cila (yeni backend/veri özelliği YOK)
**Durum:** Tasarım onaylandı (brainstorming görsel companion ile), plan bekliyor

## Amaç

Mevcut dört ekranı — ana sayfa, oyun detayı, favoriler, alarmlar — görsel olarak yükseltmek ve
hepsini tek bir tutarlı "Gece Pazarı" görsel diline oturtmak. Fonksiyon değişmez; yeni endpoint,
yeni veri modeli, yeni sayfa yok. Sadece bileşen/stil katmanı.

Çıkış noktası: auth sayfaları (giriş/kayıt) sitedeki en güçlü görseldi (eğik coral fiyat-etiketi
motifi), diğer ekranlar görece çıplaktı. Bu faz o karakteri tüm siteye yayar.

## Paylaşılan görsel dil ("Gece Pazarı tezgâhı")

Mevcut token'lar korunur (`app/globals.css`): `--ink #161311`, `--surface #211c18`,
`--surface-2 #2c2621`, `--bone #f2ebe3`, `--muted #9a8f84`, `--line #3a332c`, `--coral #ff5a3c`,
`--coral-ink #1a0e0a`, `--savings #2fbf71`. Yeni token gerekmez.

Tekrar eden motifler:
- **Kapak duvarı (cover wall):** gerçek oyun kapaklarından oluşan loş grid; üstüne yönlü karartma
  perdesi (form/metin tarafına doğru koyulaşır) + hafif coral radial ışıma. Auth, ana sayfa
  (fon) ve oyun detayı (tek-oyun bulanık banner) versiyonlarında kullanılır.
- **Fiyat etiketi:** eğik coral rozet (`-%70`, üstü çizili eski fiyat → yeni fiyat). İkincil
  etiket yeşil `--savings` "DÜŞTÜ" varyantı.
- **İndirim rozetleri:** en-ucuz için yeşil "EN UCUZ", diğerleri için `--surface-2` üstünde
  yeşil "-%.." metni.

## Ekran 1 — Giriş / Kayıt (yön: "B-canlı")

İki sütun, **form solda / kapak-duvarı sağda** (mevcut düzenin aynası).

- **Sol:** başlık ("Giriş yap" / "Kayıt ol") + kısa alt metin ("30 saniyede hesap aç, fiyat
  alarmlarını kur."), input'lar **coral odak halkalı** (`focus`: `border coral` + `box-shadow
  rgba(255,90,60,.20)`), dolu coral CTA, alt link.
- **Sağ:** gerçek oyun kapaklarından **canlı** 4-sütun duvar (yüksek doygunluk), forma doğru
  koyulaşan yanal perde + alttan karartma, sağ-alt coral ışıma. Üstünde: "gece pazarı açık"
  eyebrow + nabız gibi yeşil canlı nokta, "En ucuzu bul. Kelepiri kaçırma." başlığı, alt metin,
  iki eğik etiket (coral `-%70` + yeşil "DÜŞTÜ `-%45`").
- Kapak seçkisi **statik** (elle seçilmiş popüler oyun kapak URL'leri; runtime ITAD çağrısı yok).
- Etkilenen: `components/auth/AuthAside.tsx`, `app/giris/page.tsx`, `app/kayit/page.tsx`,
  `components/auth/LoginForm.tsx` + `RegisterForm.tsx` (input focus stili), muhtemelen ortak bir
  `CoverWall` bileşeni.

## Ekran 2 — Ana sayfa (yön: "B — sol hizalı, kapak-duvarı fon")

Mevcut **sol hizalı** hero korunur (sitenin geri kalanıyla aynı hiza → aramaya geçişte zıplama yok).

- Arkada loş kapak-duvarı fonu (auth ile aynı `CoverWall`), üstten karartma.
- Hero: "gece pazarı açık" eyebrow, "Kelepir" başlığı, "En ucuzu bul. Kelepiri kaçırma." alt metni.
- **Büyütülmüş arama kutusu**, coral odak halkası.
- Altında **statik popüler arama çipleri** (ör. Elden Ring, Hades, Cyberpunk, Baldur's Gate 3) —
  tıklayınca arama kutusunu doldurur / `?q=` set eder. Backend gerektirmez (sabit liste).
- Arama sonuçları görünürken kapak-duvarı fonu sönümlenir/kaldırılır (sonuç grid'i öne çıksın).
- Etkilenen: `app/page.tsx`, `components/games/SearchBox.tsx`, yeni `PopularChips` (statik liste),
  `CoverWall` yeniden kullanımı.

## Ekran 3 — Oyun detayı (yön: "A+B v2 + mağaza ikonları")

En büyük yükseltme. Üstte sinematik hero, altında iki sütun.

- **Hero (tam genişlik):** tek-oyunun **bulanık kapak banner'ı** arkada + keskin kapak + iri
  başlık + "N mağazada satışta · ..." satırı. Meta: **♥ Favorile** + **bölge seçici** + sağda
  büyük **en-ucuz fiyat** (üstü çizili eski fiyat) + yeşil "-%X · ₺Y kâr" rozeti. Sol üstte
  "← Arama sonuçlarına dön" linki.
- **Alt — iki sütun:**
  - **Sol (geniş) — "Nereden alınır":** mağaza satırları. Her satır: **mağaza ikonu (karo)** +
    ad + rozet + tasarruf tutarı ("en yüksekten −₺209") + fiyat + buton. En-ucuz satır **yeşil
    parıltılı**, "EN UCUZ" rozetli, **dolu** buton; diğerleri **hayalet** buton.
  - **Sağ (dar):** iki kart — (1) **Fiyat geçmişi**: mevcut grafik **alan dolgusu** + en-düşük
    yeşil nokta + kesikli "hedef" çizgisi + "90 günün en düşüğü ₺X · bugün ₺Y" istatistiği;
    (2) **Fiyat alarmı**: hedef fiyat ön-dolu (en ucuzun ~%90'ı) + "Alarm kur".
- **Mağaza ikonları:** `simple-icons` paketinden **yerel SVG** bundle (runtime dış CDN yok).
  Mağaza adı → ikon eşlemesi; eşleşmeyen için **harf-fallback karosu**. Microsoft Store için
  klasik 4-kare logo. Stil: **marka renkli ikon**, koyu **karo** içinde.
- Mobilde iki sütun alt alta iner (sol panel üstte).
- Etkilenen: `app/oyun/[itadId]/` (GameDetail), `components/games/GameHeader.tsx`,
  `PriceTable.tsx`, `PriceHistoryChart.tsx`, `RegionSelect.tsx`; `components/library/AlertForm.tsx`,
  `FavoriteButton.tsx`; yeni `StoreIcon` bileşeni + ikon eşleme haritası.

## Ekran 4 — Favoriler + Alarmlar

Ayrı sayfalar; ortak motif.

- **Favoriler:** kapaklı **kart grid'i**. Kart: kapak + sağ-üst kalp + sol-alt indirim rozeti +
  başlık + en-ucuz fiyat (üstü çizili eski) + mağaza adı.
- **Alarmlar:** kapaklı **satır listesi**. Satır: kapak thumb + oyun adı + "bölge · şu an ₺X" +
  hedef fiyat + **durum rozeti** (gri "bekliyor" / yeşil "düştü! ✓") + sil (✕).
- **Boş durumlar (ikisi de):** çıplak metin yerine — loş kapak-duvarı fonu + ikon (🏷️ / 🔔) +
  kısa açıklama + coral **"Oyun ara →"** CTA butonu.
- Etkilenen: `app/favoriler/page.tsx`, `app/alarmlarim/page.tsx`,
  `components/library/FavoriteCard.tsx`, `AlertRow.tsx`, `AuthGate.tsx` (boş/mesaj stilleri),
  yeni ortak `EmptyState` bileşeni.

## Yeni/paylaşılan bileşenler (öneri)

- `CoverWall` — statik kapak URL listesinden loş grid fon (opacity/perde prop'lu).
- `StoreIcon` — mağaza adı → `simple-icons` SVG; renkli, karo, harf-fallback.
- `PopularChips` — statik popüler arama çipleri.
- `EmptyState` — ikon + başlık + metin + CTA (kapak-duvarı fonlu).
- `DealTag` / `SavingsBadge` — eğik fiyat etiketi ve indirim rozeti (auth + detay + favori kartında paylaşılır).

## Kapsam dışı (YAGNI)

- Yeni backend endpoint / veri modeli (indirim %, "kâr", "90g en düşük" istemcide mevcut
  fiyat/geçmiş verisinden türetilir — yeni sorgu yok).
- Popüler oyunlar / öne çıkanlar için **dinamik** veri (çipler ve kapak-duvarı statik seçki).
- Tema geçişi (dark/light toggle), yeni sayfa, filtre/sıralama, koleksiyonlar.
- Store logolarında dinamik/uzak kaynak — hepsi bundle'lı yerel SVG.

## Bağımlılık

- `simple-icons` (mağaza marka SVG'leri için). Yerel bundle; runtime ağ çağrısı yok.

## Test / doğrulama

- Mevcut vitest bileşen testleri korunur; yeni bileşenler (`StoreIcon`, `EmptyState`,
  `PopularChips`, `CoverWall`) için birim testleri.
- `simple-icons` yeni bağımlılık → `npm run build` + `npm audit` kontrolü.
- Canlı doğrulama (çalışan uygulama, Playwright): dört ekran gerçek ITAD verisiyle görsel kontrol
  (bkz dev-ortam: backend :3001, frontend :3002, FRONTEND_URL eşitlemesi).

## Erişilebilirlik notları

- Kapak-duvarı/banner sadece dekoratif → `aria-hidden`, metin kontrastı perde ile korunur.
- Mağaza ikonlarında `alt`/`aria-label` (mağaza adı zaten metinle yanında).
- Durum rozetleri renge ek olarak metinle ("bekliyor" / "düştü!") ayrışır.
- Odak halkaları görünür (coral ring zaten `--ring`).
