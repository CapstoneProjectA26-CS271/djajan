# Djajan

Etalase digital berbasis web untuk UMKM Djajan (F&B, Surabaya) dengan AI Copywriting, AI Vision, dan dashboard
analitik promosi. Capstone Asah 2026 – Tim A26-CS271.

Djajan membuat promosi secara manual dan membagikannya di Instagram/Threads tanpa tautan ke menu lengkap,
sehingga calon pelanggan sulit melihat menu dan owner tidak tahu promosi mana yang berhasil. Proyek ini
membangun:

- **Katalog publik** mobile-first dengan tombol "Pesan via WhatsApp" berisi pesan otomatis.
- **Panel admin** untuk mengelola menu, termasuk mengisi menu dari foto daftar menu (AI Vision).
- **AI Copywriting**: 3 varian caption per menu dan kanal, dengan nama dan harga yang divalidasi dari database.
- **Event tracking + UTM** yang ditampilkan di **dashboard analitik**.
- **Prediksi tren menu dan waktu posting terbaik** (Python, terjadwal) sebagai dasar rekomendasi promosi.

Detail produk ada di [`docs/PRD.md`](docs/PRD.md).

## Struktur folder

```
djajan/
├── frontend/           React (Vite) + Tailwind CSS v4 + React Router: katalog, panel admin, dashboard
├── backend/            Node.js REST API: auth, menu, AI, events, analytics
├── ml-pipeline/        Python: prediksi tren menu & jam posting
├── docs/               Spesifikasi produk, arsitektur, kontrak API & data model
└── docker-compose.yml  PostgreSQL 16 untuk pengembangan lokal
```

> Backend saat ini masih berupa server sementara (`node:http`) dengan endpoint `GET /health`.
> Framework backend (Express/Hapi) akan ditetapkan di Minggu 1.

## Prasyarat

- [Node.js 22](https://nodejs.org/) (beserta npm)
- [Python 3.12](https://www.python.org/downloads/) (versi dikunci di `ml-pipeline/.python-version`)
- Git
- [Docker Desktop](https://www.docker.com/products/docker-desktop/): **opsional**, hanya untuk PostgreSQL lokal
  (lihat [Setup database](#setup-database))

## Setup lokal (anggota baru)

1. Clone repo:

   ```bash
   git clone https://github.com/CapstoneProjectA26-CS271/djajan.git
   cd djajan
   ```

2. Salin file environment di tiap folder, lalu isi nilai yang dibutuhkan:

   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   cp ml-pipeline/.env.example ml-pipeline/.env
   ```

   Jangan pernah commit file `.env`. Repo ini publik.

3. Siapkan database dengan salah satu cara di [Setup database](#setup-database), lalu isi `DATABASE_URL`
   di `backend/.env` dan `ml-pipeline/.env`.

4. Install dependensi frontend dan backend:

   ```bash
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

5. Siapkan virtual environment ml-pipeline:

   ```bash
   cd ml-pipeline
   py -3.12 -m venv .venv            # Windows (macOS/Linux: python3.12 -m venv .venv)
   source .venv/Scripts/activate     # Windows Git Bash (PowerShell: .venv\Scripts\Activate.ps1, macOS/Linux: source .venv/bin/activate)
   pip install -r requirements.txt
   cd ..
   ```

## Setup database

Docker **opsional**. Pilih salah satu cara:

**(a) PostgreSQL lokal via Docker**, disarankan untuk yang mengerjakan backend atau migrasi.

```bash
docker compose up -d
```

`DATABASE_URL=postgresql://djajan:djajan@localhost:5433/djajan`

> **Catatan port:** database Docker dipetakan ke port **5433** di komputer (`5433:5432`) agar tidak bentrok
> dengan PostgreSQL lokal yang mungkin sudah terpasang di port 5432.

**(b) Supabase project `djajan-dev` (bersama)**, untuk anggota yang tidak memasang Docker.
Minta connection string **pooler** ke FS-1, lalu isi ke `DATABASE_URL`. Jangan membagikan connection string
di chat publik, issue, atau commit.

> Data produksi dan pilot **hanya** ada di Supabase project `djajan-prod`. Jangan memakai `djajan-prod` untuk
> pengembangan atau pengujian lokal.

## Menjalankan

| Bagian | Perintah | Alamat / hasil |
|---|---|---|
| Database (opsi a) | `docker compose up -d` | `localhost:5433` |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 |
| Backend | `cd backend && npm run dev` | http://localhost:3000/health → `{"status":"ok"}` |
| ml-pipeline | `cd ml-pipeline && python predict_trend.py` | skrip prediksi (masih placeholder) |

Perintah lain:

```bash
cd frontend && npm run build        # build produksi ke frontend/dist
cd frontend && npm run lint         # lint frontend (OxLint)
cd ml-pipeline && python -m pytest  # test ml-pipeline (venv aktif)
docker compose exec db psql -U djajan -d djajan   # masuk ke database lokal (opsi a)
docker compose down                 # hentikan database (data tetap tersimpan di volume pgdata)
```

Linter: frontend memakai [OxLint](https://oxc.rs/docs/guide/usage/linter). Backend nanti juga memakai OxLint
agar aturan lint seragam.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Latar belakang, pengguna, fitur, dan kriteria keberhasilan |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Komponen sistem, alur data, deployment, CI |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Skema PostgreSQL dan konvensi UTM (kontrak antar tim) |
| [`docs/API.md`](docs/API.md) | Kontrak REST API (kontrak antar tim) |
| [`docs/AI_SPEC.md`](docs/AI_SPEC.md) | Spesifikasi AI Copywriting, AI Vision, rekomendasi, evaluasi |
| [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md) | Panduan UI/UX dan daftar halaman |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Rencana mingguan dan Definition of Done |

## Alur kerja Git

- Branch: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- Pesan commit mengikuti [Conventional Commits](https://www.conventionalcommits.org/).
- Semua perubahan ke `main` lewat pull request dengan minimal 1 review.
- Perubahan endpoint atau tabel wajib memperbarui `docs/API.md` / `docs/DATA_MODEL.md` di PR yang sama.

## Tim A26-CS271

| Kode | Nama | Fokus |
|---|---|---|
| FS-1 | Muhamad Nur Yanfa | Backend, auth, integrasi AI, event API, UTM, deploy & CI/CD |
| FS-2 | Muhamad Irvan Alfiyansah | Katalog, panel admin, dashboard UI, kalkulator promo, form AI Vision |
| AI-1 | Divana Pradhanika | Prompt caption & brand voice, rekomendasi promosi |
| AI-2 | Salwa Rabbani Agrifanty | AI Vision, evaluasi kualitas AI, guardrail |
| DS-1 | Rahimah | Skema event, data sintetis, prediksi tren |
| DS-2 | Sabiqul Himam | Dashboard analitik, waktu posting terbaik |
