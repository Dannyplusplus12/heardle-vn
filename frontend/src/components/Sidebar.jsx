const MODES = [
  { id: 'nguyen-nhien', emoji: '🎲', label: 'Ngẫu\nnhiên', available: true },
  { id: 'fan-cung',     emoji: '⭐', label: 'Fan\ncứng',   available: false },
  { id: 'doi-dau',      emoji: '⚔️', label: 'Đối\nđầu',   available: false },
]

export default function Sidebar({ activeMode, onSelectMode }) {
  return (
    <nav className="w-[68px] min-h-screen bg-[#111] border-r-2 border-white/10 flex flex-col items-center pt-4 pb-6 gap-2 shrink-0">
      <div className="mb-4 w-9 h-9 flex items-center justify-center border-2 border-orange-500 text-orange-500 font-black text-base select-none">
        ♪
      </div>
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => mode.available && onSelectMode(mode.id)}
          disabled={!mode.available}
          title={mode.label.replace('\n', ' ')}
          className={`
            w-11 h-[52px] flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-75
            ${activeMode === mode.id
              ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-[2px_2px_0_rgba(249,115,22,0.5)]'
              : mode.available
                ? 'border-white/10 text-gray-500 hover:border-white/35 hover:text-gray-300 cursor-pointer'
                : 'border-white/5 text-gray-700 opacity-30 cursor-not-allowed'
            }
          `}
        >
          <span className="text-lg leading-none">{mode.emoji}</span>
          <span className="text-[8px] font-black uppercase leading-tight whitespace-pre-line text-center tracking-wide">
            {mode.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
