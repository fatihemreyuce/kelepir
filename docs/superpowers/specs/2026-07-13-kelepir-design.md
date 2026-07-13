# Kelepir — Oyun Fiyat Karşılaştırma Platformu — Tasarım Dokümanı

**Tarih:** 2026-07-13
**Durum:** Onaylandı (brainstorming çıktısı)

## 1. Amaç

Kullanıcının aradığı oyunun Steam, Epic Games, GOG vb. mağazalardaki güncel
fiyatlarını karşılaştırmalı gösteren; favori oyun listesi ve fiyat alarmı (hedef
fiyata düşünce e-posta bildirimi) sunan bir web uygulaması. Cimri.com mantığının
oyunlara özel hâli.

## 2. Ana Mimari Kararlar (brainstorming'de netleşen)

Bu proje, ekteki `00/01/02` dokümanlarının Supabase-temelli önerisinden **bilinçli
olarak ayrıldı**. Kararlar:

- **Supabase kullanılmıyor.** Backend'i kendimiz yazıyoruz, auth dahil.
- **Ayrı backend sunucu:** frontend (Next.js) + backend (NestJS) iki ayrı uygulama, tek repo altında.
- **Backend framework: NestJS** (module/controller/service, guard'lar, `@nestjs/schedule`).
- **ORM: Prisma.** DB: dev'de Docker Postgres, prod'da Neon (managed Postgres, BaaS değil).
- **Auth: kendi JWT'miz** (access + refresh, bcrypt), Supabase Auth yok.
- **Cron: NestJS içi `@nestjs/schedule`.** Ayrı uzun-çalışan backend olduğu için
  Vercel Cron **ve** Upstash Redis'e gerek kalmadı — dokümana göre bir sadeleşme.
- **v1 kapsamı geniş tutuldu:** fiyat geçmişi grafiği, çoklu dil (TR/EN), bölgesel
  fiyat (TR vs global), Google login — dördü de v1'de, ama faz sırasıyla.

## 3. Repo Yapısı

```
C:\Users\fatih\kelepir\
  frontend/            Next.js 14 (App Router, TS, Tailwind, shadcn/ui, TanStack Query, next-intl)
  backend/             NestJS (Prisma, JWT auth, @nestjs/schedule cron)
  docker-compose.yml   Lokal Postgres (dev)
  docs/                Bu doküman + spec/plan
  README.md
  .env.example         (anahtarlar henüz yok — placeholder ile kurulur)
```

## 4. Backend (NestJS) Modülleri

| Modül | Sorumluluk |
|---|---|
| `auth` | Email/şifre kayıt-giriş, kendi JWT'miz (access + refresh), bcrypt, `JwtAuthGuard`. Google OAuth (passport-google-oauth20) faz 6'da. |
| `games` | ITAD arama + fiyat çekme, bölgesel fiyat (country param), basit cache. |
| `favorites` | Kullanıcı favori CRUD. |
| `alerts` | Fiyat alarmı CRUD. |
| `prices` | `@nestjs/schedule` cron: aktif alarmları tarar, hedefin altındaysa Resend ile mail gönderir, `PriceSnapshot` biriktirir (grafik verisi). |
| `prisma` | DB erişim servisi (PrismaService). |

**Auth kontrolü:** Korumalı endpoint'ler `JwtAuthGuard` ile korunur; token yoksa 401.
Arama ve fiyat karşılaştırma auth gerektirmez.

## 5. Veritabanı Şeması (Prisma)

Dokümandaki şema korunur; tek fark auth artık bizde olduğu için **`User` tablosu** eklenir.

- `User` — id, email (unique), passwordHash (nullable — Google-only kullanıcılar için), googleId (nullable, unique), createdAt
- `Game` — id, itadId (unique), title, slug (unique), coverUrl?, createdAt
- `Favorite` — id, userId, gameId, createdAt · `@@unique([userId, gameId])`
- `PriceAlert` — id, userId, gameId, targetPrice (Decimal), currency (default "TRY"), region (default "TR"), isActive (default true), triggeredAt?, createdAt
- `PriceSnapshot` — id, gameId, store, price (Decimal), discount (Int), region, url, fetchedAt · `@@index([gameId, fetchedAt])`

`userId`, kendi `User.id`'mize FK verir (Supabase auth.users yok).

## 6. API Endpoint'leri

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Email/şifre kayıt |
| POST | `/auth/login` | ❌ | Giriş, JWT döner |
| POST | `/auth/refresh` | ❌ (refresh token) | Access token yenile |
| GET | `/auth/google` · `/auth/google/callback` | ❌ | Google OAuth (faz 6) |
| GET | `/games/search?q=&region=` | ❌ | ITAD arama, cache'li |
| GET | `/games/:slug/prices?region=` | ❌ | Oyun mağaza fiyatları + geçmiş |
| GET/POST | `/favorites` · DELETE `/favorites/:id` | ✅ | Favori CRUD |
| GET/POST | `/alerts` · DELETE `/alerts/:id` | ✅ | Alarm CRUD |

Cron endpoint yok — cron NestJS içinde zamanlanır, dışarıdan tetiklenmez.

## 7. Frontend (Next.js)

Sayfalar (TR URL'ler korunur):
- `/` — arama + öne çıkan indirimler
- `/oyun/[slug]` — mağaza fiyat karşılaştırması + **fiyat geçmişi grafiği (Recharts)** + bölge seçici
- `/favoriler` — favori oyunlar (giriş gerekli)
- `/alarmlarim` — fiyat alarmları (giriş gerekli)
- `/giris` — giriş / kayıt

- **Veri:** TanStack Query ile backend REST'e.
- **Auth:** JWT httpOnly cookie'de, middleware ile `/favoriler` ve `/alarmlarim` korunur.
- **i18n:** next-intl, TR/EN.
- **Bölge:** TR/global fiyat seçici, backend'e `region` paramı geçer.
- **Tasarım:** prototipdeki koyu zemin + yeşil "en ucuz" vurgusu korunur.

## 8. Dış Servisler

- **ITAD (IsThereAnyDeal) API** — fiyat verisi. Anahtar sonra eklenecek.
- **Resend** — alarm bildirim e-postası. Anahtar sonra eklenecek.
- **Neon** — prod Postgres. Hesap sonra açılacak.

Tümü henüz yok → kod placeholder `.env` / `.env.example` ile kurulur, anahtarlar sonra doldurulur.

## 9. İnşa Sırası (Fazlar)

Her faz sonunda çalışan bir çıktı olur. Çekirdek önce, cila sona.

1. **İskele** — iki proje kurulur, docker-compose Postgres, Prisma migrate, health-check endpoint + frontend ana iskelet.
2. **Auth çekirdeği** — email/şifre kayıt-giriş, JWT, korumalı route testi.
3. **Arama + fiyat** — ITAD entegrasyonu, arama, oyun detay, bölgesel fiyat.
4. **Favoriler + alarmlar** — CRUD (backend + frontend).
5. **Cron + e-posta + fiyat geçmişi** — alarm kontrolü, Resend, PriceSnapshot + Recharts grafik.
6. **Cila** — i18n TR/EN, Google login, responsive/erişilebilirlik.

## 10. Sonraya Bırakılan Kararlar

- Backend prod host'u (Railway / Render / Fly) — kod hazır olunca seçilecek.
- Push notification — v2.

## 11. Model Rol Dağılımı (bu projede)

- Orkestrasyon / plan yazımı / plan review: **Opus 4.8**
- Kodlama: **Sonnet 5**
- Araştırma: **Haiku**
