import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { sampleMenus } from './catalog-sample'

// Project format is "Rp25.000" (no space); Intl's IDR currency style would print "Rp 25.000".
const rupiah = { format: amount => `Rp${amount.toLocaleString('id-ID')}` }
const categories = [...new Set(sampleMenus.map(({ category }) => category))]
const whatsappNumber = import.meta.env.VITE_WA_NUMBER?.trim()
const hasWhatsappNumber = /^62\d{7,13}$/.test(whatsappNumber ?? '')
const INSTAGRAM_URL = 'https://www.instagram.com/djajan.idn/'

// Backend stores categories in lower case ("mac & cheese"); show them capitalized.
function formatCategory(category) {
  return category.replace(/(^|\s)\S/g, letter => letter.toUpperCase())
}

function OrderLink({ menu, compact = false }) {
  const message = menu
    ? `Halo DJAJAN! Aku mau pesan ${menu.name} (${rupiah.format(menu.price)}). Masih ada?`
    : 'Halo DJAJAN! Aku mau tanya soal menu.'

  if (!hasWhatsappNumber) return <p className="text-sm">Pemesanan via WhatsApp belum tersedia.</p>

  return (
    <a className={compact ? 'menu-order' : 'action justify-center text-center'} href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`}>
      Pesan via WhatsApp{compact && <span aria-hidden="true"> →</span>}
    </a>
  )
}

// TODO(FS-2): logo dan foto menu belum diizinkan owner untuk dipublikasikan. Selama itu, tampilkan kotak warna
// brand berisi nama menu. Setelah izin ada, foto diunggah lewat panel admin dan tampil dari image_url.
function MenuPhoto({ menu, large = false }) {
  if (menu.image_url) {
    return <img className="menu-photo" src={menu.image_url} alt={menu.name} loading="lazy" width="800" height="600" />
  }
  return (
    <div className={`menu-photo photo-placeholder ${large ? 'text-4xl' : 'text-2xl'}`} role="img" aria-label={`Foto ${menu.name} menyusul`}>
      <span aria-hidden="true">{menu.name}</span>
    </div>
  )
}

function MenuCard({ menu }) {
  return (
    <li className="min-w-0">
      <article className="menu-card">
        <Link className="menu-card-link" to={`/menu/${menu.slug}`}>
          <MenuPhoto menu={menu} />
          <h3 className="mt-4 text-lg font-black">{menu.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm">{menu.description}</p>
          <p className="price mt-3">{rupiah.format(menu.price)}</p>
        </Link>
        <OrderLink menu={menu} compact />
      </article>
    </li>
  )
}

function Home() {
  const [category, setCategory] = useState('')
  const menus = sampleMenus.filter(menu => !category || menu.category === category)

  return (
    <main>
      <section className="hero">
        <div className="frame hero-layout">
          <div>
            <p className="mb-3 font-bold uppercase tracking-widest">DJAJAN · Surabaya</p>
            <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">Mac &amp;<br />Cheese</h1>
            <p className="mt-4 text-lg font-semibold">Creamy, cheesy, bikin happy. Mulai {rupiah.format(Math.min(...sampleMenus.map(menu => menu.price)))}.</p>
            <a className="action mt-6" href="#menu">Lihat menu</a>
          </div>
          {/* TODO(FS-2): ganti dengan foto menu setelah ada izin owner. */}
          <div className="hero-placeholder" role="img" aria-label="Foto Mac & Cheese menyusul">
            <span aria-hidden="true">🧀</span>
          </div>
        </div>
      </section>
      <section className="py-10 sm:py-14" id="menu" aria-labelledby="menu-title">
        <div className="frame">
          <h2 id="menu-title" className="text-3xl font-black sm:text-4xl">Pilih Mac favoritmu</h2>
          {/* One category means nothing to filter; the chips come back when owner adds another. */}
          {categories.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
              {['', ...categories].map(value => (
                <button key={value} className="filter" type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
                  {value ? formatCategory(value) : 'Semua'}
                </button>
              ))}
            </div>
          )}
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-8">
            {menus.map(menu => <MenuCard key={menu.slug} menu={menu} />)}
          </ul>
          <p className="mt-8 text-sm font-semibold">Menu lain lagi dalam pengembangan. Pantau terus ya! 💛</p>
        </div>
      </section>
    </main>
  )
}

function MenuDetail() {
  const { slug } = useParams()
  const menu = sampleMenus.find(item => item.slug === slug)
  if (!menu) return <NotFound />

  return (
    <main className="frame py-8">
      <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to="/">Kembali ke katalog</Link>
      <article className="mt-4 grid gap-6 rounded-2xl bg-white p-6 md:grid-cols-2">
        <MenuPhoto menu={menu} large />
        <div>
          <p className="font-semibold">{formatCategory(menu.category)}</p>
          <h1 className="my-3 text-3xl font-black sm:text-4xl">{menu.name}</h1>
          <p className="price mb-4 text-2xl">{rupiah.format(menu.price)}</p>
          <p className="mb-6">{menu.description}</p>
          <OrderLink menu={menu} />
        </div>
      </article>
    </main>
  )
}

function NotFound() {
  return (
    <main className="frame py-8">
      <h1 className="mb-5 text-3xl font-black">Menu atau halaman tidak ditemukan</h1>
      <Link className="action" to="/">Kembali ke katalog</Link>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <header className="bg-accent">
        <div className="frame flex min-h-18 items-center justify-between">
          {/* TODO(FS-2): pakai logo resmi setelah ada izin owner; sementara wordmark teks. */}
          <Link className="flex min-h-11 items-center text-2xl font-black tracking-tight" to="/">
            DJAJAN
          </Link>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu/:slug" element={<MenuDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="bg-ink py-8 text-white">
        <div className="frame flex flex-wrap items-center justify-between gap-4">
          <p className="font-black">DJAJAN · Surabaya</p>
          <a className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            Instagram @djajan.idn
          </a>
        </div>
      </footer>
    </BrowserRouter>
  )
}

export default App
