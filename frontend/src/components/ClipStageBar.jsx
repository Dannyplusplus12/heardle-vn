const STAGES = [1, 5, 15, 30]
const LABELS = ['1s', '5s', '15s', '30s']

export default function ClipStageBar({ stageIndex }) {
  return (
    <div className="flex items-center mb-5">
      {STAGES.map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-4 h-4 border-2 flex items-center justify-center transition-all duration-300
              ${i <= stageIndex
                ? 'border-orange-500 bg-orange-500 shadow-[2px_2px_0_rgba(249,115,22,0.4)]'
                : 'border-white/20 bg-transparent'
              }`}
            >
              {i < stageIndex && (
                <div className="w-2 h-2 bg-white" />
              )}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider
              ${i <= stageIndex ? 'text-orange-500' : 'text-white/20'}`}>
              {LABELS[i]}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-[2px] mx-1 mb-4 transition-colors duration-300
              ${i < stageIndex ? 'bg-orange-500' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
