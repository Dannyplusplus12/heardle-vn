export default function CoverArt({ src, revealed }) {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl">
      {src ? (
        <img
          src={src}
          alt="Cover"
          className={`w-full h-full object-cover transition-all duration-700 ${
            revealed ? 'blur-none scale-100' : 'blur-xl scale-110'
          }`}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-4xl">
          🎵
        </div>
      )}
    </div>
  )
}
