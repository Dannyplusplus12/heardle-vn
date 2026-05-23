import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import GenreScreen from './screens/GenreScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [genre, setGenre] = useState(null)

  if (screen === 'home') {
    return (
      <HomeScreen
        onSelectMode={(mode) => {
          if (mode === 'nguyen-nhien') setScreen('genre')
        }}
      />
    )
  }

  if (screen === 'genre') {
    return (
      <GenreScreen
        onBack={() => setScreen('home')}
        onStart={(g) => { setGenre(g); setScreen('game') }}
      />
    )
  }

  return (
    <GameScreen
      genre={genre}
      onBack={() => setScreen('genre')}
    />
  )
}
