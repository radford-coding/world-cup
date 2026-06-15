import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Games from './components/Games'
import Teams from './components/Teams'
import Standings from './components/Standings'
import { triggerSync } from './api'

export default function App() {
  useEffect(() => {
    triggerSync().catch(() => {})
  }, [])

  return (
    <div className="app">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/games" replace />} />
          <Route path="/games" element={<Games />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/standings" element={<Standings />} />
        </Routes>
      </main>
    </div>
  )
}
