import { NavLink } from 'react-router-dom'

const MODES = [
  { path: '/ngau-nhien', label: 'NGẪU\nNHIÊN', icon: '🎲', color: '#f97316' },
  { path: '/fan-cung',   label: 'FAN\nCỨNG',   icon: '⭐', color: '#f59e0b' },
  { path: '/doi-dau',    label: 'ĐỐI\nĐẦU',    icon: '⚔',  color: '#FF006E' },
]

export default function Sidebar() {
  return (
    <nav className="w-[88px] min-h-screen flex flex-col items-center pt-4 pb-8 gap-2 shrink-0"
      style={{ backgroundColor: '#050505', borderRight: '2px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="mb-5 w-[52px] h-[52px] flex items-center justify-center font-black text-2xl select-none border-2"
        style={{ borderColor: '#FF006E', color: '#FF006E', boxShadow: '3px 3px 0 rgba(255,0,110,0.25)' }}>
        ♪
      </div>

      {MODES.map(mode => (
        <NavLink
          key={mode.path}
          to={mode.path}
          title={mode.label.replace('\n', ' ')}
          className="no-underline"
        >
          {({ isActive }) => (
            <div
              className="w-[68px] h-[62px] flex flex-col items-center justify-center gap-1 border-2 transition-all duration-75 cursor-pointer select-none"
              style={{
                borderColor: isActive ? mode.color : 'rgba(255,255,255,0.08)',
                backgroundColor: isActive ? `${mode.color}12` : 'transparent',
                boxShadow: isActive ? `3px 3px 0 ${mode.color}60` : 'none',
                transform: isActive ? 'translate(-1px, -1px)' : 'none',
              }}
            >
              <span className="text-xl leading-none">{mode.icon}</span>
              <span
                className="text-[9px] font-black uppercase leading-tight whitespace-pre-line text-center tracking-wide"
                style={{ color: isActive ? mode.color : '#4b5563' }}>
                {mode.label}
              </span>
            </div>
          )}
        </NavLink>
      ))}

      {/* Decorative bottom */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-1 h-1" style={{ backgroundColor: '#FF006E' }} />
        <div className="w-1 h-1" style={{ backgroundColor: '#00E5FF' }} />
        <div className="w-1 h-1" style={{ backgroundColor: '#CCFF00' }} />
      </div>
    </nav>
  )
}
