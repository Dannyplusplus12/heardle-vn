import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProfilePage() {
  const { user, logout, openModal } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ backgroundColor: '#0A0A0A' }}>
        <div className="border-2 border-white/15 p-8 text-center max-w-sm w-full">
          <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
            Bạn chưa đăng nhập
          </p>
          <button
            onClick={openModal}
            className="border-2 border-amber-400 bg-amber-400 text-black font-black uppercase
              tracking-widest text-sm px-6 py-2 hover:bg-amber-300 transition-colors"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  }

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })
    : null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#0A0A0A' }}>
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Back */}
        <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-gray-600
          hover:text-white transition-colors no-underline flex items-center gap-1">
          ← Quay lại
        </Link>

        {/* Card */}
        <div className="border-2 border-white/15">

          {/* Top band */}
          <div className="h-2 w-full" style={{ backgroundColor: '#F59E0B' }} />

          <div className="p-6 flex flex-col gap-6">

            {/* Avatar + name */}
            <div className="flex items-center gap-5">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-20 h-20 object-cover border-2 border-amber-400"
                />
              ) : (
                <div className="w-20 h-20 border-2 border-amber-400 bg-amber-400/10
                  flex items-center justify-center text-2xl font-black text-amber-400">
                  {initials}
                </div>
              )}

              <div className="flex flex-col gap-1 min-w-0">
                <h1 className="text-xl font-black uppercase tracking-wide text-white leading-tight truncate">
                  {user.name}
                </h1>
                {user.username && (
                  <p className="text-sm font-bold text-amber-400/70">@{user.username}</p>
                )}
                {user.email && (
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                )}
                {user.is_admin && (
                  <span className="text-[9px] font-black uppercase tracking-widest
                    border border-amber-400 text-amber-400 px-2 py-0.5 w-fit">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="border-l-2 border-amber-400/40 pl-4">
                <p className="text-sm text-gray-300 leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-2 border-t border-white/8 pt-4">
              {joinDate && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 w-20">Tham gia</span>
                  <span className="text-xs text-gray-400">{joinDate}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 w-20">Loại TK</span>
                <span className="text-xs text-gray-400">
                  {user.google_id !== undefined && !user.username ? 'Google' : 'Tài khoản riêng'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Link
                to="/profile/edit"
                className="flex-1 border-2 border-white/20 text-white font-black uppercase
                  tracking-widest text-[11px] py-2 text-center hover:border-amber-400 hover:text-amber-400
                  transition-all no-underline"
              >
                Chỉnh sửa
              </Link>
              <button
                onClick={handleLogout}
                className="border-2 border-white/10 text-gray-500 font-black uppercase
                  tracking-widest text-[11px] px-4 py-2 hover:border-red-400/50 hover:text-red-400
                  transition-all"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
