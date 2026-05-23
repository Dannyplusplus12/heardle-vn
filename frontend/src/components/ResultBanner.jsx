export default function ResultBanner({ status, track, onPlayAgain }) {
  if (status !== 'won' && status !== 'lost') return null

  const won = status === 'won'

  return (
    <div className={`mt-2 p-5 rounded-2xl border text-center ${
      won
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-red-500/10 border-red-500/20'
    }`}>
      <div className="text-3xl mb-2">{won ? '🎉' : '😢'}</div>
      <div className={`font-bold text-lg mb-1 ${won ? 'text-green-400' : 'text-red-400'}`}>
        {won ? 'Chính xác!' : 'Sai rồi!'}
      </div>
      {track && (
        <div className="mb-4">
          <div className="text-white font-medium text-sm">{track.title}</div>
          <div className="text-gray-500 text-xs">{track.artist}</div>
        </div>
      )}
      <button
        onClick={onPlayAgain}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-orange-500/30"
      >
        Chơi lại
      </button>
    </div>
  )
}
