# Deploy

## Backend staging (Render, paket gratis)

Konfigurasi ada di `render.yaml` (Blueprint) di root repo.

| Item | Nilai |
|---|---|
| Service | `djajan-backend-staging`, web service Node 22, region Singapore |
| Sumber | branch `main`, folder `backend/` |
| Deploy otomatis | hanya setelah CI hijau (`autoDeployTrigger: checksPass`) |
| Health check | `GET /health` |
| Database | Supabase `djajan-dev`, Session pooler, user `app_backend` |

### Membuat service (sekali, oleh FS-1)

1. Render Dashboard → **New** → **Blueprint** → pilih repo `CapstoneProjectA26-CS271/djajan`, branch `main`.
2. Render membaca `render.yaml` dan meminta nilai env yang bertanda `sync: false`:
   - `DATABASE_URL`: connection string Session pooler `djajan-dev` dengan user `app_backend.<project-ref>`.
     Password berkarakter khusus wajib di-URL-encode. **Jangan** tambahkan `?sslmode=`; TLS diverifikasi
     backend memakai `backend/certs/prod-ca-2021.crt`.
   - `FRONTEND_URL`: origin frontend, dipisah koma. Selama frontend belum di-deploy cukup
     `http://localhost:5173`; tambahkan URL Vercel setelah frontend online.
   - `SUPABASE_URL` (`https://<project-ref>.supabase.co`) dan `SUPABASE_SERVICE_KEY` (secret key dari
     Project Settings → API Keys): untuk upload foto menu. Wajib karena staging memakai `NODE_ENV=production`;
     tanpa keduanya server gagal start. Jalankan `npm run storage:setup` sekali dari lokal untuk membuat bucket.
   - `JWT_SECRET` dibuat otomatis oleh Render.
3. **Apply**. Setelah deploy pertama selesai, cek:
   - `https://<service>.onrender.com/health` → `{"status":"ok"}`
   - `https://<service>.onrender.com/health/db` → `{"status":"ok"}` (koneksi ke Supabase)
   - `https://<service>.onrender.com/api/menus` → daftar menu.

### Catatan paket gratis

- Service tidur setelah 15 menit tanpa request; request pertama setelahnya butuh ±1 menit. Buka `/health`
  sebelum demo.
- Jatah 750 jam/bulan per workspace. Hanya satu service yang boleh dibuat selalu menyala (mis. dengan ping
  berkala); keputusan untuk produksi diambil sebelum pilot 10 Des.
- Rate limiter memakai memori: hitungannya ter-reset saat service restart atau tidur.
- Mengganti `JWT_SECRET` membuat semua token yang sudah dibagikan tidak berlaku (owner harus login ulang).
