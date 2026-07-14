# 🎮 Kelepir — Oyun Fiyat Karşılaştırma Platformu

Kelepir, farklı dijital mağazalardaki oyun fiyatlarını tek bir yerden karşılaştırmanı sağlayan, açık kaynaklı bir web uygulamasıdır. Fiyat verisi [IsThereAnyDeal (ITAD)](https://isthereanydeal.com) API'sinden gelir. Beğendiğin oyunları favorilere ekleyebilir, hedef fiyat alarmları kurabilir ve fiyat o seviyenin altına düştüğünde e-posta bildirimi alabilirsin.

> **Durum:** Aktif geliştirme. Arayüz Türkçe, veri kaynağı ITAD.

---

## ✨ Özellikler

- 🔍 **Oyun arama** — ITAD kataloğu üzerinden oyun ara, kapak görselleri ve slug'larla birlikte listele.
- 💸 **Anlık fiyat karşılaştırma** — Bir oyunun farklı mağazalardaki güncel fiyatlarını, indirim oranlarıyla birlikte gör.
- 📈 **Fiyat geçmişi** — Zaman içindeki fiyat değişimini grafikle takip et (en düşük fiyat işaretiyle).
- ⭐ **Favoriler** — İlgilendiğin oyunları kaydet, tek yerden takip et.
- 🔔 **Fiyat alarmları** — Bir oyun için hedef fiyat belirle; fiyat o seviyeye inince otomatik e-posta bildirimi al.
- 🔐 **Kimlik doğrulama** — E-posta/parola ile kayıt & giriş; access + refresh token (HTTP-only cookie) tabanlı oturum yönetimi.
- ⏰ **Zamanlanmış fiyat kontrolü** — Backend her gün **09:00 ve 21:00**'de tüm aktif alarmları tarar, fiyat anlık görüntülerini kaydeder ve tetiklenenler için mail gönderir.

---

## 🧱 Teknoloji Yığını

### Backend (`/backend`)
| Alan | Teknoloji |
|------|-----------|
| Framework | [NestJS 10](https://nestjs.com) |
| Dil | TypeScript |
| ORM & Veritabanı | [Prisma 6](https://www.prisma.io) + PostgreSQL 16 |
| Kimlik doğrulama | Passport-JWT, `@nestjs/jwt`, bcryptjs, refresh token rotasyonu |
| Zamanlama | `@nestjs/schedule` (Cron) |
| Doğrulama | class-validator / class-transformer |
| E-posta | [Resend](https://resend.com) |
| Dış veri | IsThereAnyDeal (ITAD) API |

### Frontend (`/frontend`)
| Alan | Teknoloji |
|------|-----------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| UI | React 18, Tailwind CSS 4, shadcn / Base UI |
| Veri çekme | [TanStack Query](https://tanstack.com/query) |
| Grafik | [Recharts](https://recharts.org) |
| İkonlar | lucide-react, simple-icons |
| Test | Vitest + Testing Library |

---

## 🏗️ Mimari

```
┌────────────────┐        ┌────────────────┐        ┌─────────────────┐
│   Frontend     │  HTTP  │    Backend     │  SQL   │   PostgreSQL    │
│  Next.js 14    │ ─────► │   NestJS API   │ ─────► │   (Prisma)      │
│  :3000         │ ◄───── │   :3001        │ ◄───── │   :5433         │
└────────────────┘  JSON  └───────┬────────┘        └─────────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │   ITAD   │  │  Resend  │  │   Cron   │
              │   API    │  │  (mail)  │  │ 09:00/21 │
              └──────────┘  └──────────┘  └──────────┘
```

- **Frontend** kullanıcıya oturum cookie'siyle konuşur; API çağrılarını `NEXT_PUBLIC_API_URL` üzerinden yapar.
- **Backend** ITAD'dan fiyatları çeker (in-memory cache ile), Prisma üzerinden veriyi saklar.
- **Cron** günde iki kez aktif alarmları region bazında toplu ITAD çağrısıyla tarar, `PriceSnapshot` kayıtları biriktirir ve hedefe ulaşan alarmlar için Resend ile mail atar.

---

## 🚀 Kurulum

### Ön Gereksinimler
- Node.js 20+
- Docker & Docker Compose (Postgres için)
- Bir [ITAD API anahtarı](https://isthereanydeal.com/apps/) (fiyat verisi için)
- (Opsiyonel) Bir [Resend API anahtarı](https://resend.com) (alarm e-postaları için)

### 1. Veritabanını başlat
```bash
docker compose up -d
```
Postgres host portunda **5433** üzerinde ayağa kalkar (`kelepir/kelepir`).

### 2. Backend
```bash
cd backend
cp .env.example .env      # değerleri düzenle (aşağıdaki tabloya bak)
npm install
npx prisma migrate dev    # şemayı uygula
npm run start:dev         # http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

> ℹ️ Yeni bir ortam değişkeni eklerken, aynı anda ilgili `.env.example` dosyasına da eklemeyi unutma.

---

## 🔑 Ortam Değişkenleri

### Backend (`backend/.env`)
| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `DATABASE_URL` | PostgreSQL bağlantı adresi | `postgresql://kelepir:kelepir@localhost:5433/kelepir?schema=public` |
| `JWT_ACCESS_SECRET` | Access token imzalama anahtarı | `dev-access-secret-change-me` |
| `JWT_ACCESS_EXPIRES` | Access token ömrü | `15m` |
| `REFRESH_EXPIRES_DAYS` | Refresh token ömrü (gün) | `7` |
| `ITAD_API_KEY` | IsThereAnyDeal API anahtarı | `...` |
| `ITAD_BASE_URL` | ITAD API taban adresi | `https://api.isthereanydeal.com` |
| `RESEND_API_KEY` | Resend e-posta API anahtarı | `...` |
| `MAIL_FROM` | Gönderen adresi | `Kelepir <onboarding@resend.dev>` |
| `FRONTEND_URL` | CORS için frontend adresi | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)
| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | Backend API adresi | `http://localhost:3001` |

---

## 📡 API Referansı

Taban adres: `http://localhost:3001`

### Auth — `/auth`
| Metod | Yol | Açıklama |
|-------|-----|----------|
| `POST` | `/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/auth/login` | Giriş (access + refresh cookie döner) |
| `GET`  | `/auth/me` | Oturumdaki kullanıcı bilgisi |
| `POST` | `/auth/refresh` | Access token'ı yenile |
| `POST` | `/auth/logout` | Çıkış (refresh token iptal) |

### Oyunlar — `/games`
| Metod | Yol | Açıklama |
|-------|-----|----------|
| `GET` | `/games/search` | Oyun ara |
| `GET` | `/games/:itadId/prices` | Bir oyunun güncel mağaza fiyatları |
| `GET` | `/games/:itadId/history` | Fiyat geçmişi (snapshot'lar) |

### Favoriler — `/favorites`
| Metod | Yol | Açıklama |
|-------|-----|----------|
| `POST`   | `/favorites` | Favoriye ekle |
| `GET`    | `/favorites` | Favorileri listele |
| `DELETE` | `/favorites/:id` | Favoriden çıkar |

### Alarmlar — `/alerts`
| Metod | Yol | Açıklama |
|-------|-----|----------|
| `POST`   | `/alerts` | Fiyat alarmı oluştur (hedef fiyat, region) |
| `GET`    | `/alerts` | Alarmları listele |
| `DELETE` | `/alerts/:id` | Alarmı sil |

### Sağlık — `/health`
| Metod | Yol | Açıklama |
|-------|-----|----------|
| `GET` | `/health` | Servis sağlık kontrolü |

---

## 🗄️ Veri Modeli

```
User ──┬── Favorite ──── Game
       ├── PriceAlert ── Game
       └── RefreshToken

Game ──── PriceSnapshot   (mağaza, fiyat, indirim, region, zaman)
```

- **User** — E-posta/parola (hash) veya Google ID; favoriler, alarmlar, refresh token'lar.
- **Game** — ITAD kimliği, başlık, slug, kapak görseli.
- **Favorite** — Kullanıcı ↔ oyun (benzersiz çift).
- **PriceAlert** — Hedef fiyat, para birimi (varsayılan TRY), region (varsayılan TR), aktiflik & tetiklenme zamanı.
- **PriceSnapshot** — Zaman damgalı fiyat kaydı; fiyat geçmişi grafiğini besler.
- **RefreshToken** — Hash'li token, son kullanma & iptal takibi.

---

## 🧪 Testler & Betikler

### Backend
```bash
npm run start:dev     # geliştirme (watch)
npm run build         # derleme
npm run start:prod    # production (dist/main)
npm run test          # birim testler (Jest)
npm run test:e2e      # uçtan uca testler
npm run lint          # ESLint (--fix)
```

### Frontend
```bash
npm run dev           # geliştirme sunucusu
npm run build         # production derleme
npm run start         # production sunucusu
npm run test          # testler (Vitest)
npm run lint          # ESLint
```

---

## 📁 Proje Yapısı

```
kelepir/
├── backend/                 # NestJS API
│   ├── prisma/
│   │   └── schema.prisma     # veri modeli
│   └── src/
│       ├── auth/             # kayıt/giriş, JWT, refresh, guard'lar
│       ├── games/            # arama, fiyat, geçmiş
│       ├── favorites/        # favori CRUD
│       ├── alerts/           # fiyat alarmları
│       ├── price-check/      # zamanlanmış fiyat kontrolü (cron)
│       ├── itad/             # ITAD API istemcisi
│       ├── mail/             # Resend e-posta servisi
│       ├── cache/            # in-memory cache
│       ├── prisma/           # Prisma servisi
│       └── health/           # sağlık kontrolü
├── frontend/                # Next.js 14 (App Router)
│   └── app/
│       ├── page.tsx          # ana sayfa / arama
│       ├── oyun/[itadId]/    # oyun detay + fiyat geçmişi
│       ├── favoriler/        # favoriler
│       ├── alarmlarim/       # alarmlar
│       ├── giris/            # giriş
│       └── kayit/            # kayıt
├── docs/                    # tasarım & spesifikasyonlar
└── docker-compose.yml       # PostgreSQL 16
```

---

## 🗺️ Yol Haritası

- [x] Fiyat karşılaştırma, favoriler, alarmlar, fiyat geçmişi
- [x] JWT kimlik doğrulama (access + refresh)
- [x] Zamanlanmış fiyat kontrolü + e-posta bildirimi
- [x] Arayüz cila turu (responsive, boş durumlar, grafik)
- [ ] Google ile giriş (şema hazır)
- [ ] Deploy / production kurulumu

---

## 📄 Lisans

Özel kullanım (UNLICENSED). Aksi belirtilmedikçe tüm hakları saklıdır.
