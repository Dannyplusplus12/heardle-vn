import { useState, useCallback } from 'react'
import { fetchNewGame } from '../api'

const STAGES = [1, 5, 15, 30]

export function useGame() {
  const [track, setTrack] = useState(null)
  const [stageIndex, setStageIndex] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [status, setStatus] = useState('idle')

  const startNewGame = useCallback(async (genre) => {
    setStatus('loading')
    setTrack(null)
    setAttempts([])
    setStageIndex(0)
    try {
      const data = await fetchNewGame(genre)
      setTrack(data)
      setStatus('playing')
    } catch {
      setStatus('idle')
    }
  }, [])

  const skip = useCallback(() => {
    setAttempts(prev => {
      const next = [...prev, { type: 'skip', value: null }]
      if (stageIndex >= STAGES.length - 1) {
        setStatus('lost')
      } else {
        setStageIndex(i => i + 1)
      }
      return next
    })
  }, [stageIndex])

  const guess = useCallback((selectedTrack) => {
    const correct = selectedTrack.id === track.id
    setAttempts(prev => {
      const next = [...prev, {
        type: correct ? 'correct' : 'wrong',
        value: selectedTrack.title,
      }]
      if (correct) {
        setStatus('won')
      } else if (stageIndex >= STAGES.length - 1) {
        setStatus('lost')
      } else {
        setStageIndex(i => i + 1)
      }
      return next
    })
  }, [track, stageIndex])

  const giveUp = useCallback(() => {
    setAttempts(prev => [...prev, { type: 'giveup', value: null }])
    setStatus('lost')
  }, [])

  return {
    track,
    stage: STAGES[stageIndex],
    stageIndex,
    attempts,
    status,
    startNewGame,
    skip,
    guess,
    giveUp,
  }
}
