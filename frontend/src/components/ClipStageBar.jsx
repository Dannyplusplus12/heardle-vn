const STAGES = [1, 5, 15, 30]
const LABELS = ['1s', '5s', '15s', '30s']

export default function ClipStageBar({ stageIndex }) {
  return (
    <div className="flex items-center mb-6">
      {STAGES.map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i <= stageIndex
                  ? 'bg-orange-500 shadow-sm shadow-orange-500/60'
                  : 'bg-white/15'
              }`}
            />
            <span className={`text-xs font-medium tabular-nums ${
              i <= stageIndex ? 'text-orange-400' : 'text-white/25'
            }`}>
              {LABELS[i]}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-px mx-1 mb-4 transition-colors duration-300 ${
              i < stageIndex ? 'bg-orange-500' : 'bg-white/10'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
