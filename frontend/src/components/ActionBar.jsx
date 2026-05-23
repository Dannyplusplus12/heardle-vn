export default function ActionBar({ onSkip, onGiveUp, stage }) {
  return (
    <div className="flex items-center justify-center gap-3 mt-1 mb-4">
      <button
        onClick={onSkip}
        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 text-gray-400 hover:text-white text-sm font-medium transition-all"
      >
        Bỏ qua →
      </button>
      {stage === 30 && (
        <button
          onClick={onGiveUp}
          className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-sm font-medium transition-all"
        >
          Bỏ cuộc
        </button>
      )}
    </div>
  )
}
