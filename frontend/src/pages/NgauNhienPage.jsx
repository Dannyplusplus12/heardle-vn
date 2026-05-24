import { useState } from 'react'
import GenreScreen from '../screens/GenreScreen'
import GameScreen from '../screens/GameScreen'

export default function NgauNhienPage() {
  const [step, setStep] = useState('genre') // 'genre' | 'playing'
  const [genre, setGenre] = useState(null)

  if (step === 'playing') {
    return (
      <div className="flex items-center justify-center min-h-full p-5">
        <GameScreen
          genre={genre}
          onBack={() => { setStep('genre'); setGenre(null) }}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-full p-5">
      <GenreScreen
        onStart={(g) => { setGenre(g); setStep('playing') }}
      />
    </div>
  )
}
