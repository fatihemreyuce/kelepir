# Kelepir — Oyun Fiyat Karşılaştırma Platformu

## Geliştirme Kurulumu
1. `docker compose up -d` — Postgres'i başlatır (host portu **5433**)
2. `cd backend && cp .env.example .env && npm install && npx prisma migrate dev`
3. `cd frontend && npm install`

> Backend `backend/.env` dosyasını okur; `backend/.env.example`'dan kopyalanır.
> Yeni bir ortam değişkeni eklerken aynı anda `backend/.env.example`'a da ekleyin.

Detay: `docs/superpowers/specs/2026-07-13-kelepir-design.md`
