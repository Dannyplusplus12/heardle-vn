import { useEffect } from 'react'
import { useGame } from '../hooks/useGame'
import { getClipUrl } from '../api'
import AudioPlayer from '../components/AudioPlayer'
import ClipStageBar from '../components/ClipStageBar'
import GuessInput from '../components/GuessInput'
import ActionBar from '../components/ActionBar'
import ResultBanner from '../components/ResultBanner'
import CoverArt from '../components/CoverArt'

const GENRE_LABELS = {
  pop: 'Pop',
  indie: 'Indie',
  hiphop: 'Hip-hop & Rap',
  rock: 'Rock',
}

export default function GameScreen({ genre, onBack }) {
  const { track, stage, stageIndex, status, startNewGame, skip, guess, giveUp } = useGame()
  const gameOver = status === 'won' || status === 'lost'

  useEffect(() => {
    startNewGame(genre)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            ←
          </button>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/8 border border-white/10 text-gray-300">
            {GENRE_LABELS[genre] || 'Ngẫu nhiên'}
          </span>
          <div className="w-9" />
        </header>

        {status === 'loading' && (
          <div className="text-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Đang tải bài hát...</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm mb-4">Không thể tải bài hát</p>
            <button
              onClick={() => startNewGame(genre)}
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-medium transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {(status === 'playing' || gameOver) && track && (
          <>
            <CoverArt src={track.cover_url} revealed={gameOver} />

            {gameOver && (
              <div className="text-center mb-6 -mt-2">
                <div className="font-bold text-white text-base">{track.title}</div>
                <div className="text-gray-400 text-sm">{track.artist}</div>
              </div>
            )}

            <ClipStageBar stageIndex={stageIndex} />

            <AudioPlayer src={getClipUrl(track.id)} limit={stage} />

            {!gameOver && (
              <>
                <GuessInput onGuess={guess} />
                <ActionBar onSkip={skip} onGiveUp={giveUp} stage={stage} />
              </>
            )}

            <ResultBanner
              status={status}
              track={track}
              onPlayAgain={() => startNewGame(genre)}
            />
          </>
        )}
      </div>
    </div>
  )
}
