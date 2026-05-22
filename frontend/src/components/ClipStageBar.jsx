const STAGES = [1, 5, 15, 30]
const LABELS = ['1s', '5s', '15s', '30s']

export default function ClipStageBar({ stageIndex }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STAGES.map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`w-8 h-2 rounded-full transition-colors ${
              i <= stageIndex ? 'bg-orange-500' : 'bg-gray-700'
            }`}
          />
          <span className={`text-xs ${i <= stageIndex ? 'text-orange-400' : 'text-gray-600'}`}>
            {LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  )
}
