import { useState } from 'react'
import GenreScreen from '../screens/GenreScreen'
import GameScreen from '../screens/GameScreen'
import AdBanner from '../components/AdBanner'

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
      <div className="flex flex-col items-center min-h-full p-5">
        <div className="flex-1 flex items-center justify-center w-full">
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
        <AdBanner slot="REPLACE_WITH_SLOT_ID" className="w-full max-w-xl mt-4" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-full p-5">
      <div className="flex-1 flex items-center justify-center w-full">
        <GenreScreen
          onStart={(g) => { setGenre(g); setStep('playing'); setPhaseIndex(0) }}
        />
      </div>
      <AdBanner slot="REPLACE_WITH_SLOT_ID" className="w-full max-w-xl mt-4" />
    </div>
  )
}
