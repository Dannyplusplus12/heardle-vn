import { useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { getClipUrl } from '../api'
import AudioPlayer from '../components/AudioPlayer'
import GuessInput from '../components/GuessInput'
import ActionBar from '../components/ActionBar'
import ResultBanner from '../components/ResultBanner'
import CoverArt from '../components/CoverArt'
import WrongPopup from '../components/WrongPopup'

const PHASE_COLORS = {
  easy:   { main: '#22c55e', dim: 'rgba(34,197,94,0.35)',   labelCls: 'text-green-400',  borderCls: 'border-green-500/40' },
  medium: { main: '#eab308', dim: 'rgba(234,179,8,0.35)',   labelCls: 'text-yellow-400', borderCls: 'border-yellow-400/40' },
  hard:   { main: '#ef4444', dim: 'rgba(239,68,68,0.35)',   labelCls: 'text-red-400',    borderCls: 'border-red-500/40' },
}

const GENRE_LABELS = {
  pop: 'POP', hiphop: 'HIP-HOP & RAP', all: 'TẤT CẢ',
}

const ALL_PHASES = ['easy', 'medium', 'hard']

export default function GameScreen({
  genre,
  phase = 'easy',
  phaseIndex = 0,
  isLastPhase = true,
  artists = [],
  artistIds = [],
  playlistIds = [],
  onBack,
  onPhaseComplete,
}) {
  const { track, stage, stageIndex, attempts, status, startNewGame, skip, guess, giveUp } = useGame()
  const gameOver = status === 'won' || status === 'lost'
  const [wrongPopup, setWrongPopup] = useState(null)
  const prevLen = useRef(0)

  const isFanMode = artistIds.length > 0 || playlistIds.length > 0 || artists.length > 0
  const pc = PHASE_COLORS[phase] || PHASE_COLORS.easy

  const gameOptions = (artistIds.length > 0 || playlistIds.length > 0)
    ? { artistIds, playlistIds }
    : isFanMode
      ? { artists }
      : { genre, difficulty: phase }

  const handleResult = onPhaseComplete ?? (() => startNewGame(gameOptions))

  useEffect(() => { startNewGame(gameOptions) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (attempts.length > prevLen.current) {
      const last = attempts[attempts.length - 1]
      if (last?.type === 'wrong') {
        setWrongPopup(last.value)
      }
      prevLen.current = attempts.length
    }
  }, [attempts])

  return (
    <div className="w-full max-w-xs">

      {wrongPopup !== null && (
        <WrongPopup
          wrongTrack={wrongPopup}
          phase={phase}
          onDismiss={() => setWrongPopup(null)}
        />
      )}

      <header className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="text-lg font-bold text-gray-600 hover:text-gray-300 transition-colors w-8 text-left"
          aria-label="Quay lại"
        >
          ←
        </button>
        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 border-2 ${pc.borderCls} ${pc.labelCls}`}>
          {isFanMode ? '⭐ FAN CỨNG' : (GENRE_LABELS[genre] || 'NGẪU NHIÊN')}
        </span>
        <div className="w-20" />
      </header>

      {/* Phase strip — 3 colored segments, only in genre mode */}
      {!isFanMode && (
        <div className="flex gap-1 mb-5">
          {ALL_PHASES.map((p, i) => (
            <div
              key={p}
              className="h-[3px] flex-1 transition-all duration-500"
              style={{
                backgroundColor: i <= phaseIndex
                  ? PHASE_COLORS[p].main
                  : 'rgba(255,255,255,0.07)',
                opacity: i === phaseIndex ? 1 : i < phaseIndex ? 0.55 : 1,
              }}
            />
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="text-center py-16">
          <div
            className="w-10 h-10 border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: pc.main, borderTopColor: 'transparent' }}
          />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Đang tải...</p>
        </div>
      )}

      {status === 'idle' && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-4">Không thể tải bài hát</p>
          <button
            onClick={() => startNewGame(gameOptions)}
            className="px-6 py-3 border-2 border-white font-black text-sm uppercase tracking-wider
              hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff] transition-all duration-75"
          >
            Thử lại
          </button>
        </div>
      )}

      {(status === 'playing' || gameOver) && track && (
        <>
          <CoverArt src={track.cover_url} revealed={gameOver} />

          {gameOver && (
            <div className="text-center mb-5 -mt-2">
              <a
                href={track.permalink_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-white text-lg uppercase tracking-tight hover:text-orange-400 transition-colors inline-flex items-center gap-1"
              >
                {track.title} <span className="text-base">↗</span>
              </a>
              <div className="text-gray-400 text-sm font-medium">{track.artist}</div>
            </div>
          )}

          <AudioPlayer
            src={getClipUrl(track.id, gameOver)}
            limit={gameOver ? null : stage}
            phaseColor={isFanMode ? '#f97316' : pc.main}
          />

          {/* Attempt dots — visual only */}
          {attempts.length > 0 && !gameOver && (
            <div className="flex gap-1.5 mb-4">
              {attempts.map((a, i) => (
                <div
                  key={i}
                  className="w-3 h-3 border-2 transition-all duration-200"
                  style={
                    a.type === 'wrong'
                      ? { backgroundColor: pc.main, borderColor: pc.main }
                      : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.18)' }
                  }
                />
              ))}
            </div>
          )}

          {!gameOver && (
            <>
              <GuessInput
                onGuess={guess}
                artists={artists}
                artistIds={artistIds}
                playlistIds={playlistIds}
              />
              <ActionBar onSkip={skip} onGiveUp={giveUp} stage={stage} />
            </>
          )}

          <ResultBanner
            status={status}
            track={track}
            isLastPhase={isLastPhase}
            onPlayAgain={handleResult}
          />
        </>
      )}
    </div>
  )
}
