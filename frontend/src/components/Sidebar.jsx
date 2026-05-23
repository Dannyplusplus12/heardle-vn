const MODES = [
  { id: 'nguyen-nhien', emoji: '🎲', label: 'Ngẫu\nnhiên', available: true },
  { id: 'fan-cung',     emoji: '⭐', label: 'Fan\ncứng',   available: true },
  { id: 'doi-dau',      emoji: '⚔️', label: 'Đối\nđầu',   available: false },
]

export default function Sidebar({ activeMode, onSelectMode }) {
  return (
    <nav className="w-[136px] min-h-screen bg-[#111] border-r-2 border-white/10 flex flex-col items-center pt-8 pb-12 gap-4 shrink-0">
      <div className="mb-6 w-[72px] h-[72px] flex items-center justify-center border-2 border-orange-500 text-orange-500 font-black text-3xl select-none">
        ♪
      </div>
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => mode.available && onSelectMode(mode.id)}
          disabled={!mode.available}
          title={mode.label.replace('\n', ' ')}
          className={`
            w-[108px] h-[96px] flex flex-col items-center justify-center gap-1 border-2 transition-all duration-75
            ${activeMode === mode.id
              ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-[4px_4px_0_rgba(249,115,22,0.5)]'
              : mode.available
                ? 'border-white/10 text-gray-500 hover:border-white/35 hover:text-gray-300 cursor-pointer'
                : 'border-white/5 text-gray-700 opacity-30 cursor-not-allowed'
            }
          `}
        >
          <span className="text-4xl leading-none">{mode.emoji}</span>
          <span className="text-[16px] font-black uppercase leading-tight whitespace-pre-line text-center tracking-wide">
            {mode.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
