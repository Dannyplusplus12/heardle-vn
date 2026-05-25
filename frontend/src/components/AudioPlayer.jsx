import { useRef, useState, useEffect, useCallback } from 'react'

const TOTAL = 30

export default function AudioPlayer({ src, limit, phaseColor = '#f97316' }) {
  const audioRef = useRef(null)
  const barRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [dragging, setDragging] = useState(false)
  const maxTime = limit ?? TOTAL

  useEffect(() => {
    setPlaying(false)
    setLoaded(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.load()
  }, [src])

  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [limit])

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
    if (limit !== null && limit !== undefined && audio.currentTime >= limit) {
      audio.pause()
      audio.currentTime = 0
      setCurrentTime(0)
      setPlaying(false)
    }
  }

  const seekTo = useCallback((clientX) => {
    if (!loaded || !audioRef.current || !barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const target = fraction * TOTAL
    if (target <= maxTime) {
      audioRef.current.currentTime = target
      setCurrentTime(target)
    }
  }, [loaded, maxTime])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => seekTo(e.clientX ?? e.touches?.[0]?.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, seekTo])

  const toggle = () => {
    if (!audioRef.current || !loaded) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const availablePct = (maxTime / TOTAL) * 100
  const playedPct = (Math.min(currentTime, maxTime) / TOTAL) * 100

  const fmt = (s) => `${Math.floor(s)}s`

  return (
    <div className="mb-6">
      <audio
        ref={audioRef}
        src={src}
        onCanPlayThrough={() => setLoaded(true)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
      />

      {/* Play button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggle}
          disabled={!loaded}
          className="w-20 h-20 border-2 flex items-center justify-center text-3xl font-black transition-all duration-75 select-none"
          style={
            !loaded
              ? { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#4b5563', cursor: 'not-allowed' }
              : playing
                ? { borderColor: phaseColor, backgroundColor: phaseColor, color: '#fff', boxShadow: `3px 3px 0 ${phaseColor}55`, transform: 'translate(-1px,-1px)', cursor: 'pointer' }
                : { borderColor: '#fff', backgroundColor: '#1a1a1a', color: '#fff', cursor: 'pointer' }
          }
          aria-label={!loaded ? 'Đang tải' : playing ? 'Dừng' : 'Phát'}
        >
          {!loaded
            ? <div className="w-6 h-6 border-2 border-t-transparent animate-spin" style={{ borderColor: phaseColor, borderTopColor: 'transparent' }} />
            : playing ? '⏸' : '▶'
          }
        </button>
      </div>

      {/* Timeline */}
      <div
        ref={barRef}
        className="w-full h-5 bg-[#1a1a1a] border-2 border-white/20 cursor-pointer relative select-none"
        onMouseDown={(e) => { setDragging(true); seekTo(e.clientX) }}
        onTouchStart={(e) => { setDragging(true); seekTo(e.touches[0].clientX) }}
      >
        {/* Available range */}
        <div
          className="absolute inset-y-0 left-0 border-r-2"
          style={{
            width: `${availablePct}%`,
            backgroundColor: `${phaseColor}18`,
            borderRightColor: `${phaseColor}60`,
          }}
        />
        {/* Played */}
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${playedPct}%`, backgroundColor: phaseColor }}
        />
        {/* Playhead */}
        {loaded && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-full bg-white"
            style={{ left: `calc(${playedPct}% - 1px)` }}
          />
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: loaded ? phaseColor : '#374151' }}>
          {loaded ? fmt(currentTime) : '—'}
        </span>
        <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider">
          {!loaded ? 'Loading...' : limit === null ? 'Full song' : fmt(maxTime)}
        </span>
      </div>
    </div>
  )
}
