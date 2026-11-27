// Data menu resmi dari owner DJAJAN (Nov 2026), dalam bentuk field publik GET /api/menus (docs/API.md)
// supaya pindah ke API nanti cukup mengganti sumber datanya. Kategori disimpan huruf kecil seperti di backend.
// Menu lain masih dalam pengembangan owner.
// TODO(FS-2): ganti dengan data dari GET /api/menus saat katalog disambungkan ke backend.
export const sampleMenus = [
  {
    slug: 'classic-mac',
    name: 'Classic Mac',
    category: 'mac & cheese',
    price: 15000,
    description:
      'Mac & cheese dengan saus keju creamy dan macaroni, cocok untuk pencinta keju yang ingin menikmati menu simpel dan nikmat.',
    image_url: null,
    is_available: true,
  },
  {
    slug: 'royale-mac',
    name: 'Royale Mac',
    category: 'mac & cheese',
    price: 15000,
    description: 'Mac & cheese creamy dengan tambahan chicken, memberikan rasa gurih dan lebih mengenyangkan.',
    image_url: null,
    is_available: true,
  },
  {
    slug: 'signature-mac',
    name: 'Signature Mac',
    category: 'mac & cheese',
    price: 25000,
    description:
      'Mac & cheese ukuran medium dengan chicken dan saus keju yang creamy, cocok untuk menu makan yang lebih puas.',
    image_url: null,
    is_available: true,
  },
  {
    slug: 'deluxe-mac',
    name: 'Deluxe Mac',
    category: 'mac & cheese',
    price: 30000,
    description: 'Mac & cheese dengan chicken dan lettuce, perpaduan creamy, gurih, dan segar dalam satu sajian.',
    image_url: null,
    is_available: true,
  },
]
