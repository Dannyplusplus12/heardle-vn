import { useState } from 'react'
import Sidebar from './components/Sidebar'
import GenreScreen from './screens/GenreScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [activeMode, setActiveMode] = useState('nguyen-nhien')
  const [screen, setScreen] = useState('genre')
  const [genre, setGenre] = useState(null)

  const handleModeSelect = (mode) => {
    setActiveMode(mode)
    setScreen('genre')
    setGenre(null)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeMode={activeMode} onSelectMode={handleModeSelect} />
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        {screen === 'genre' && (
          <GenreScreen onStart={(g) => { setGenre(g); setScreen('playing') }} />
        )}
        {screen === 'playing' && (
          <GameScreen
            genre={genre}
            onChangeGenre={() => setScreen('genre')}
          />
        )}
      </main>
    </div>
  )
}
