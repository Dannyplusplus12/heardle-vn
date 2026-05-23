import { useState } from 'react'

const GENRES = [
  { id: 'pop',    label: 'Pop',          emoji: '🎤', gradient: 'from-pink-500 to-rose-600',   ring: 'ring-pink-500',   glow: 'shadow-pink-500/40' },
  { id: 'indie',  label: 'Indie',        emoji: '🎸', gradient: 'from-violet-500 to-purple-600', ring: 'ring-violet-500', glow: 'shadow-violet-500/40' },
  { id: 'hiphop', label: 'Hip-hop & Rap',emoji: '🎧', gradient: 'from-amber-400 to-yellow-600', ring: 'ring-amber-400',  glow: 'shadow-amber-400/40' },
  { id: 'rock',   label: 'Rock',         emoji: '🤘', gradient: 'from-red-500 to-rose-700',    ring: 'ring-red-500',    glow: 'shadow-red-500/40' },
]

export default function GenreScreen({ onStart }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="w-full max-w-xs">
      <div className="mb-7">
        <h1 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-1">
          Heardle VN
        </h1>
        <p className="text-gray-500 text-sm">Chọn thể loại để bắt đầu</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {GENRES.map((genre) => {
          const isSelected = selected === genre.id
          return (
            <button
              key={genre.id}
              onClick={() => setSelected(genre.id)}
              className={`
                p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-200
                ${isSelected
                  ? `bg-gradient-to-br ${genre.gradient} shadow-xl ${genre.glow} ring-2 ${genre.ring} ring-offset-2 ring-offset-[#09090f] scale-[1.02]`
                  : 'bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20'
                }
              `}
            >
              <span className="text-4xl">{genre.emoji}</span>
              <span className="font-semibold text-white text-sm text-center leading-tight">
                {genre.label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-200
          bg-gradient-to-r from-orange-500 to-pink-500
          hover:from-orange-400 hover:to-pink-400
          hover:shadow-xl hover:shadow-orange-500/30
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
      >
        Bắt đầu chơi
      </button>
    </div>
  )
}
