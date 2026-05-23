const MODES = [
  {
    id: 'nguyen-nhien',
    label: 'Ngẫu nhiên',
    emoji: '🎲',
    description: 'Đoán bài hát ngẫu nhiên theo thể loại yêu thích',
    available: true,
    gradient: 'from-orange-500 to-pink-500',
    glow: 'hover:shadow-orange-500/20',
  },
  {
    id: 'fan-cung',
    label: 'Fan cứng',
    emoji: '⭐',
    description: 'Chọn nghệ sĩ yêu thích — thử thách bản thân với discography của họ',
    available: false,
    gradient: 'from-violet-500 to-purple-600',
    glow: '',
  },
  {
    id: 'doi-dau',
    label: 'Đối đầu',
    emoji: '⚔️',
    description: 'Thi đấu trực tiếp với bạn bè — ai đoán nhanh hơn sẽ thắng',
    available: false,
    gradient: 'from-red-500 to-rose-600',
    glow: '',
  },
]

export default function HomeScreen({ onSelectMode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Heardle VN
          </h1>
          <p className="text-gray-500 text-sm">Đoán bài hát Việt Nam</p>
        </div>

        <div className="flex flex-col gap-3">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => mode.available && onSelectMode(mode.id)}
              disabled={!mode.available}
              className={`
                w-full text-left p-4 rounded-2xl border transition-all duration-200
                ${mode.available
                  ? `bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 hover:shadow-xl ${mode.glow} cursor-pointer`
                  : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-50'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${mode.gradient} shrink-0`}>
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white">{mode.label}</span>
                    {!mode.available && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 shrink-0">
                        Sắp ra mắt
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{mode.description}</p>
                </div>
                {mode.available && (
                  <span className="text-gray-500 text-lg shrink-0">›</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-gray-700 text-xs mt-10">Heardle VN · Made with ♪</p>
      </div>
    </div>
  )
}
