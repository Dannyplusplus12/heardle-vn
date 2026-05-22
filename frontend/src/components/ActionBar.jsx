export default function ActionBar({ onSkip, onGiveUp, stage, disabled }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={onSkip}
        disabled={disabled}
        className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors disabled:opacity-40"
      >
        Bỏ qua →
      </button>
      {stage === 30 && (
        <button
          onClick={onGiveUp}
          disabled={disabled}
          className="px-6 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-red-300 text-sm transition-colors disabled:opacity-40"
        >
          Bỏ cuộc
        </button>
      )}
    </div>
  )
}
