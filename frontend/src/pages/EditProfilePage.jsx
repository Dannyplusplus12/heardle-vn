import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  )
}

function Input({ type = 'text', value, onChange, placeholder, autoComplete, disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      className="bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
        text-sm px-3 py-2 outline-none focus:border-amber-400 transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed"
    />
  )
}

export default function EditProfilePage() {
  const { user, token, updateUser, openModal } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [picture, setPicture] = useState(user?.picture || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="border-2 border-white/15 p-8 text-center max-w-sm w-full">
          <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
            Bạn chưa đăng nhập
          </p>
          <button
            onClick={openModal}
            className="border-2 border-amber-400 bg-amber-400 text-black font-black
              uppercase tracking-widest text-sm px-6 py-2 hover:bg-amber-300 transition-colors"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp')
      return
    }

    setSaving(true)
    try {
      const body = { name, picture, bio }
      if (newPassword) {
        body.new_password = newPassword
        if (currentPassword) body.current_password = currentPassword
      }

      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Lỗi cập nhật')

      updateUser(data.token, data.user)
      setSuccess('Đã lưu thay đổi')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const hasPassword = !!user.username

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#0A0A0A' }}>
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Back */}
        <Link to="/profile" className="text-[10px] font-black uppercase tracking-widest text-gray-600
          hover:text-white transition-colors no-underline flex items-center gap-1">
          ← Hồ sơ
        </Link>

        <div className="border-2 border-white/15">
          <div className="h-2 w-full" style={{ backgroundColor: '#F59E0B' }} />

          <div className="p-6">
            <h1 className="text-sm font-black uppercase tracking-widest text-white mb-6">
              Chỉnh sửa hồ sơ
            </h1>

            <form onSubmit={submit} className="flex flex-col gap-6">

              {/* Avatar preview + URL */}
              <Field label="Ảnh đại diện" hint="Nhập URL ảnh (jpg, png, gif...)">
                <div className="flex items-center gap-4">
                  {picture ? (
                    <img src={picture} alt="" className="w-14 h-14 object-cover border-2 border-amber-400 shrink-0"
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="w-14 h-14 border-2 border-amber-400/40 bg-amber-400/5
                      flex items-center justify-center text-lg font-black text-amber-400/40 shrink-0">
                      {initials}
                    </div>
                  )}
                  <input
                    type="url"
                    value={picture}
                    onChange={e => setPicture(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
                      text-sm px-3 py-2 outline-none focus:border-amber-400 transition-colors min-w-0"
                  />
                </div>
              </Field>

              {/* Name */}
              <Field label="Tên hiển thị">
                <Input value={name} onChange={setName} placeholder="Tên của bạn" autoComplete="name" />
              </Field>

              {/* Username — readonly */}
              {user.username && (
                <Field label="Tên đăng nhập" hint="Không thể thay đổi">
                  <Input value={user.username} onChange={() => {}} disabled />
                </Field>
              )}

              {/* Bio */}
              <Field label="Giới thiệu" hint={`${bio.length}/300`}>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 300))}
                  placeholder="Viết vài dòng về bạn..."
                  rows={3}
                  className="bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
                    text-sm px-3 py-2 outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </Field>

              {/* Password section — only for username accounts */}
              {hasPassword && (
                <div className="flex flex-col gap-4 border-t border-white/8 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Đổi mật khẩu
                  </p>
                  <Field label="Mật khẩu hiện tại">
                    <Input type="password" value={currentPassword} onChange={setCurrentPassword}
                      placeholder="••••••" autoComplete="current-password" />
                  </Field>
                  <Field label="Mật khẩu mới" hint="Để trống nếu không muốn đổi">
                    <Input type="password" value={newPassword} onChange={setNewPassword}
                      placeholder="Ít nhất 6 ký tự" autoComplete="new-password" />
                  </Field>
                  {newPassword && (
                    <Field label="Xác nhận mật khẩu mới">
                      <Input type="password" value={confirmPassword} onChange={setConfirmPassword}
                        placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" />
                    </Field>
                  )}
                </div>
              )}

              {/* Feedback */}
              {error && (
                <p className="text-xs text-red-400 border border-red-400/30 bg-red-400/10 px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-green-400 border border-green-400/30 bg-green-400/10 px-3 py-2">{success}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 border-2 border-amber-400 bg-amber-400 text-black font-black
                    uppercase tracking-widest text-[11px] py-2 hover:bg-amber-300 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="border-2 border-white/15 text-gray-500 font-black uppercase
                    tracking-widest text-[11px] px-4 py-2 hover:border-white/30 hover:text-white
                    transition-all"
                >
                  Hủy
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
