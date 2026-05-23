import { useState } from 'react'
import ParticleBackground from './components/ParticleBackground'
import Sidebar from './components/Sidebar'
import GenreScreen from './screens/GenreScreen'
import ArtistScreen from './screens/ArtistScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [activeMode, setActiveMode] = useState('nguyen-nhien')
  const [screen, setScreen] = useState('genre')
  const [genre, setGenre] = useState(null)
  const [artists, setArtists] = useState([])

  const handleModeSelect = (mode) => {
    setActiveMode(mode)
    if (mode === 'fan-cung') {
      setScreen('artist')
      setArtists([])
    } else {
      setScreen('genre')
      setGenre(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      <ParticleBackground />
      <div className="relative z-10 flex w-full h-full">
        <Sidebar activeMode={activeMode} onSelectMode={handleModeSelect} />
        <main className="flex-1 overflow-y-auto flex items-center justify-center p-5">
          {screen === 'genre' && (
            <GenreScreen onStart={(g) => { setGenre(g); setScreen('playing') }} />
          )}
          {screen === 'artist' && (
            <ArtistScreen onStart={(selected) => { setArtists(selected); setScreen('playing') }} />
          )}
          {screen === 'playing' && (
            <GameScreen
              genre={genre}
              artists={artists}
              onChangeGenre={() => setScreen(activeMode === 'fan-cung' ? 'artist' : 'genre')}
            />
          )}
        </main>
      </div>
    </div>
  )
}
