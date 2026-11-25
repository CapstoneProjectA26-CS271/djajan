import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { sampleMenus } from './catalog-sample'
import logo from './assets/logo/ddjlogo.jpg'
import heroPhoto from './assets/mac-and-cheese-hero.jpg'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
})
const categories = [...new Set(sampleMenus.map(({ category }) => category))]

function MenuCard({ menu }) {
  return (
    <li>
      <article className="menu-card">
        <span className="text-sm">Ukuran {menu.size}</span>
        <h3 className="mt-3 text-xl font-black">{menu.name}</h3>
        <p className="mt-3 inline-block rounded-full bg-accent px-3 py-1 font-bold text-ink">{rupiah.format(menu.price)}</p>
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
      <section className="frame py-8" id="menu" aria-labelledby="menu-title">
        <h2 id="menu-title" className="text-3xl font-black">Daftar menu</h2>
        <p className="mt-2 text-sm">Pratinjau menu dan harga dari poster D’JAJAN.</p>
        <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
          {['', ...categories].map(value => (
            <button key={value} className="filter" type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
              {value || 'Semua'}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {menus.map(menu => <MenuCard key={menu.slug} menu={menu} />)}
        </ul>
      </section>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
