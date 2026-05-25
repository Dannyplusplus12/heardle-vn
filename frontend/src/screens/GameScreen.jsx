import { useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { getClipUrl } from '../api'
import AudioPlayer from '../components/AudioPlayer'
import ClipStageBar from '../components/ClipStageBar'
import GuessInput from '../components/GuessInput'
import ActionBar from '../components/ActionBar'
import ResultBanner from '../components/ResultBanner'
import CoverArt from '../components/CoverArt'

const GENRE_LABELS = {
  pop: 'POP', hiphop: 'HIP-HOP & RAP', all: 'TẤT CẢ',
}

export default function GameScreen({
  genre,
  artists = [],
  artistIds = [],
  playlistIds = [],
  onBack,
}) {
  const { track, stage, stageIndex, attempts, status, startNewGame, skip, guess, giveUp } = useGame()
  const gameOver = status === 'won' || status === 'lost'
  const [shake, setShake] = useState(false)
  const prevLen = useRef(0)

  const isFanMode = artistIds.length > 0 || playlistIds.length > 0 || artists.length > 0
  const gameOptions = (artistIds.length > 0 || playlistIds.length > 0)
    ? { artistIds, playlistIds }
    : isFanMode
      ? { artists }
      : { genre }

  useEffect(() => { startNewGame(gameOptions) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (attempts.length > prevLen.current) {
      const last = attempts[attempts.length - 1]
      if (last?.type === 'wrong') {
        setShake(true)
        setTimeout(() => setShake(false), 400)
      }
      prevLen.current = attempts.length
    }
  }, [attempts])

  return (
    <div className="w-full max-w-xs">
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-300 transition-colors"
        >
          ← {isFanMode ? 'Đổi nguồn' : 'Đổi thể loại'}
        </button>
        <span className="text-xs font-black uppercase tracking-widest px-3 py-1 border-2 border-orange-500/50 text-orange-400">
          {isFanMode ? '⭐ FAN CỨNG' : (GENRE_LABELS[genre] || 'NGẪU NHIÊN')}
        </span>
        <div className="w-20" />
      </header>

      {status === 'loading' && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
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
          <div className={shake ? 'shake' : ''}>
            <CoverArt src={track.cover_url} revealed={gameOver} />
          </div>

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

          <ClipStageBar stageIndex={stageIndex} />

          <AudioPlayer
            src={getClipUrl(track.id, gameOver)}
            limit={gameOver ? null : stage}
          />

          {attempts.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {attempts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 border-2 text-xs font-bold uppercase tracking-wide
                    ${a.type === 'wrong'
                      ? 'border-red-500/60 bg-red-500/10 text-red-400'
                      : 'border-white/10 bg-white/3 text-gray-600'
                    }`}
                >
                  <span>{a.type === 'wrong' ? '✗' : '→'}</span>
                  <span className="truncate">{a.value || 'Bỏ qua'}</span>
                </div>
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

          <ResultBanner status={status} track={track} onPlayAgain={() => startNewGame(gameOptions)} />
        </>
      )}
    </div>
  )
}
