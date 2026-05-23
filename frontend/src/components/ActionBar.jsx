export default function ActionBar({ onSkip, onGiveUp, stage }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-4">
      <button
        onClick={onSkip}
        className="flex-1 py-2.5 border-2 border-white/20 bg-[#1a1a1a] text-gray-400 text-xs font-black uppercase tracking-widest
          hover:border-white/50 hover:text-white hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_rgba(255,255,255,0.2)]
          active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-75"
      >
        Bỏ qua →
      </button>
      {stage === 30 && (
        <button
          onClick={onGiveUp}
          className="flex-1 py-2.5 border-2 border-red-500/40 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest
            hover:border-red-500 hover:text-red-300 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_rgba(239,68,68,0.4)]
            active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-75"
        >
          Bỏ cuộc
        </button>
      )}
    </div>
  )
}
