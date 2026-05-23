import { useRef, useState, useEffect } from 'react'

export default function AudioPlayer({ src, limit }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [src])

  useEffect(() => {
    setPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [limit])

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio && audio.currentTime >= limit) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
    }
  }

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
      />
      <button
        onClick={toggle}
        className={`
          w-18 h-18 rounded-full flex items-center justify-center text-2xl transition-all duration-200 shadow-lg
          ${playing
            ? 'bg-orange-500 shadow-orange-500/40 scale-95'
            : 'bg-gradient-to-br from-orange-500 to-pink-500 hover:scale-105 shadow-orange-500/30'
          }
        `}
        style={{ width: '4.5rem', height: '4.5rem' }}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <span className="text-gray-500 text-xs">
        {playing ? `Đang phát · ${limit}s` : `Nhấn để nghe · ${limit}s`}
      </span>
    </div>
  )
}
