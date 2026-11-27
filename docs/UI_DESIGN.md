# UI / UX Design Guide

PJ: FS-2 (katalog, admin, dashboard), DS-2 (isi dashboard). Bahasa UI: **Bahasa Indonesia**, santai tapi jelas.

## Prinsip

1. **Mobile-first.** Pengunjung datang dari Instagram/Threads di ponsel. Desain dari lebar 360 px, baru diperluas.
2. **Satu aksi utama per layar.** Katalog → "Pesan via WhatsApp". Admin → "Buat Caption AI".
3. **Owner bukan orang teknis.** Hindari istilah seperti UTM, WAPE, run. Pakai "sumber kunjungan",
   "tingkat akurasi perkiraan", "terakhir diperbarui".
4. **Jujur soal data.** Data contoh/sintetis diberi label "Data contoh". Prediksi diberi label "Perkiraan".

## Identitas visual

Arahan dari owner DJAJAN (Nov 2026):

- **Warna:** dominan kuning dan oranye, nuansa ceria, playful, dan menggugah selera.
- **Karakter:** fun, affordable, approachable; tidak terlalu formal. Tipografi **bold**, elemen dekoratif playful,
  dan **foto makanan sebagai fokus utama**.
- **Katalog:** clean, playful, modern, eye-catching, mudah dipakai. Harga jelas, deskripsi singkat, navigasi
  sederhana, konsisten dengan promosi DJAJAN di media sosial.
- **Nama brand** ditulis **DJAJAN**. Instagram resmi: `@djajan.idn` (tampil di footer katalog).

### Token warna (Tailwind `@theme` di `frontend/src/index.css`)

| Token | Hex | Dipakai untuk |
|---|---|---|
| `--color-accent` | `#FFC93C` | Kuning: header, hero, chip aktif |
| `--color-brand` | `#F26B0F` | Oranye: blok dekoratif, placeholder foto |
| `--color-brand-dark` | `#A63A05` | Oranye tua: tombol utama, harga, tautan |
| `--color-brand-soft` | `#FFF4D1` | Krem kekuningan: latar halaman |
| `--color-ink` | `#3A1A06` | Cokelat gelap: teks utama, footer |

Pasangan teks yang lolos WCAG AA (≥ 4.5:1): `ink` di atas `accent` (10.28), `brand-soft` (14.37), `brand` (5.18),
putih (15.79); putih di atas `brand-dark` (6.50) dan `ink` (15.79); `brand-dark` di atas `brand-soft` (5.92) dan
putih (6.50). **Jangan** memakai: putih di atas `brand` (3.05), `brand-dark` di atas `accent` (4.23), `ink` di atas
`brand-dark` (2.43). Area tap minimal 44×44 px.

### Logo dan foto: belum boleh dipublikasikan

Owner belum mengizinkan logo dan foto menu dipakai di repo atau situs. Sampai ada izin tertulis:

- Header memakai wordmark teks **DJAJAN**, bukan file logo.
- Foto menu diganti placeholder: kotak `brand` dengan nama menu (rasio 4:3). Hero memakai blok warna.
- Tandai setiap placeholder dengan `TODO(FS-2)` di kode. **Jangan** commit file logo/foto ke repo (repo publik).
  Setelah ada izin, foto diunggah owner lewat panel admin (Supabase Storage) dan tampil dari `image_url`.
- Aturan foto setelah tersedia: rasio 4:3 konsisten, `object-cover`, lazy load, ukuran ≤ 500 KB.

## Halaman

### Publik
| Halaman | Isi utama |
|---|---|
| Beranda / Katalog (`/`) | Header (logo; sementara wordmark), hero, chip filter kategori (disembunyikan bila hanya ada 1 kategori), grid kartu menu (foto, nama, deskripsi singkat, harga, label "Lagi naik daun" opsional), catatan "menu lain dalam pengembangan", footer dengan Instagram, tombol WhatsApp melayang (sticky) |
| Detail menu (`/menu/:slug`) | Foto besar, nama, harga, deskripsi, tombol "Pesan via WhatsApp" besar, menu lain |
| 404 / menu habis | Pesan ramah + kembali ke katalog |

Open Graph: `og:title`, `og:description`, `og:image` (foto menu atau logo) di setiap halaman.

### Admin
| Halaman | Isi utama |
|---|---|
| Login | Email, password, pesan error jelas, info jeda setelah 5x gagal |
| Daftar menu | Tabel/kartu menu, status tersedia, tombol tambah, edit, hapus (konfirmasi) |
| Form menu | Field nama, kategori, harga, deskripsi, foto, toggle tersedia; tombol **"Isi dari foto daftar menu"** (AI Vision) yang mengisi draf dengan penanda kuning untuk item yang perlu dicek |
| Studio Caption AI | Pilih menu → pilih kanal → (opsional) gaya, harga promo/kalkulator, catatan → "Buat Caption" → 3 kartu varian (teks, label gaya, tombol Salin, tautan, 👍/👎/edit) |
| Dashboard | Lihat di bawah |
| Rekomendasi | Kartu "Promosikan ini minggu ini": menu, alasan berbasis angka, jam posting terbaik, tombol "Buat caption" |

### Dashboard (urutan dari atas)
1. Filter tanggal + toggle "sertakan data contoh" + "Terakhir diperbarui …" + tombol "Perbarui perkiraan".
2. KPI: Kunjungan · Klik WhatsApp · Rasio klik WhatsApp · Menu terfavorit.
3. Tren harian (garis): kunjungan vs klik WhatsApp.
4. Menu terfavorit (bar horizontal, maks 10).
5. Efektivitas kanal (bar): klik WhatsApp & rasio per sumber.
6. **Gaya caption terbaik** (bar per gaya/varian) — inti cerita pitch.
7. Menu naik daun + perkiraan 7 hari (garis putus-putus untuk perkiraan).
8. Jam posting terbaik per kanal (heatmap jam × kanal atau bar per jam).

## State wajib di setiap layar data
Loading (skeleton) · Kosong (penjelasan + aksi) · Error (pesan Bahasa Indonesia + coba lagi) · Sukses.

## Contoh teks UI
- Tombol utama katalog: **"Pesan via WhatsApp"**
- Pesan WhatsApp otomatis: `Halo DJAJAN! Aku mau pesan {nama menu} ({harga}). Masih ada?`. Nomor dari env
  `VITE_WA_NUMBER` (format `62xxxxxxxxxx`); isi nilai asli hanya di `frontend/.env` lokal dan secret hosting.
- Caption berhasil: "3 caption siap! Pilih yang paling cocok lalu salin."
- AI sedang tidak tersedia: "AI lagi sibuk, kami pakai template dulu ya. Kamu tetap bisa mengeditnya."
- Hasil foto perlu dicek: "Beberapa nama/harga kurang jelas, cek bagian yang ditandai kuning sebelum disimpan."
