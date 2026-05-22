export default function ResultBanner({ status, track, onPlayAgain }) {
  if (status !== 'won' && status !== 'lost') return null

  return (
    <div className={`mt-4 p-4 rounded-lg text-center ${
      status === 'won' ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-800'
    }`}>
      <div className="text-2xl mb-1">
        {status === 'won' ? '🎉' : '😢'}
      </div>
      <div className="font-bold text-lg mb-1">
        {status === 'won' ? 'Chính xác!' : 'Sai rồi!'}
      </div>
      {track && (
        <div className="text-gray-300 text-sm mb-4">
          <div className="font-medium text-white">{track.title}</div>
          <div>{track.artist}</div>
        </div>
      )}
      <button
        onClick={onPlayAgain}
        className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium transition-colors"
      >
        Chơi lại
      </button>
    </div>
  )
}
