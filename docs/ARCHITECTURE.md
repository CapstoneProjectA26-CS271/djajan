# Arsitektur Sistem

## Komponen

```
                    ┌────────────────────────────┐
  Pengunjung ─────► │ Frontend (React, Vercel)   │ ◄───── Owner (admin)
  (dari tautan UTM) │ katalog · admin · dashboard│
                    └─────────────┬──────────────┘
                                  │ HTTPS (REST, JSON)
                    ┌─────────────▼──────────────┐      ┌──────────────────────┐
                    │ Backend Node.js (Render)   │─────►│ Gemini API (teks+vision)
                    │ auth · menu · AI · events  │      │ cadangan: Groq, template
                    │ analytics · forecast refresh│     └──────────────────────┘
                    └──────┬──────────────┬──────┘
                           │ SQL          │ upload
                ┌──────────▼──────┐  ┌────▼───────────────┐
                │ PostgreSQL      │  │ Supabase Storage   │
                │ (Supabase)      │  │ (foto menu)        │
                └──────────▲──────┘  └────────────────────┘
                           │ baca events, tulis hasil
                ┌──────────┴──────────────────────┐
                │ ml-pipeline (Python)            │
                │ dijalankan GitHub Actions (cron │
                │ harian + manual / dari dashboard)│
                └─────────────────────────────────┘
```

## Prinsip

1. **Frontend hanya bicara ke backend.** Tidak ada API key LLM atau koneksi database di frontend.
2. **Python ↔ Node.js bertemu di database.** Tidak ada pemanggilan langsung. Kalau skrip Python gagal,
   website tetap jalan dan dashboard menampilkan hasil run terakhir yang sukses.
3. **Kontrak tertulis.** Tabel di `DATA_MODEL.md`, endpoint di `API.md`.

## Backend (Express)

Framework backend sudah diputuskan: **Express 5** (Node.js, ESM). Susunan `backend/src/`:

- `app.js` membuat & mengekspor app (tanpa `listen`, dipakai test via supertest); `server.js` menjalankan `listen`.
- `config/env.js` membaca & memvalidasi env wajib (`DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`); server gagal start dengan pesan jelas bila ada yang kurang.
- Alur request: `routes/` → `validators/` → `services/` (logika, termasuk `ai/`) → `repositories/` (SQL parameterized) → `db/pool.js` (pg Pool).
- Koneksi ke Supabase memakai TLS dengan verifikasi sertifikat penuh (CA `backend/certs/prod-ca-2021.crt`);
  database lokal (`localhost`) tanpa TLS.
- `middleware/`: helmet, CORS hanya untuk origin di `FRONTEND_URL` (boleh beberapa, dipisah koma), `express.json` (batas 100 kb), rate limiter siap pakai
  (login, `/api/events`, AI), handler 404, dan error handler terpusat berformat `success`/`fail`/`error` tanpa stack trace.
- Di production `trust proxy` = 1 (Render berada di belakang satu proxy) agar IP klien untuk rate limit benar.
- Health check: `GET /health` (proses hidup) dan `GET /health/db` (`select 1` ke database).

## Alur 1 – Pengunjung membuka katalog

1. Pengunjung membuka `https://<frontend>/?utm_source=instagram&utm_medium=social&utm_campaign=<slug>&utm_content=<captionId>-<variant>`.
2. Frontend membuat/mengambil `session_id` acak (sessionStorage), menyimpan parameter UTM untuk sesi itu.
3. Frontend memanggil `GET /api/menus` → backend membaca tabel `menus` → katalog tampil.
4. Frontend mengirim event `page_view`, `menu_view`, `wa_click` ke `POST /api/events` (beserta UTM sesi).
5. Klik "Pesan via WhatsApp" → event `wa_click` dikirim (pakai `navigator.sendBeacon`), lalu buka
   `https://wa.me/<nomor>?text=<pesan>`.

