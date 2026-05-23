import { useState } from 'react'

const GENRES = [
  { id: 'pop',    label: 'POP',          emoji: '🎤', bg: 'bg-pink-500',   border: 'border-pink-400',   shadow: 'shadow-[4px_4px_0_#f472b6]' },
  { id: 'indie',  label: 'INDIE',        emoji: '🎸', bg: 'bg-violet-500', border: 'border-violet-400', shadow: 'shadow-[4px_4px_0_#a78bfa]' },
  { id: 'hiphop', label: 'HIP-HOP\n& RAP', emoji: '🎧', bg: 'bg-amber-400',  border: 'border-amber-300',  shadow: 'shadow-[4px_4px_0_#fcd34d]' },
  { id: 'rock',   label: 'ROCK',         emoji: '🤘', bg: 'bg-red-500',    border: 'border-red-400',    shadow: 'shadow-[4px_4px_0_#f87171]' },
]

export default function GenreScreen({ onStart }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="w-full max-w-xs">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-1">
          Heardle<span className="text-orange-500"> VN</span>
        </h1>
        <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
          Chọn thể loại
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {GENRES.map((genre) => {
          const isSelected = selected === genre.id
          return (
            <button
              key={genre.id}
              onClick={() => setSelected(genre.id)}
              className={`
                p-5 flex flex-col items-center gap-3 border-2 font-black
                transition-all duration-75 cursor-pointer select-none
                ${isSelected
                  ? `${genre.bg} ${genre.border} ${genre.shadow} -translate-x-[2px] -translate-y-[2px] text-white`
                  : 'bg-[#1a1a1a] border-white/20 text-gray-300 hover:border-white/50 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_rgba(255,255,255,0.2)]'
                }
              `}
            >
              <span className="text-4xl">{genre.emoji}</span>
              <span className="text-xs uppercase tracking-wider text-center leading-tight whitespace-pre-line">
                {genre.label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        className="w-full py-4 font-black text-sm uppercase tracking-widest border-2 transition-all duration-75
          bg-orange-500 border-white text-white
          hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
          active:translate-x-0 active:translate-y-0 active:shadow-none
          disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        Bắt đầu →
      </button>
    </div>
  )
}
