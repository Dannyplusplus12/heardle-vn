const MODES = [
  { id: 'nguyen-nhien', emoji: '🎲', label: 'Ngẫu\nnhiên', available: true },
  { id: 'fan-cung',     emoji: '⭐', label: 'Fan\ncứng',   available: false },
  { id: 'doi-dau',      emoji: '⚔️', label: 'Đối\nđầu',   available: false },
]

export default function Sidebar({ activeMode, onSelectMode }) {
  return (
    <nav className="w-16 min-h-screen bg-white/[0.03] border-r border-white/8 flex flex-col items-center pt-5 pb-6 gap-1 shrink-0">
      <div className="mb-5 text-orange-500 text-xl font-black select-none">♪</div>
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => mode.available && onSelectMode(mode.id)}
          disabled={!mode.available}
          title={mode.label.replace('\n', ' ')}
          className={`
            w-11 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all
            ${activeMode === mode.id
              ? 'bg-orange-500/20 text-orange-400'
              : mode.available
                ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5 cursor-pointer'
                : 'text-gray-700 opacity-40 cursor-not-allowed'
            }
          `}
        >
          <span className="text-lg leading-none">{mode.emoji}</span>
          <span className="text-[9px] font-medium leading-tight whitespace-pre-line text-center">
            {mode.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
