import { useState, useEffect } from 'react'
import {
  adminCreatePlaylist, adminUpdatePlaylist, adminDeletePlaylist,
  adminAddTrackToPlaylist, adminRemoveTrackFromPlaylist,
  searchTracks,
} from '../../api'

export default function PlaylistModal({ playlist, onClose, onSaved }) {
  const isEdit = !!playlist
  const [form, setForm] = useState({
    name: playlist?.name ?? '',
    description: playlist?.description ?? '',
    cover_url: playlist?.cover_url ?? '',
  })
  const [tracks, setTracks] = useState([])
  const [trackSearch, setTrackSearch] = useState('')
  const [trackResults, setTrackResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Load playlist tracks if editing
  useEffect(() => {
    if (!isEdit) return
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API}/api/admin/playlists/${playlist.id}/tracks`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
      .then(r => r.json())
      .then(setTracks)
      .catch(() => {})
  }, [isEdit, playlist?.id])

  // Search tracks debounced
  useEffect(() => {
    if (!trackSearch.trim()) { setTrackResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchTracks(trackSearch)
        setTrackResults(data)
      } catch { setTrackResults([]) }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [trackSearch])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tên không được để trống'); return }
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        await adminUpdatePlaylist(playlist.id, form)
      } else {
        await adminCreatePlaylist(form)
      }
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Xóa danh sách "${playlist.name}"?`)) return
    setLoading(true)
    try {
      await adminDeletePlaylist(playlist.id)
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrack = async (track) => {
    if (!isEdit) return
    try {
      await adminAddTrackToPlaylist(playlist.id, track.id)
      setTracks(prev => [...prev, { pt_id: Date.now(), position: prev.length + 1, track }])
      setTrackSearch('')
      setTrackResults([])
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRemoveTrack = async (ptId) => {
    try {
      await adminRemoveTrackFromPlaylist(playlist.id, ptId)
      setTracks(prev => prev.filter(t => t.pt_id !== ptId))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-lg bg-[#0f0f0f] border-2 border-white/20 shadow-[8px_8px_0_rgba(245,158,11,0.3)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-4 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            {isEdit ? `Sửa: ${playlist.name}` : '+ Danh sách mới'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Form */}
          <div className="p-5 flex flex-col gap-3 border-b border-white/8">
            {error && (
              <div className="border-2 border-red-500/50 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold">
                {error}
              </div>
            )}
            <Field label="Tên danh sách *" value={form.name} onChange={set('name')} placeholder="Bài hát yêu thích" />
            <Field label="Mô tả" value={form.description} onChange={set('description')} placeholder="Mô tả ngắn..." />
            <Field label="Ảnh bìa (URL)" value={form.cover_url} onChange={set('cover_url')} placeholder="https://..." />
          </div>

          {/* Track management (only when editing) */}
          {isEdit && (
            <div className="p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">
                Bài hát trong danh sách ({tracks.length})
              </p>

              {/* Search to add */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  placeholder="Tìm bài hát để thêm..."
                  className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
                    focus:outline-none focus:border-amber-500/40 transition-colors"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-500 border-t-transparent animate-spin" />
                )}
                {trackResults.length > 0 && (
                  <ul className="absolute z-10 w-full top-full border-x-2 border-b-2 border-white/15 bg-[#151515] max-h-36 overflow-y-auto">
                    {trackResults.map(t => (
                      <li
                        key={t.id}
                        onMouseDown={() => handleAddTrack(t)}
                        className="px-3 py-2 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0"
                      >
                        <span className="text-white text-xs font-semibold">{t.title}</span>
                        <span className="text-gray-500 text-xs"> · {t.artist}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Track list */}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {tracks.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">Chưa có bài hát. Tìm và thêm ở trên.</p>
                ) : (
                  tracks.map((item, i) => (
                    <div key={item.pt_id} className="flex items-center gap-2 border border-white/8 px-2 py-1.5 bg-[#111]">
                      <span className="text-[9px] text-gray-600 w-4 shrink-0">{i + 1}</span>
                      {item.track.cover_url && (
                        <img src={item.track.cover_url} alt="" className="w-6 h-6 object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.track.title}</p>
                        <p className="text-[9px] text-gray-500 truncate">{item.track.artist}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveTrack(item.pt_id)}
                        className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t-2 border-white/10 px-5 py-4 flex gap-2 justify-between shrink-0">
          <div>
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/40 text-red-400
                  hover:bg-red-500/10 px-3 py-1.5 transition-colors disabled:opacity-40"
              >
                Xóa danh sách
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
                hover:border-white/40 hover:text-white px-4 py-1.5 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
                hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#fff]
                active:translate-x-0 active:translate-y-0 active:shadow-none
                px-4 py-1.5 transition-all duration-75 disabled:opacity-40"
            >
              {loading ? '...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
          focus:outline-none focus:border-amber-500/40 transition-colors"
      />
    </div>
  )
}
