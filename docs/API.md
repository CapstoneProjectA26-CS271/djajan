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
| GET | `/health/db` | Cek koneksi database (`select 1`): `200 { status: "ok" }` atau `503 { status: "error", message }` |
| GET | `/api/menus?category=` | Daftar menu tersedia (tidak termasuk yang dihapus) → `{ menus: [...] }`, urut kategori lalu nama |
| GET | `/api/menus/:slug` | Detail satu menu → `{ menu }`. Menu yang sedang habis tetap dikembalikan (`is_available: false`); yang dihapus → 404 |
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

Field menu publik: `id, slug, name, category, price, description, image_url, is_available, updated_at`.
`cost_price` **tidak pernah** dikirim ke endpoint publik. Filter `category` tidak peka huruf besar/kecil.

## Auth

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ token }`. 5x gagal → 429 + jeda 15 menit |
| GET | `/api/auth/me` | Data admin yang sedang login → `{ admin: { id, email, created_at } }` |
| PATCH | `/api/auth/password` | Ganti password (wajib JWT). Body `{ current_password, new_password }` → `{ "status": "success", "message": "Password berhasil diubah" }` |

Login:
- Email/password salah → `401 "Email atau password salah"` (pesan sama untuk email yang tidak terdaftar).
- Dua lapis batas, keduanya → 429: per akun (5x password salah → akun dikunci 15 menit, disimpan di
  `admins.locked_until`) dan per IP (5 percobaan gagal per 15 menit, lintas email).
- Login sukses mengosongkan hitungan gagal akun.

Ganti password:

- `new_password` minimal 12 karakter, maksimal 72 byte (batas bcrypt), dan harus berbeda dari
  `current_password`. Input tidak valid → 400.
- `current_password` salah → **400** `"Password lama salah"`, bukan 401, supaya frontend tidak me-logout owner.
- 5 percobaan gagal per akun (bukan per IP) dalam 15 menit → 429.
- Sukses juga membuka kunci login akun. Token lama **tetap berlaku** sampai kedaluwarsa (8 jam), karena belum
  ada pencabutan token.

Token tidak ada / tidak valid / kedaluwarsa → 401. Saat 401 di rute admin, frontend menghapus token dan
mengarahkan ke halaman login. Semua path di bawah `/api/admin/` membalas 401 tanpa token, termasuk path yang
tidak ada.

## Admin – Menu

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/menus` | Semua menu (termasuk tidak tersedia) → `{ menus: [...] }` |
| GET | `/api/admin/menus/:id` | Detail satu menu untuk form edit → `{ menu }` |
| POST | `/api/admin/menus` | Buat menu → `201 { menu }`. Body: `name, category, price, description?, image_url?, cost_price?, is_available?` |
| PUT | `/api/admin/menus/:id` | Ubah menu → `{ menu }`. Body: **hanya field yang diubah** (minimal satu); `null` mengosongkan field opsional |
| DELETE | `/api/admin/menus/:id` | Soft delete → `{ id }` |
| POST | `/api/admin/uploads` | `multipart/form-data` field `image`; jpg/png/webp; ≤ 2 MB → `{ url }` |

Validasi: `name` 1–100 karakter, `price` integer > 0, `description` ≤ 500 karakter. Slug dibuat backend.
Rinciannya:

- `price` dan `cost_price` harus **number** integer (bukan string `"25000"`), maksimal 10.000.000; `cost_price` ≥ 0.
- `category` 1–50 karakter, disimpan huruf kecil. `image_url` harus `http://` / `https://`.
- Teks di-trim; `description`/`image_url` kosong disimpan `null`. `is_available` boolean, default `true`.
- Field tak dikenal diabaikan, termasuk `slug` dari klien.
- Slug dibuat dari nama saat menu dibuat dan **tidak berubah** walau nama diganti (dipakai di tautan &
  `utm_campaign`). Slug yang sudah dipakai, termasuk oleh menu terhapus, diberi akhiran `-2`, `-3`, ….
- `cost_price` hanya muncul di respons admin.
- `:id` bukan UUID atau menu sudah dihapus → 404 `"Menu tidak ditemukan"`.

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
