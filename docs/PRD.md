# PRD – Djajan Digital Storefront & AI Promotion

Sumber: dokumen Use Case UMKM (interview 22 Okt 2026) dan Project Plan final tim A26-CS271.

## 1. Latar belakang

- **UMKM:** Djajan (F&B, Surabaya, sejak 2020). Owner & PIC: Lintang Laxita.
- **Produk:** makanan/minuman yang mengikuti tren kuliner; menu sering berganti.
- **Target pelanggan:** kelas menengah usia 15–35 tahun (Milenial, Gen Z, Gen Alpha), area Surabaya dan sekitarnya.
- **Kanal saat ini:** WhatsApp, Instagram, Threads, GrabFood; rencana Facebook. Pesanan dicatat manual.

## 2. Masalah (dikonfirmasi owner)

Jangkauan pemasaran digital terbatas. Owner membuat ide dan teks promosi manual, membagikannya tanpa tautan ke
menu lengkap, sehingga calon pelanggan sulit melihat menu utuh dan pertumbuhan organik lambat. Owner juga belum
punya data tentang menu, kanal, dan gaya promosi yang benar-benar menghasilkan pesanan.

## 3. Pengguna

| Pengguna | Kebutuhan |
|---|---|
| **Owner (admin)** | Kelola menu cepat, buat caption promosi tanpa mikir lama, tahu promosi mana yang berhasil |
| **Calon pelanggan** | Lihat menu lengkap di ponsel dari tautan medsos, pesan semudah mungkin via WhatsApp |

## 4. Alur utama (harus bisa didemokan)

**Owner:** login → tambah/ubah menu (bisa isi dari foto via AI Vision) → pilih menu + kanal → "Buat Caption AI" →
pilih 1 dari 3 varian (harga benar, tautan katalog ber-UTM per varian) → salin → posting.

**Calon pelanggan:** lihat postingan → klik tautan → katalog di ponsel → "Pesan via WhatsApp" → WhatsApp owner
terbuka dengan pesan berisi nama menu & harga.

**Siklus data:** kunjungan, klik menu, klik WhatsApp dicatat + sumber kanal + varian caption + jam →
dashboard (menu terfavorit, rasio klik WA, kanal & varian terbaik, prediksi tren, jam posting terbaik) →
AI menyarankan menu yang layak dipromosikan dan membuatkan caption-nya.

## 5. Fitur & kriteria keberhasilan

| # | Fitur | Prioritas | Kriteria keberhasilan | PJ |
|---|---|---|---|---|
| F1 | Katalog publik (beranda, daftar & detail menu, filter kategori), mobile-first, Open Graph preview | Wajib | Rapi di lebar 360 px; Lighthouse mobile ≥ 85; preview tautan menampilkan foto & nama Djajan | FS-2 |
| F2 | Tombol "Pesan via WhatsApp" dengan pesan otomatis | Wajib | WhatsApp owner terbuka dengan nama menu & harga yang benar | FS-2 |
| F3 | REST API & database menu (CRUD, upload foto, validasi) + dokumentasi API | Wajib | Endpoint terdokumentasi; input tidak valid ditolak dengan pesan jelas | FS-1 |
| F4 | Autentikasi admin | Wajib | Admin tidak bisa diakses tanpa login; 5x salah password → jeda | FS-1 |
| F5 | Panel admin CRUD menu | Wajib | Perubahan langsung tampil di katalog | FS-1, FS-2 |
| F6 | AI Copywriting (few-shot brand voice, grounding, pilihan kanal & gaya, 3 varian, tombol salin) | Wajib | ≤ 10 detik; 100% nama & harga cocok DB; owner menilai ≥ 70% layak pakai | AI-1, FS-1 |
| F7 | Guardrail & fallback AI | Wajib | Caption salah harga dibuat ulang/ditolak; API utama mati → caption tetap keluar | FS-1, AI-1 |
| F8 | Event tracking + UTM | Wajib | Event tersimpan dengan sumber benar; tanpa UTM = "direct" | DS-1, FS-1 |
| F9 | Dashboard analitik | Wajib | Angka sama dengan query langsung ke DB; mudah dibaca owner | DS-2, FS-2 |
| F10 | Deployment publik + CI/CD | Wajib | URL HTTPS publik; pipeline gagal bila test gagal; tidak ada secret di repo | FS-1 |
| F11 | AI Vision: ekstraksi nama & harga dari foto daftar menu | Tambahan P1 | ≥ 80% nama & harga terbaca benar (foto normal); hasil bisa dikoreksi | AI-2, FS-2 |
| F12 | Generator tautan UTM per kanal + penanda varian caption | Tambahan P1 | Tiap caption punya tautan unik; klik muncul di kanal & varian yang benar | FS-1 |
| F13 | Rekomendasi promosi berbasis data | Tambahan P1 | Sesuai data dashboard; bisa jadi caption dengan 1 klik | DS-2, FS-1, AI-1 |
| F14 | Prediksi tren menu (skor naik daun, perkiraan klik 7 hari) | Tambahan P1 | Tampil di dashboard; pipeline terjadwal; error diukur pada data pilot | DS-1 |
| F15 | Waktu posting terbaik per kanal | Tambahan P1 | Jam tersibuk per kanal sesuai data event | DS-2 |
| F16 | Pilot 7 hari (tautan di bio medsos Djajan) | Tambahan P1 | Data riil tampil saat demo | Seluruh tim |
| F17 | Feedback owner pada caption | Tambahan P2 | Rasio caption diterima tercatat; caption disukai jadi contoh few-shot | FS-1, AI-2 |
| F18 | Kalkulator harga promo | Tambahan P2 | Harga & margin akurat untuk 5 kasus uji; caption memakai harga promo | FS-2 |
| F19 | Pengujian, UAT, dokumentasi | Wajib | Semua uji lulus; panduan owner bisa diikuti tanpa bantuan | Seluruh tim |

## 6. Pembeda (untuk pitch)

AI tidak hanya **menulis** caption, tapi membantu owner tahu **menu apa, gaya caption apa, dan jam berapa**
yang paling mendatangkan pesanan — dibuktikan dengan data pilot riil (klik WhatsApp per kanal & per varian).

## 7. Indikator UAT dengan owner

- Owner menyelesaikan alur tambah menu → caption tanpa bantuan dalam < 3 menit.
- Waktu membuat caption manual vs dengan AI dibandingkan.
- Owner mengisi kuesioner kepuasan; feedback dicatat.

## 8. Di luar scope

Keranjang, checkout, payment gateway; pencatatan transaksi; manajemen stok/bahan baku; posting otomatis ke
Instagram/Threads (tidak ada akses API akun UMKM); aplikasi mobile native; melatih model deep learning sendiri.

## 9. Asumsi & batasan

- LLM memakai free tier (ada batas request).
- Data historis UMKM tidak tersedia → data sintetis sampai pilot dimulai.
- Prototype untuk demonstrasi & validasi; bukan sistem produksi. Indikator bisnis tidak boleh diklaim tercapai.
