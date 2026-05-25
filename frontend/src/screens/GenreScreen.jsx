import { useState } from 'react'

const GENRES = [
  {
    id: 'pop',
    label: 'POP',
    sublabel: 'Nhạc Đại Chúng',
    emoji: '🎤',
    artists: ['Son Tùng MTP', 'AMEE', 'MONO', 'Wren Evans', 'Erik'],
    selectedBg: 'from-pink-600 via-rose-500 to-fuchsia-700',
    border: 'border-pink-400',
    accent: 'text-pink-200',
    shadowColor: '#f472b6',
    floats: ['🌸', '💖', '🌟', '✨'],
  },
  {
    id: 'hiphop',
    label: 'HIP-HOP & RAP',
    sublabel: 'Rap Việt',
    emoji: '🎧',
    artists: ['HIEUTHUHAI', 'tlinh', 'Đen Vâu', 'Binz', 'Obito'],
    selectedBg: 'from-amber-500 via-orange-500 to-yellow-500',
    border: 'border-amber-300',
    accent: 'text-amber-100',
    shadowColor: '#fcd34d',
    floats: ['🔥', '⚡', '💛', '🎤'],
  },
  {
    id: 'all',
    label: 'TẤT CẢ',
    sublabel: 'Mọi Thể Loại',
    emoji: '🎶',
    artists: ['50+ nghệ sĩ VN', 'Ngẫu nhiên hoàn toàn'],
    selectedBg: 'from-cyan-500 via-blue-600 to-violet-700',
    border: 'border-cyan-400',
    accent: 'text-cyan-100',
    shadowColor: '#22d3ee',
    floats: ['🎸', '🎹', '🥁', '🎺'],
  },
]

const FLOAT_POSITIONS = [
  { top: '12%', right: '10%', rotate: '-10deg', size: '2rem' },
  { top: '60%', right: '24%', rotate: '15deg',  size: '1.6rem' },
  { top: '28%', right: '38%', rotate: '-4deg',  size: '2.4rem' },
  { top: '72%', right: '8%',  rotate: '22deg',  size: '1.8rem' },
]

export default function GenreScreen({ onStart }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="w-full max-w-sm relative">

      {/* Ambient decorations behind title */}
      <div className="absolute -top-6 right-0 text-7xl opacity-[0.04] pointer-events-none select-none rotate-12">🎵</div>
      <div className="absolute top-16 -left-8 text-6xl opacity-[0.04] pointer-events-none select-none -rotate-15">🎸</div>

      {/* Header */}
      <div className="mb-9 text-center relative">
        <div className="text-6xl mb-3 leading-none">🎵</div>
        <h1 className="text-[3.2rem] font-black uppercase tracking-tight text-white leading-none mb-2">
          Heardle<span className="text-orange-500"> VN</span>
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-gray-400 text-[0.7rem] font-bold uppercase tracking-[0.35em]">Chọn thể loại</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Genre Cards */}
      <div className="flex flex-col gap-4 mb-7">
        {GENRES.map((genre) => {
          const isSelected = selected === genre.id
          return (
            <button
              key={genre.id}
              onClick={() => setSelected(genre.id)}
              style={isSelected ? { boxShadow: `6px 6px 0 ${genre.shadowColor}` } : {}}
              className={`
                relative overflow-hidden border-2 font-black cursor-pointer select-none
                transition-all duration-75 text-left
                ${isSelected
                  ? `bg-gradient-to-br ${genre.selectedBg} ${genre.border} -translate-x-[3px] -translate-y-[3px]`
                  : 'bg-[#181818] border-white/10 hover:border-white/30 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_rgba(255,255,255,0.12)]'
                }
              `}
            >
              {/* Floating decorative emojis (only when selected) */}
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {genre.floats.map((f, i) => (
                    <span
                      key={i}
                      className="absolute opacity-[0.18]"
                      style={{
                        top: FLOAT_POSITIONS[i].top,
                        right: FLOAT_POSITIONS[i].right,
                        transform: `rotate(${FLOAT_POSITIONS[i].rotate})`,
                        fontSize: FLOAT_POSITIONS[i].size,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative px-5 py-[1.1rem] flex items-center gap-5">
                {/* Emoji icon */}
                <span
                  className={`flex-shrink-0 transition-transform duration-75 leading-none
                    ${isSelected ? 'scale-110' : ''}`}
                  style={{ fontSize: '3rem' }}
                >
                  {genre.emoji}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={`font-black uppercase tracking-wide leading-none mb-1
                    ${isSelected ? 'text-white' : 'text-gray-100'}`}
                    style={{ fontSize: '1.45rem' }}
                  >
                    {genre.label}
                  </div>
                  <div className={`text-[0.7rem] font-bold uppercase tracking-[0.25em] mb-2
                    ${isSelected ? genre.accent : 'text-gray-500'}`}>
                    {genre.sublabel}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {genre.artists.map((a) => (
                      <span
                        key={a}
                        className={`text-[0.63rem] font-bold uppercase px-2 py-0.5 border
                          ${isSelected
                            ? 'border-white/35 bg-black/20 text-white/85'
                            : 'border-white/10 bg-white/5 text-gray-500'
                          }`}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <div className="flex-shrink-0 w-6 h-6 border-2 border-white/80 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Start button */}
      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        className="w-full py-[1.05rem] font-black text-base uppercase tracking-widest border-2 transition-all duration-75
          bg-orange-500 border-white text-white
          hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#fff]
          active:translate-x-0 active:translate-y-0 active:shadow-none
          disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        Bắt đầu →
      </button>
    </div>
  )
}
