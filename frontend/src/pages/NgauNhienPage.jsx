import { useState } from 'react'
import GenreScreen from '../screens/GenreScreen'
import GameScreen from '../screens/GameScreen'

const PHASES = ['easy', 'medium', 'hard']

export default function NgauNhienPage() {
  const [step, setStep] = useState('genre')
  const [genre, setGenre] = useState(null)
  const [phaseIndex, setPhaseIndex] = useState(0)

  const handleBack = () => {
    setStep('genre')
    setGenre(null)
    setPhaseIndex(0)
  }

  const handlePhaseComplete = () => {
    if (phaseIndex < PHASES.length - 1) {
      setPhaseIndex(i => i + 1)
    } else {
      handleBack()
    }
  }

  if (step === 'playing') {
    return (
      <div className="flex items-center justify-center min-h-full p-5">
        <GameScreen
          key={phaseIndex}
          genre={genre}
          phase={PHASES[phaseIndex]}
          phaseIndex={phaseIndex}
          isLastPhase={phaseIndex === PHASES.length - 1}
          onPhaseComplete={handlePhaseComplete}
          onBack={handleBack}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-full p-5">
      <GenreScreen
        onStart={(g) => { setGenre(g); setStep('playing'); setPhaseIndex(0) }}
      />
    </div>
  )
}
