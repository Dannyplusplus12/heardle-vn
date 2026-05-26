import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function LoginButton() {
  const { user, logout, openModal } = useAuth()

  if (user) {
    const initials = user.name
      ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : '??'

    return (
      <div className="flex items-center gap-2">
        <Link
          to="/profile"
          className="flex items-center gap-2 no-underline group"
        >
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-7 h-7 object-cover border-2 border-amber-400 group-hover:border-amber-300 transition-colors"
            />
          ) : (
            <div className="w-7 h-7 border-2 border-amber-400 bg-amber-400/10 flex items-center
              justify-center text-[10px] font-black text-amber-400 group-hover:border-amber-300 transition-colors">
              {initials}
            </div>
          )}
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider hidden sm:block group-hover:text-amber-300 transition-colors">
            {user.username || user.name.split(' ').pop()}
          </span>
        </Link>
        <button
          onClick={logout}
          className="text-[10px] font-black uppercase tracking-widest border border-white/20 text-gray-500
            hover:border-white/50 hover:text-white px-2 py-1 transition-colors"
        >
          Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={openModal}
      className="text-[10px] font-black uppercase tracking-widest border-2 border-amber-400/60
        text-amber-400 hover:border-amber-400 hover:bg-amber-400/10 px-3 py-1.5 transition-all"
    >
      Đăng nhập
    </button>
  )
}
