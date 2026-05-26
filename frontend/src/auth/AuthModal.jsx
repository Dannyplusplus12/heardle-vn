import { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Lỗi không xác định')
  return data
}

function Input({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
          text-sm px-3 py-2 outline-none focus:border-amber-400 transition-colors"
      />
    </div>
  )
}

function LoginForm({ onSwitch }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await apiPost('/api/auth/login', { username, password })
      login(token, user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const googleSuccess = async ({ credential }) => {
    setError('')
    try {
      const { token, user } = await apiPost('/api/auth/google', { id_token: credential })
      login(token, user)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Tên đăng nhập" value={username} onChange={setUsername}
        placeholder="username" autoComplete="username" />
      <Input label="Mật khẩu" type="password" value={password} onChange={setPassword}
        placeholder="••••••" autoComplete="current-password" />

      {error && (
        <p className="text-xs text-red-400 border border-red-400/30 bg-red-400/10 px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="border-2 border-amber-400 bg-amber-400 text-black font-black uppercase
          tracking-widest text-sm py-2 hover:bg-amber-300 transition-colors disabled:opacity-50"
      >
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-white/10" />
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">hoặc</span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={googleSuccess}
          onError={() => setError('Đăng nhập Google thất bại')}
          size="large"
          theme="filled_black"
          text="signin_with"
          shape="rectangular"
        />
      </div>

      <p className="text-center text-xs text-gray-500">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={onSwitch}
          className="text-amber-400 font-bold hover:underline">
          Đăng ký
        </button>
      </p>
    </form>
  )
}

function RegisterForm({ onSwitch }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return }
    setLoading(true)
    try {
      const { token, user } = await apiPost('/api/auth/register', { username, name, password })
      login(token, user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Tên đăng nhập" value={username} onChange={setUsername}
        placeholder="vd: nguyenvana" autoComplete="username" />
      <p className="text-[10px] text-gray-500 -mt-3">Chữ, số và _ (3–30 ký tự). Dùng để đăng nhập.</p>

      <Input label="Tên hiển thị" value={name} onChange={setName}
        placeholder="Tên của bạn" autoComplete="name" />

      <Input label="Mật khẩu" type="password" value={password} onChange={setPassword}
        placeholder="Ít nhất 6 ký tự" autoComplete="new-password" />
      <Input label="Xác nhận mật khẩu" type="password" value={confirm} onChange={setConfirm}
        placeholder="Nhập lại mật khẩu" autoComplete="new-password" />

      {error && (
        <p className="text-xs text-red-400 border border-red-400/30 bg-red-400/10 px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="border-2 border-amber-400 bg-amber-400 text-black font-black uppercase
          tracking-widest text-sm py-2 hover:bg-amber-300 transition-colors disabled:opacity-50"
      >
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Đã có tài khoản?{' '}
        <button type="button" onClick={onSwitch}
          className="text-amber-400 font-bold hover:underline">
          Đăng nhập
        </button>
      </p>
    </form>
  )
}

export default function AuthModal() {
  const { modalOpen, closeModal } = useAuth()
  const [tab, setTab] = useState('login')

  useEffect(() => {
    if (modalOpen) setTab('login')
  }, [modalOpen])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeModal() }
    if (modalOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  if (!modalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal() }}
    >
      <div
        className="w-full max-w-sm border-2 border-white/15 bg-[#0f0f0f] shadow-[6px_6px_0_#F59E0B]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-4">
          <div className="flex gap-0">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[11px] font-black uppercase tracking-widest px-4 py-1.5 border-2 transition-all ${
                  tab === t
                    ? 'border-amber-400 bg-amber-400 text-black'
                    : 'border-white/15 text-gray-500 hover:text-white hover:border-white/30'
                }`}
              >
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
          <button
            onClick={closeModal}
            className="text-gray-600 hover:text-white text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {tab === 'login'
            ? <LoginForm onSwitch={() => setTab('register')} />
            : <RegisterForm onSwitch={() => setTab('login')} />
          }
        </div>
      </div>
    </div>
  )
}
