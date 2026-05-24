import { Routes, Route, Navigate } from 'react-router-dom'
import ParticleBackground from './components/ParticleBackground'
import Sidebar from './components/Sidebar'
import NgauNhienPage from './pages/NgauNhienPage'
import FanCungPage from './pages/FanCungPage'
import DoiDauPage from './pages/DoiDauPage'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden relative">
      <ParticleBackground />
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/ngau-nhien" replace />} />
            <Route path="/ngau-nhien" element={<NgauNhienPage />} />
            <Route path="/fan-cung" element={<FanCungPage />} />
            <Route path="/doi-dau" element={<DoiDauPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
