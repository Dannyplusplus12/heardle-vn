import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LoginButton() {
  const { user, login, logout } = useAuth()

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.picture && (
          <img src={user.picture} alt={user.name} className="w-7 h-7 object-cover border-2 border-amber-400" />
        )}
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider hidden sm:block">
          {user.name.split(' ').pop()}
        </span>
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
    <GoogleLogin
      onSuccess={async ({ credential }) => {
        try {
          const res = await fetch(`${API}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: credential }),
          })
          if (!res.ok) throw new Error('Login failed')
          const { token, user } = await res.json()
          login(token, user)
        } catch (e) {
          console.error('Login error:', e)
        }
      }}
      onError={() => console.error('Google login failed')}
      size="small"
      shape="square"
      theme="filled_black"
      text="signin"
    />
  )
}
