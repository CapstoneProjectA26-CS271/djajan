import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { sampleMenus } from './catalog-sample'
import logo from './assets/logo/ddjlogo.jpg'
import heroPhoto from './assets/mac-and-cheese-hero.jpg'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
})
const categories = [...new Set(sampleMenus.map(({ category }) => category))]
const whatsappNumber = import.meta.env.VITE_WA_NUMBER?.trim()
const hasWhatsappNumber = /^62\d{7,13}$/.test(whatsappNumber ?? '')

function OrderLink({ menu, compact = false }) {
  const message = menu
    ? `Halo Djajan! Aku mau pesan ${menu.name} (${rupiah.format(menu.price)}). Masih ada?`
    : 'Halo Djajan! Aku mau tanya soal menu.'

  if (!hasWhatsappNumber) return <p className="text-sm">Pemesanan via WhatsApp belum tersedia.</p>

  return (
    <a className={compact ? 'menu-order' : 'action justify-center text-center'} href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`}>
      Pesan lewat WhatsApp{compact && <span aria-hidden="true"> →</span>}
    </a>
  )
}

function MenuCard({ menu }) {
  return (
    <li className="min-w-0">
      <article className="menu-card">
        <Link className="menu-card-link" to={`/menu/${menu.slug}`}>
          <img className="menu-photo" src={heroPhoto} alt="" loading="lazy" width="960" height="640" />
          <h3 className="mt-4 text-lg font-black">{menu.name}</h3>
          <p className="mt-1 text-sm">Ukuran {menu.size}</p>
          <p className="mt-3 text-lg font-extrabold">{rupiah.format(menu.price)}</p>
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
            <p className="mb-3 font-bold uppercase tracking-widest text-accent">D’JAJAN · Surabaya</p>
            <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">Mac n’<br /><span className="text-accent">Cheese</span></h1>
            <p className="mt-4 text-lg">Empat varian, dari Classic sampai Deluxe.</p>
            <a className="action hero-action mt-6" href="#menu">Lihat menu</a>
          </div>
          <figure>
            <img className="aspect-3/2 w-full rounded-2xl object-cover" src={heroPhoto} alt="Ilustrasi Mac n’ Cheese dalam kotak kraft dengan ayam renyah dan tortilla chips" fetchPriority="high" />
          </figure>
        </div>
      </section>
      <section className="bg-white py-10 sm:py-14" id="menu" aria-labelledby="menu-title">
        <div className="frame">
        <h2 id="menu-title" className="text-3xl font-black sm:text-4xl">Pilih Mac favoritmu</h2>
        <p className="mt-2 text-sm">Menu dan harga contoh dari poster D’JAJAN. Gambar merupakan ilustrasi penyajian.</p>
        <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
          {['', ...categories].map(value => (
            <button key={value} className="filter" type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
              {value || 'Semua'}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-8">
          {menus.map(menu => <MenuCard key={menu.slug} menu={menu} />)}
        </ul>
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
      <article className="mt-4 rounded-xl border border-orange-200 bg-white p-6">
        <p>{menu.category} · Ukuran {menu.size}</p>
        <h1 className="my-3 text-3xl font-black sm:text-4xl">{menu.name}</h1>
        <p className="mb-5 text-xl font-bold text-brand-dark">{rupiah.format(menu.price)}</p>
        <OrderLink menu={menu} />
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
          <Link className="flex min-h-11 items-center gap-3 text-xl font-black" to="/">
            <img src={logo} width="48" height="48" className="rounded-full" alt="" />
            D’JAJAN
          </Link>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu/:slug" element={<MenuDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
