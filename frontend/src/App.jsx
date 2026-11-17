import { BrowserRouter, Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50">
      <h1 className="text-4xl font-bold text-amber-700">Djajan</h1>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
