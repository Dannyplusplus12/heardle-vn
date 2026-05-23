export default function CoverArt({ src, revealed }) {
  return (
    <div className="relative w-52 h-52 mx-auto mb-6">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/30 to-pink-500/30 blur-2xl transition-opacity duration-700 ${revealed ? 'opacity-80' : 'opacity-0'}`} />
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        {src ? (
          <img
            src={src}
            alt="Cover"
            className={`w-full h-full object-cover transition-all duration-700 ${
              revealed ? 'blur-none scale-100' : 'blur-2xl scale-110'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-5xl">
            🎵
          </div>
        )}
      </div>
    </div>
  )
}
