import { useEffect, useRef, useState, useMemo } from 'react'
import { useRoom } from '../hooks/useRoom'
import { searchTracks } from '../api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function decodeJwtSub(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).sub
  } catch { return null }
}

// ── Synchronized Audio Player ─────────────────────────────────────────────────

function SyncAudioPlayer({ src, playTrigger, onLoaded, disabled }) {
  const audioRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const prevSrc = useRef(null)

  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src
      setLoaded(false)
      setPlaying(false)
      setCurrentTime(0)
      if (audioRef.current) audioRef.current.load()
    }
  }, [src])

  useEffect(() => {
    if (playTrigger > 0 && loaded && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }, [playTrigger, loaded])

  const toggle = () => {
    if (!loaded || !audioRef.current || disabled) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }

  const progress = Math.min((currentTime / 30) * 100, 100)

  return (
    <div className="mb-5">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onCanPlayThrough={() => { setLoaded(true); onLoaded?.() }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex justify-center mb-4">
        <button
          onClick={toggle}
          disabled={!loaded || disabled}
          className="w-20 h-20 border-2 flex items-center justify-center text-3xl font-black transition-all duration-75 select-none"
          style={
            !loaded
              ? { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#374151', cursor: 'not-allowed' }
              : playing
                ? { borderColor: '#FF006E', backgroundColor: '#FF006E', color: '#fff', boxShadow: '3px 3px 0 rgba(255,0,110,0.4)', transform: 'translate(-1px,-1px)', cursor: 'pointer' }
                : { borderColor: '#fff', backgroundColor: '#111', color: '#fff', cursor: 'pointer' }
          }
        >
          {!loaded
            ? <div className="w-6 h-6 border-2 border-t-transparent animate-spin" style={{ borderColor: '#FF006E', borderTopColor: 'transparent' }} />
            : playing ? '⏸' : '▶'
          }
        </button>
      </div>

      <div className="w-full h-4 bg-[#111] border-2 border-white/15 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 transition-all duration-100" style={{ width: `${progress}%`, backgroundColor: '#FF006E' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: loaded ? '#FF006E' : '#374151' }}>
          {loaded ? `${Math.floor(currentTime)}s` : '—'}
        </span>
        <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider">30s</span>
      </div>
    </div>
  )
}

// ── Guess Input for multiplayer ───────────────────────────────────────────────

function MultiGuessInput({ onGuess, onSkip, artistIds, playlistIds, disabled }) {
  const [query, setQuery] = useState('')
  const [display, setDisplay] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); setOpen(false); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchTracks(query, { artistIds, playlistIds })
        setResults(data)
        setOpen(data.length > 0)
      } catch { setResults([]) }
      setLoading(false)
    }, 280)
    return () => clearTimeout(t)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleSelect = (track) => {
    setSelected(track)
    setDisplay(`${track.title} · ${track.artist}`)
    setQuery('')
    setOpen(false)
  }

  const handleSubmit = () => {
    if (!selected || disabled) return
    onGuess(selected.id)
    setSelected(null)
    setDisplay('')
    setQuery('')
  }

  if (disabled) return (
    <div className="text-center py-6 border-2 border-white/8 bg-[#0f0f0f]">
      <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Đã đoán xong</p>
    </div>
  )

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative mb-2">
        <input
          type="text"
          value={display}
          onChange={e => { setDisplay(e.target.value); setQuery(e.target.value); setSelected(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Tìm bài hát hoặc nghệ sĩ..."
          className="w-full px-4 py-3 border-2 bg-[#0f0f0f] text-white font-medium text-sm placeholder-white/20
            focus:outline-none transition-all duration-75"
          style={{ borderColor: selected ? '#FF006E' : 'rgba(255,255,255,0.2)' }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderColor: '#FF006E', borderTopColor: 'transparent' }} />
          </div>
        )}
        {open && (
          <ul className="absolute z-30 w-full top-full border-x-2 border-b-2 border-white/20 bg-[#0d0d0d] max-h-44 overflow-y-auto shadow-[4px_4px_0_#FF006E]">
            {results.map(r => (
              <li key={r.id} onMouseDown={() => handleSelect(r)}
                className="px-4 py-2.5 border-b border-white/8 last:border-0 cursor-pointer hover:bg-[#FF006E]/10 transition-colors">
                <span className="text-white text-sm font-semibold">{r.title}</span>
                <span className="text-gray-500 text-sm"> · {r.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!selected}
          className="flex-1 py-3 border-2 font-black text-sm uppercase tracking-widest transition-all duration-75
            bg-[#FF006E] border-white text-white
            hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
            active:translate-x-0 active:translate-y-0 active:shadow-none
            disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none">
          Đoán
        </button>
        <button onClick={onSkip}
          className="px-4 py-3 border-2 border-white/20 text-gray-400 font-black text-xs uppercase tracking-widest
            hover:border-white/50 hover:text-white transition-colors">
          Bỏ qua
        </button>
      </div>
    </div>
  )
}

// ── Live Leaderboard ──────────────────────────────────────────────────────────

function LiveLeaderboard({ players, myId, notifications }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="w-56 shrink-0 border-l-2 border-white/8 bg-[#070707] flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b-2 border-[#FF006E]/30 bg-[#FF006E]/5">
        <span className="text-[9px] font-black tracking-[0.35em] uppercase text-[#FF006E]">✦ BXH TRỰC TIẾP ✦</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {sorted.map((player, i) => {
          const isMe = player.id === myId
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
          return (
            <div
              key={player.id}
              className="px-3 py-2.5 border-b border-white/5 transition-all duration-200"
              style={{ backgroundColor: isMe ? 'rgba(255,0,110,0.06)' : 'transparent' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm shrink-0">{typeof medal === 'string' && medal.includes('.') ? '' : medal}</span>
                {typeof medal === 'string' && medal.includes('.') && (
                  <span className="text-[9px] font-black text-gray-600 shrink-0">{medal}</span>
                )}
                <span className={`text-[10px] font-black uppercase truncate flex-1 ${isMe ? 'text-[#FF006E]' : 'text-white'}`}>
                  {player.name}{isMe ? ' (bạn)' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between pl-5">
                <span className="text-[10px] font-black tabular-nums" style={{ color: '#FF006E' }}>
                  {player.score.toLocaleString()} pts
                </span>
                <span className="text-[8px] font-black uppercase">
                  {player.correct_this_round ? (
                    <span style={{ color: '#CCFF00' }}>✓</span>
                  ) : player.has_guessed ? (
                    <span className="text-gray-600">✗</span>
                  ) : player.is_ready ? (
                    <span className="text-gray-500">đang đoán</span>
                  ) : (
                    <span className="text-gray-700">loading...</span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Notification feed */}
      <div className="shrink-0 border-t border-white/5 px-3 py-2 flex flex-col gap-1 min-h-[60px]">
        {notifications.map(n => (
          <div key={n.id} className="text-[9px] font-black uppercase tracking-wide animate-pulse"
            style={{ color: n.color === 'lime' ? '#CCFF00' : n.color === 'cyan' ? '#00E5FF' : '#FF006E' }}>
            {n.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function LobbyView({ players, code, isHost, onStart, onLeave }) {
  const [copied, setCopied] = useState(false)
  const shareLink = `${window.location.origin}/doi-dau?join=${code}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#070707]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[9px] font-black tracking-[0.4em] uppercase mb-2" style={{ color: '#FF006E' }}>
            ✦ PHÒNG CHỜ ✦
          </div>
          <div className="text-6xl font-black uppercase tracking-tight"
            style={{ background: 'linear-gradient(135deg, #FF006E, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {code}
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Mã phòng</p>
        </div>

        {/* Share */}
        <div className="mb-6 flex gap-2">
          <div className="flex-1 border-2 border-white/10 bg-[#0f0f0f] px-3 py-2 text-[10px] text-gray-500 font-mono truncate">
            {shareLink}
          </div>
          <button onClick={copyLink}
            className="shrink-0 px-4 border-2 font-black text-xs uppercase tracking-widest transition-all duration-75"
            style={{
              borderColor: copied ? '#CCFF00' : 'rgba(255,255,255,0.2)',
              color: copied ? '#CCFF00' : '#9ca3af',
              boxShadow: copied ? '3px 3px 0 #CCFF00' : 'none',
            }}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Player list */}
        <div className="border-2 border-white/10 mb-6">
          <div className="px-4 py-2 border-b border-white/8 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Người chơi</span>
            <span className="text-[9px] font-black tabular-nums" style={{ color: '#FF006E' }}>{players.length}</span>
          </div>
          <div className="divide-y divide-white/5">
            {players.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2" style={{ backgroundColor: '#CCFF00' }} />
                  <span className="text-sm font-black uppercase text-white">{p.name}</span>
                  {p.is_guest && <span className="text-[8px] font-black text-gray-600 border border-white/10 px-1">GUEST</span>}
                </div>
                {/* HOST tag */}
                <span className="text-[8px] font-black uppercase text-[#FF006E] border border-[#FF006E]/30 px-1.5 py-0.5">
                  {isHost && p.id === players.find(x => x)?.id ? 'HOST' : ''}
                </span>
              </div>
            ))}
            {players.length === 0 && (
              <div className="px-4 py-4 text-gray-700 text-xs italic">Đang kết nối...</div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={players.length === 0}
              className="flex-1 py-4 font-black text-sm uppercase tracking-widest border-2 transition-all duration-75
                bg-[#FF006E] border-white text-white
                hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#fff]
                active:translate-x-0 active:translate-y-0 active:shadow-none
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none">
              ▶ Bắt đầu
            </button>
          ) : (
            <div className="flex-1 py-4 font-black text-xs uppercase tracking-widest border-2 border-white/10 text-gray-500 text-center">
              Chờ host bắt đầu...
            </div>
          )}
          <button onClick={onLeave}
            className="px-5 py-4 border-2 border-white/15 text-gray-500 font-black text-xs uppercase tracking-widest
              hover:border-red-500/50 hover:text-red-400 transition-colors">
            Rời
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Countdown overlay ─────────────────────────────────────────────────────────

function CountdownOverlay({ seconds }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ backgroundColor: 'rgba(7,7,7,0.92)' }}>
      <div className="text-center">
        <div className="text-[9px] font-black tracking-[0.4em] uppercase mb-4" style={{ color: '#FF006E' }}>
          ✦ CHUẨN BỊ ✦
        </div>
        <div className="font-black leading-none"
          style={{ fontSize: '8rem', background: 'linear-gradient(135deg, #FF006E, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {seconds}
        </div>
      </div>
    </div>
  )
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingView({ players }) {
  const conn = players.filter(p => p.id)
  const readyCount = conn.filter(p => p.is_ready).length

  return (
    <div className="flex-1 flex items-center justify-center bg-[#070707]">
      <div className="text-center">
        <div className="text-[9px] font-black tracking-[0.4em] uppercase mb-6" style={{ color: '#FF006E' }}>✦ ĐANG TẢI BÀI HÁT ✦</div>
        <div className="w-12 h-12 border-2 border-t-transparent animate-spin mx-auto mb-6"
          style={{ borderColor: '#FF006E', borderTopColor: 'transparent' }} />
        <p className="text-3xl font-black tabular-nums" style={{ color: '#00E5FF' }}>{readyCount}/{conn.length}</p>
        <p className="text-xs font-black uppercase tracking-widest text-gray-600 mt-2">Người chơi sẵn sàng</p>
        <div className="flex gap-2 mt-5 justify-center">
          {conn.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 transition-colors duration-300"
                style={{ backgroundColor: p.is_ready ? '#CCFF00' : 'rgba(255,255,255,0.1)' }} />
              <span className="text-[8px] text-gray-600 uppercase font-black max-w-[50px] truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Round End Popup ───────────────────────────────────────────────────────────

function RoundEndPopup({ result, isHost, onNext, onLeave, round, totalRounds }) {
  const { track, scores } = result
  const isLastRound = round >= totalRounds

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(7,7,7,0.95)' }}>
      <div className="w-full max-w-sm border-2 border-white/15 bg-[#0f0f0f]"
        style={{ boxShadow: '6px 6px 0 #FF006E' }}>

        <div className="px-5 py-4 border-b border-white/8">
          <div className="text-[8px] font-black tracking-[0.35em] uppercase text-gray-500 mb-1">
            Vòng {round} / {totalRounds} {totalRounds > 9 ? '— BONUS!' : ''}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#FF006E' }}>✦ KẾT QUẢ ✦</div>
          <p className="text-white font-black text-lg uppercase tracking-tight truncate">{track?.title}</p>
          <p className="text-gray-400 text-sm">{track?.artist}</p>
        </div>

        <div className="divide-y divide-white/5">
          {scores.map((s, i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`
            return (
              <div key={s.player_id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{typeof medal === 'string' && medal.includes('.') ? '' : medal}</span>
                  {typeof medal === 'string' && medal.includes('.') && (
                    <span className="text-[9px] font-black text-gray-600">{medal}</span>
                  )}
                  <span className={`text-sm font-black uppercase ${s.correct ? 'text-white' : 'text-gray-500'}`}>{s.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black tabular-nums text-white">{s.score.toLocaleString()}</div>
                  {s.round_pts > 0 && (
                    <div className="text-[9px] font-black" style={{ color: '#CCFF00' }}>+{s.round_pts}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-white/8 flex gap-2">
          {isHost ? (
            <button onClick={onNext}
              className="flex-1 py-3 font-black text-xs uppercase tracking-widest border-2 transition-all duration-75
                bg-[#FF006E] border-white text-white
                hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
                active:translate-x-0 active:translate-y-0 active:shadow-none">
              {isLastRound ? '✦ Kết thúc' : 'Vòng tiếp →'}
            </button>
          ) : (
            <div className="flex-1 py-3 border-2 border-white/10 text-gray-500 text-xs font-black uppercase tracking-widest text-center">
              Chờ host...
            </div>
          )}
          <button onClick={onLeave}
            className="px-4 py-3 border-2 border-white/15 text-gray-600 text-xs font-black uppercase tracking-widest
              hover:border-red-500/40 hover:text-red-400 transition-colors">
            Rời
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Game End Popup ────────────────────────────────────────────────────────────

function GameEndPopup({ result, myId, onLeave }) {
  const { final_scores, winner } = result

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(7,7,7,0.98)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[9px] font-black tracking-[0.4em] uppercase mb-3" style={{ color: '#FF006E' }}>✦ KẾT THÚC TRẬN ✦</div>
          {winner && (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <div className="text-2xl font-black uppercase tracking-tight text-white">{winner.name}</div>
              <div className="text-[9px] font-black tracking-widest uppercase mt-1" style={{ color: '#CCFF00' }}>
                {winner.score.toLocaleString()} ĐIỂM
              </div>
            </>
          )}
        </div>

        <div className="border-2 border-white/10 mb-6" style={{ boxShadow: '5px 5px 0 #FF006E' }}>
          <div className="px-4 py-2 border-b border-white/8">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Bảng xếp hạng cuối</span>
          </div>
          <div className="divide-y divide-white/5">
            {final_scores.map((s, i) => {
              const medal = ['🥇', '🥈', '🥉'][i]
              const isMe = s.player_id === myId
              return (
                <div key={s.player_id} className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: isMe ? 'rgba(255,0,110,0.05)' : 'transparent' }}>
                  <div className="flex items-center gap-2">
                    {medal ? <span>{medal}</span> : <span className="text-gray-600 text-xs font-black">{i + 1}.</span>}
                    <span className={`font-black uppercase text-sm ${isMe ? 'text-[#FF006E]' : 'text-white'}`}>{s.name}</span>
                    {isMe && <span className="text-[8px] text-gray-600 font-black">(bạn)</span>}
                  </div>
                  <span className="font-black tabular-nums text-sm"
                    style={{ color: i === 0 ? '#CCFF00' : '#ffffff' }}>
                    {s.score.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={onLeave}
          className="w-full py-4 font-black text-sm uppercase tracking-widest border-2 transition-all duration-75
            bg-[#FF006E] border-white text-white
            hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#fff]
            active:translate-x-0 active:translate-y-0 active:shadow-none">
          Chơi lại
        </button>
      </div>
    </div>
  )
}

// ── Round timer bar ───────────────────────────────────────────────────────────

function RoundTimer({ playing }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (playing) {
      startRef.current = Date.now()
      const tick = () => {
        setElapsed((Date.now() - startRef.current) / 1000)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing])

  const pct = Math.min((elapsed / 60) * 100, 100)
  const remaining = Math.max(0, 60 - Math.floor(elapsed))
  const urgent = remaining <= 10

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Thời gian</span>
        <span className="text-[11px] font-black tabular-nums" style={{ color: urgent ? '#FF006E' : '#00E5FF' }}>
          {remaining}s
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/8 overflow-hidden">
        <div className="h-full transition-none" style={{
          width: `${100 - pct}%`,
          backgroundColor: urgent ? '#FF006E' : '#00E5FF',
        }} />
      </div>
    </div>
  )
}

// ── Main Room Screen ──────────────────────────────────────────────────────────

export default function RoomScreen({ code, token, onLeave }) {
  const room = useRoom()
  const myId = useMemo(() => decodeJwtSub(token), [token])
  const clipUrl = room.trackId ? `${API_BASE}/api/game/clip/${room.trackId}` : null
  const isHost = room.hostId === myId
  const myPlayer = room.players.find(p => p.id === myId)
  const hasGuessed = myPlayer?.has_guessed || false
  const isGamePhase = ['loading', 'countdown', 'playing'].includes(room.phase)

  useEffect(() => {
    const cleanup = room.connect(code, token)
    return () => { cleanup?.(); room.disconnect() }
  }, [code, token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full bg-[#070707] relative">

      {/* ── Lobby ── */}
      {room.phase === 'lobby' && (
        <LobbyView
          players={room.players}
          code={room.code || code}
          isHost={isHost}
          onStart={room.startGame}
          onLeave={onLeave}
        />
      )}

      {/* ── Disconnected ── */}
      {room.phase === 'disconnected' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: '#FF006E', borderTopColor: 'transparent' }} />
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Đang kết nối...</p>
          </div>
        </div>
      )}

      {/* ── Loading (audio prep) — audio preloads in background ── */}
      {room.phase === 'loading' && (
        <>
          <LoadingView players={room.players} />
          {clipUrl && (
            <audio key={clipUrl} src={clipUrl} preload="auto"
              style={{ display: 'none' }} onCanPlayThrough={room.sendReady} />
          )}
        </>
      )}

      {/* ── Game (countdown + playing) ── */}
      {isGamePhase && room.phase !== 'loading' && (
        <>
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Countdown overlay */}
            {room.countdown !== null && <CountdownOverlay seconds={room.countdown} />}

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: '#FF006E' }}>⚔ ĐỐI ĐẦU</span>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Vòng {room.round}/{room.totalRounds}
                </span>
              </div>
              <button onClick={onLeave}
                className="text-[9px] font-black uppercase text-gray-600 hover:text-red-400 transition-colors tracking-widest">
                Rời
              </button>
            </div>

            {/* Game area */}
            <div className="flex-1 flex items-center justify-center p-5 overflow-y-auto">
              <div className="w-full max-w-xs">
                <RoundTimer playing={room.phase === 'playing' && room.countdown === null} />

                {clipUrl && (
                  <SyncAudioPlayer
                    src={clipUrl}
                    playTrigger={room.playTrigger}
                    onLoaded={room.sendReady}
                    disabled={false}
                  />
                )}

                {room.phase === 'playing' && (
                  <MultiGuessInput
                    onGuess={room.sendGuess}
                    onSkip={room.sendSkip}
                    artistIds={room.artistIds}
                    playlistIds={room.playlistIds}
                    disabled={hasGuessed}
                  />
                )}

                {room.phase === 'countdown' && (
                  <div className="border-2 border-white/8 py-4 text-center">
                    <p className="text-gray-600 text-xs font-black uppercase tracking-widest">Chuẩn bị đoán...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar: live leaderboard */}
          <LiveLeaderboard players={room.players} myId={myId} notifications={room.notifications} />
        </>
      )}

      {/* ── Round End Popup ── */}
      {room.phase === 'round_end' && room.roundResult && (
        <RoundEndPopup
          result={room.roundResult}
          isHost={isHost}
          onNext={room.nextRound}
          onLeave={onLeave}
          round={room.round}
          totalRounds={room.totalRounds}
        />
      )}

      {/* ── Game End Popup ── */}
      {room.phase === 'game_end' && room.gameResult && (
        <GameEndPopup result={room.gameResult} myId={myId} onLeave={onLeave} />
      )}

      {/* ── Error toast ── */}
      {room.error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#FF006E] bg-[#0f0f0f] text-sm font-black"
          style={{ boxShadow: '3px 3px 0 #FF006E' }}>
          <span className="text-white">{room.error}</span>
          <button onClick={room.clearError} className="ml-3 text-[#FF006E] hover:text-white">✕</button>
        </div>
      )}
    </div>
  )
}
