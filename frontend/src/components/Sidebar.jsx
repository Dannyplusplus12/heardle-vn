import { NavLink } from 'react-router-dom'

const MODES = [
  { path: '/ngau-nhien', emoji: '🎲', label: 'Ngẫu\nnhiên', available: true },
  { path: '/fan-cung',   emoji: '⭐', label: 'Fan\ncứng',   available: true },
  { path: '/doi-dau',    emoji: '⚔️', label: 'Đối\nđầu',   available: false },
]

export default function Sidebar() {
  return (
    <nav className="w-[90px] min-h-screen bg-[#111] border-r-2 border-white/10 flex flex-col items-center pt-5 pb-8 gap-3 shrink-0">
      <div className="mb-4 w-[48px] h-[48px] flex items-center justify-center border-2 border-orange-500 text-orange-500 font-black text-xl select-none">
        ♪
      </div>
      {MODES.map(mode => (
        mode.available ? (
          <NavLink
            key={mode.path}
            to={mode.path}
            title={mode.label.replace('\n', ' ')}
            className={({ isActive }) => `
              w-[72px] h-[64px] flex flex-col items-center justify-center gap-1 border-2 transition-all duration-75 no-underline
              ${isActive
                ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-[4px_4px_0_rgba(249,115,22,0.5)]'
                : 'border-white/10 text-gray-500 hover:border-white/35 hover:text-gray-300 cursor-pointer'
              }
            `}
          >
            <span className="text-2xl leading-none">{mode.emoji}</span>
            <span className="text-[11px] font-black uppercase leading-tight whitespace-pre-line text-center tracking-wide">
              {mode.label}
            </span>
          </NavLink>
        ) : (
          <div
            key={mode.path}
            title={mode.label.replace('\n', ' ')}
            className="w-[72px] h-[64px] flex flex-col items-center justify-center gap-1 border-2 border-white/5 text-gray-700 opacity-30 cursor-not-allowed"
          >
            <span className="text-2xl leading-none">{mode.emoji}</span>
            <span className="text-[11px] font-black uppercase leading-tight whitespace-pre-line text-center tracking-wide">
              {mode.label}
            </span>
          </div>
        )
      ))}
    </nav>
  )
}