## Alur 2 – Owner mengelola menu (termasuk AI Vision)

1. Login `POST /api/auth/login` → JWT (disimpan di memory/sessionStorage; kirim via header `Authorization`).
2. CRUD lewat `/api/admin/menus`. Foto diunggah ke `POST /api/admin/uploads` → backend menyimpan ke Supabase
   Storage → URL disimpan di `menus.image_url`.
3. **AI Vision:** owner unggah foto daftar menu ke `POST /api/admin/ai/vision/extract` → backend mengirim gambar
   ke Gemini (multimodal) dengan instruksi output JSON → backend menormalkan harga ("25k", "Rp 25.000" → 25000)
   → mengembalikan **draf** daftar `{name, price, confidence}` → form terisi → owner mengoreksi → simpan.

## Alur 3 – Owner membuat caption AI

1. `POST /api/admin/ai/captions` dengan `menu_id`, `channel`, `style` (opsional), `promo_price` (opsional).
2. Backend mengambil data menu (grounding), contoh caption owner + caption yang disukai (few-shot), dan
   bila diminta data tren dari `menu_forecast`.
3. Backend menyusun prompt → memanggil Gemini → bila gagal/limit: Groq → bila gagal: template.
4. Validator memeriksa nama & harga setiap varian (lihat `AI_SPEC.md`).
5. Backend membuat tautan UTM unik per varian, menyimpan ke tabel `captions`, mengembalikan 3 varian.
6. Owner memberi feedback (opsional) → `PATCH /api/admin/captions/:id/feedback`.

## Alur 4 – Pipeline prediksi (Python)

1. GitHub Actions `forecast.yml` berjalan setiap hari ~00:23 WIB (cron `23 17 * * *`), atau manual
   (`workflow_dispatch`), atau dipicu dari dashboard lewat `POST /api/admin/forecast/refresh`
   (backend memanggil GitHub API dengan fine-grained token berizin *Actions: write* untuk repo ini saja).
2. Skrip membuat baris `forecast_runs` (status `running`), membaca `events` (agregasi harian/jam, zona Asia/Jakarta).
3. Menghitung: perkiraan klik 7 hari per menu (exponential smoothing), `trend_score`, jam tersibuk per kanal,
   error backtest (WAPE).
4. Menulis ke `menu_forecast` dan `posting_time_stats` dengan `run_id` yang sama; update `forecast_runs`
   (`success` / `failed` / `insufficient_data`).
5. Backend `GET /api/admin/analytics/forecast` membaca hasil dari run sukses terakhir.

Koneksi Python memakai user database khusus: **SELECT** pada `events` & `menus`, **INSERT/UPDATE** pada tabel hasil.

## Alur 5 – Dashboard

Backend menyediakan endpoint agregat (`/api/admin/analytics/*`). Semua query dihitung di SQL dengan
`AT TIME ZONE 'Asia/Jakarta'`. Data sintetis (`is_synthetic = true`) bisa difilter dan selalu diberi label.

## Deployment

| Komponen | Target | Catatan |
|---|---|---|
| frontend | Vercel | env `VITE_API_URL`, `VITE_WA_NUMBER`, `VITE_SITE_URL` |
| backend | Render (web service, `render.yaml`) | free tier bisa tidur → health check & pemanasan sebelum demo. Langkah di `DEPLOY.md` |
| database & storage | Supabase | pakai connection string pooler; backup sebelum pilot |
| ml-pipeline | GitHub Actions | secret `FORECAST_DB_URL` (user DB terbatas) |

## CI (GitHub Actions)

- `ci.yml` pada setiap PR: install → lint → test (frontend, backend, ml-pipeline) → build frontend.
- Deploy otomatis dari `main` lewat integrasi Vercel/Render (deploy hanya jika CI hijau).
- `forecast.yml`: jadwal prediksi (lihat Alur 4), `timeout-minutes: 10`, `concurrency: forecast`.
