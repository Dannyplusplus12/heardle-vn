import { useEffect } from 'react'
import { useGame } from './hooks/useGame'
import { getClipUrl } from './api'
import CoverArt from './components/CoverArt'
import ClipStageBar from './components/ClipStageBar'
import AudioPlayer from './components/AudioPlayer'
import GuessInput from './components/GuessInput'
import ActionBar from './components/ActionBar'
import ResultBanner from './components/ResultBanner'

export default function App() {
  const { track, stage, stageIndex, status, startNewGame, skip, guess, giveUp } = useGame()
  const gameOver = status === 'won' || status === 'lost'

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-orange-500 mb-1">Heardle VN</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Đoán bài hát Việt Nam</p>

        {status === 'loading' && (
          <div className="text-center text-gray-400">Đang tải bài hát...</div>
        )}

        {status === 'idle' && (
          <div className="text-center">
            <button
              onClick={startNewGame}
              className="px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium"
            >
              Bắt đầu chơi
            </button>
          </div>
        )}

        {(status === 'playing' || gameOver) && track && (
          <>
            <CoverArt src={track.cover_url} revealed={gameOver} />
            {gameOver && (
              <div className="text-center text-gray-300 text-sm mb-4 -mt-2">
                <div className="text-white font-semibold">{track.title}</div>
                <div>{track.artist}</div>
              </div>
            )}

            <ClipStageBar stageIndex={stageIndex} />

            <AudioPlayer src={getClipUrl(track.id)} limit={stage} />

            {!gameOver && (
              <>
                <GuessInput onGuess={guess} disabled={gameOver} />
                <ActionBar onSkip={skip} onGiveUp={giveUp} stage={stage} disabled={gameOver} />
              </>
            )}

            <ResultBanner status={status} track={track} onPlayAgain={startNewGame} />
          </>
        )}
      </div>
    </div>
  )
}
