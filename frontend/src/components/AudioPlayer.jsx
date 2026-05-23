import { useRef, useState, useEffect } from 'react'

export default function AudioPlayer({ src, limit }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  // New track — reload audio
  useEffect(() => {
    setPlaying(false)
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [src])

  // Stage changed — reset position so next play starts from 0
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
        onEnded={() => { setPlaying(false) }}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
      />
      <button
        onClick={toggle}
        className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center text-2xl transition-colors shadow-lg"
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <span className="text-gray-400 text-sm">{playing ? 'Đang phát...' : 'Nhấn để nghe'}</span>
    </div>
  )
}
