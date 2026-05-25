import { useEffect, useRef } from 'react'

const PHASE_STYLE = {
  easy:   { color: '#22c55e', dimColor: 'rgba(34,197,94,0.12)',  label: 'SAI' },
  medium: { color: '#eab308', dimColor: 'rgba(234,179,8,0.12)',  label: 'SAI' },
  hard:   { color: '#ef4444', dimColor: 'rgba(239,68,68,0.12)', label: 'SAI' },
}

export default function WrongPopup({ wrongTrack, phase = 'easy', onDismiss }) {
  const style = PHASE_STYLE[phase] || PHASE_STYLE.easy
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 1800)
    return () => clearTimeout(timerRef.current)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Card */}
      <div
        className="relative w-64 bg-[#0d0d0d] border-2 select-none"
        style={{
          borderColor: style.color,
          boxShadow: `8px 8px 0 ${style.color}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar — drain animation */}
        <div className="h-[3px] w-full overflow-hidden" style={{ backgroundColor: style.dimColor }}>
          <div
            className="h-full"
            style={{
              backgroundColor: style.color,
              animation: 'drain 1.8s linear forwards',
            }}
          />
        </div>

        <div className="px-7 pt-7 pb-6">
          {/* Big mark */}
          <div
            className="text-[4rem] font-black text-center leading-none mb-4 select-none"
            style={{ color: style.color }}
          >
            ✕
          </div>

          {/* Label */}
          <div
            className="text-[0.6rem] font-black uppercase tracking-[0.45em] text-center mb-3"
            style={{ color: style.color }}
          >
            {style.label}
          </div>

          {/* Wrong track name */}
          {wrongTrack && (
            <div className="text-center">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">
                Câu trả lời của bạn
              </p>
              <p className="text-white/60 text-sm font-bold truncate leading-snug">
                {wrongTrack}
              </p>
            </div>
          )}
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2" style={{ borderColor: style.color, opacity: 0.4 }} />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: style.color, opacity: 0.4 }} />
      </div>

      <style>{`
        @keyframes drain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
