export default function CoverArt({ src, revealed }) {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      {revealed && (
        <div className="absolute -inset-2 bg-orange-500/20 blur-xl" />
      )}
      <div className={`relative w-full h-full border-2 overflow-hidden transition-all duration-300
        ${revealed ? 'border-orange-500 shadow-[4px_4px_0_rgba(249,115,22,0.5)]' : 'border-white/20 shadow-[4px_4px_0_rgba(255,255,255,0.08)]'}`}
      >
        {src ? (
          <img
            src={src}
            alt="Cover"
            className={`w-full h-full object-cover transition-all duration-700 ${
              revealed ? 'blur-none scale-100' : 'blur-2xl scale-125'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-5xl">
            🎵
          </div>
        )}
      </div>
    </div>
  )
}
