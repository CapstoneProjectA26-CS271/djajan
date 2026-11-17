# UI / UX Design Guide

PJ: FS-2 (katalog, admin, dashboard), DS-2 (isi dashboard). Bahasa UI: **Bahasa Indonesia**, santai tapi jelas.

## Prinsip

1. **Mobile-first.** Pengunjung datang dari Instagram/Threads di ponsel. Desain dari lebar 360 px, baru diperluas.
2. **Satu aksi utama per layar.** Katalog → "Pesan via WhatsApp". Admin → "Buat Caption AI".
3. **Owner bukan orang teknis.** Hindari istilah seperti UTM, WAPE, run. Pakai "sumber kunjungan",
   "tingkat akurasi perkiraan", "terakhir diperbarui".
4. **Jujur soal data.** Data contoh/sintetis diberi label "Data contoh". Prediksi diberi label "Perkiraan".

## Identitas visual

- Warna, logo, dan font brand **dikonfirmasi ke owner Djajan** (minta aset di Minggu 1). Sampai itu tersedia,
  gunakan token placeholder di Tailwind (`--color-brand`, `--color-brand-soft`, `--color-accent`) agar mudah diganti.
- Foto menu adalah pusat visual: rasio 4:3 atau 1:1 konsisten, `object-cover`, lazy load, ukuran ≤ 500 KB.
- Kontras teks memenuhi WCAG AA (≥ 4.5:1). Area tap minimal 44×44 px.

## Halaman

### Publik
| Halaman | Isi utama |
|---|---|
| Beranda / Katalog (`/`) | Header (logo, tagline singkat), chip filter kategori, grid kartu menu (foto, nama, harga, label "Lagi naik daun" opsional), tombol WhatsApp melayang (sticky) |
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
- Pesan WhatsApp otomatis: `Halo Djajan! Aku mau pesan {nama menu} ({harga}). Masih ada?`
- Caption berhasil: "3 caption siap! Pilih yang paling cocok lalu salin."
- AI sedang tidak tersedia: "AI lagi sibuk, kami pakai template dulu ya. Kamu tetap bisa mengeditnya."
- Hasil foto perlu dicek: "Beberapa nama/harga kurang jelas, cek bagian yang ditandai kuning sebelum disimpan."
