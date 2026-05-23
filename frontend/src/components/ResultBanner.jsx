export default function ResultBanner({ status, track, onPlayAgain }) {
  if (status !== 'won' && status !== 'lost') return null
  const won = status === 'won'

  return (
    <div className={`mt-2 p-5 border-2 ${won ? 'border-green-500 bg-green-500/10 shadow-[4px_4px_0_rgba(34,197,94,0.3)]' : 'border-red-500 bg-red-500/10 shadow-[4px_4px_0_rgba(239,68,68,0.3)]'}`}>
      <div className="text-3xl mb-2 text-center">{won ? '🎉' : '😢'}</div>
      <div className={`font-black text-xl uppercase tracking-tight text-center mb-1 ${won ? 'text-green-400' : 'text-red-400'}`}>
        {won ? 'Chính xác!' : 'Sai rồi!'}
      </div>
      {track && (
        <div className="text-center mb-4">
          <div className="text-white font-bold text-sm">{track.title}</div>
          <div className="text-gray-500 text-xs">{track.artist}</div>
        </div>
      )}
      <button
        onClick={onPlayAgain}
        className="w-full py-3 border-2 border-white bg-orange-500 text-white font-black text-sm uppercase tracking-widest
          hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
          active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-75"
      >
        Chơi lại →
      </button>
    </div>
  )
}
