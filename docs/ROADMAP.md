# Roadmap & Definition of Done

Sumber: Project Plan final. Progres harian dipantau di GitHub Projects.

## Minggu 1 — 20–26 Nov 2026: Fondasi
- [x] Repo, branch protection, CI awal, struktur monorepo (FS-1)
- [x] Putuskan Express vs Hapi sesuai Checklist Main Quest (FS-1, FS-2)
- [ ] Migrasi skema database sesuai `DATA_MODEL.md`, role `app_backend` & `forecast_job` (FS-1)
- [ ] API CRUD menu + autentikasi admin, OpenAPI awal (FS-1)
- [ ] Wireframe & halaman katalog dengan data contoh (FS-2)
- [ ] Prompt v1 brand voice + 20 kasus uji caption (AI-1, AI-2)
- [ ] Skema event & generator data sintetis 60 hari (DS-1, DS-2)
- [ ] Minta data menu lengkap, aset brand, dan contoh caption ke owner (FS-2, AI-1)

**Selesai jika:** API menu & login jalan di staging, katalog tampil, prompt v1 diuji, data menu diterima.

## Minggu 2 — 27 Nov – 3 Des: Alur owner end-to-end
- [ ] Panel admin terhubung API + upload foto; tombol WhatsApp (FS-2)
- [ ] Endpoint AI caption + grounding + validator (FS-1, AI-1)
- [ ] Endpoint & prompt AI Vision (AI-2, FS-1)
- [ ] Endpoint event + tracker di katalog (FS-1, DS-1)
- [ ] Dashboard v1 dengan data sintetis; prediksi tren & jam tersibuk v1 (DS-1, DS-2, FS-2)

**Selesai jika:** tambah menu → caption AI → salin berjalan; event tersimpan; AI Vision membaca foto uji; dashboard v1 tampil.

## Minggu 3 — 4–10 Des: Semua alur di URL publik
- [ ] Guardrail, rate limit, fallback LLM (FS-1, AI-1)
- [ ] Integrasi AI Vision ke form admin (FS-2, AI-2)
- [ ] Generator UTM + varian, rekomendasi promosi, feedback caption (FS-1, AI-1)
- [ ] Kalkulator harga promo (FS-2) — P2
- [ ] Workflow `forecast.yml` + tombol "Perbarui perkiraan" (DS-1, FS-1)
- [ ] Deploy production, uji integrasi, cek keamanan dasar (FS-1)
- [ ] **10 Des:** tautan dipasang di bio medsos Djajan → pilot dimulai (seluruh tim)

**Selesai jika:** seluruh alur utama berjalan di URL publik dan pilot dimulai.

## Minggu 4 — 11–20 Des: Uji, UAT, dokumentasi
- [ ] Pengujian menyeluruh & regresi (seluruh tim)
- [ ] Evaluasi prediksi & jam posting dengan data pilot (DS-1, DS-2)
- [ ] Evaluasi akhir kualitas caption & AI Vision (AI-2)
- [ ] Demo & UAT dengan owner: ukur waktu caption manual vs AI, kuesioner (seluruh tim)
- [ ] Perbaikan bug, README, panduan owner, video demo, laporan akhir

## Definition of Done (setiap tugas/PR)
- Sesuai kontrak `API.md` / `DATA_MODEL.md` (atau dokumen diperbarui di PR yang sama)
- Ada test yang relevan dan CI hijau
- Input divalidasi; pesan error dalam Bahasa Indonesia
- Tidak ada secret / data pribadi di kode
- Sudah dicoba di tampilan ponsel (untuk perubahan UI)
- Di-review minimal 1 anggota
