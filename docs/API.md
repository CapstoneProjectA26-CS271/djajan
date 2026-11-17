# API Contract (REST, JSON)

Base URL: `/api`. Kontrak antar frontend, backend, dan tim Data/AI. Versi OpenAPI lengkap disusun FS-1 di
`backend/openapi.yaml` dan harus konsisten dengan dokumen ini.

## Konvensi

- Sukses: `{ "status": "success", "data": { ... } }`
- Gagal validasi / bisnis (4xx): `{ "status": "fail", "message": "Pesan dalam Bahasa Indonesia" }`
- Error server (5xx): `{ "status": "error", "message": "Terjadi kesalahan pada server" }` (tanpa detail internal)
- Auth admin: header `Authorization: Bearer <JWT>`; masa berlaku token 8 jam.
- Kode status: 200, 201, 400 (validasi), 401 (belum login), 403, 404, 413 (file terlalu besar), 429 (rate limit), 500, 503 (layanan AI tidak tersedia).

## Publik

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` |
| GET | `/api/menus?category=` | Daftar menu tersedia (tidak termasuk yang dihapus) |
| GET | `/api/menus/:slug` | Detail satu menu |
| POST | `/api/events` | Catat event pengunjung. Rate limit per IP + session |

`POST /api/events` body:
```json
{
  "session_id": "b7c1…",
  "event_type": "wa_click",
  "menu_id": "uuid-or-null",
  "utm": { "source": "instagram", "medium": "social", "campaign": "dimsum-mentai", "content": "3f9a1c2e-b" }
}
```
Respons `201 { "status": "success" }`. Event dengan `event_type` tidak dikenal → 400.

## Auth

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ token }`. 5x gagal → 429 + jeda 15 menit |
| GET | `/api/auth/me` | Data admin yang sedang login |

## Admin – Menu

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/menus` | Semua menu (termasuk tidak tersedia) |
| POST | `/api/admin/menus` | Buat menu. Body: `name, category, price, description?, image_url?, cost_price?, is_available?` |
| PUT | `/api/admin/menus/:id` | Ubah menu |
| DELETE | `/api/admin/menus/:id` | Soft delete |
| POST | `/api/admin/uploads` | `multipart/form-data` field `image`; jpg/png/webp; ≤ 2 MB → `{ url }` |

Validasi: `name` 1–100 karakter, `price` integer > 0, `description` ≤ 500 karakter. Slug dibuat backend.

## Admin – AI

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/admin/ai/captions` | Buat 3 varian caption |
| PATCH | `/api/admin/captions/:id/feedback` | `{ feedback: "like"|"dislike"|"edited", edited_content? }` |
| GET | `/api/admin/captions?menu_id=` | Riwayat caption |
| POST | `/api/admin/ai/vision/extract` | `multipart/form-data` field `image` → draf menu dari foto |

`POST /api/admin/ai/captions` body:
```json
{ "menu_id": "uuid", "channel": "instagram", "style": "fomo", "promo_price": 20000, "extra_note": "promo akhir pekan" }
```
`extra_note` ≤ 200 karakter (diperlakukan sebagai data, bukan instruksi). Respons:
```json
{
  "status": "success",
  "data": {
    "group_id": "uuid",
    "provider": "gemini",
    "variants": [
      { "id": "uuid", "variant": "a", "style": "fomo", "content": "…Rp20.000…", "utm_url": "https://…?utm_source=instagram…&utm_content=3f9a1c2e-a" }
    ]
  }
}
```

`POST /api/admin/ai/vision/extract` respons:
```json
{ "status": "success", "data": { "items": [ { "name": "Dimsum Mentai", "price": 25000, "confidence": 0.92 } ], "warnings": ["Foto kurang jelas di bagian bawah"] } }
```
Hasil **tidak** disimpan otomatis.

## Admin – Analytics & Rekomendasi

Semua menerima `?from=YYYY-MM-DD&to=YYYY-MM-DD&include_synthetic=true|false` (tanggal Asia/Jakarta).

| Method | Path | Data |
|---|---|---|
| GET | `/api/admin/analytics/summary` | total kunjungan, sesi, klik WA, rasio klik WA, tren harian |
| GET | `/api/admin/analytics/menus` | ranking menu: view, klik WA, rasio |
| GET | `/api/admin/analytics/channels` | per `utm_source`: kunjungan, klik WA, rasio |
| GET | `/api/admin/analytics/variants` | per varian/gaya caption: klik WA, rasio (Promo Loop) |
| GET | `/api/admin/analytics/forecast` | run terakhir sukses: menu naik daun + perkiraan 7 hari + `wape`, `updated_at` |
| GET | `/api/admin/analytics/posting-time` | jam tersibuk & rekomendasi per kanal |
| GET | `/api/admin/recommendations` | menu yang disarankan dipromosikan + alasan (data) |
| POST | `/api/admin/forecast/refresh` | Memicu workflow prediksi (202 Accepted); maks 1x per 10 menit |
| GET | `/api/admin/forecast/runs?limit=5` | status run terakhir |
