import { useState } from 'react'
import { adminAddTrackToArtist } from '../../api'

export default function AddTrackModal({ artist, onClose, onSaved }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAdd = async () => {
    if (!url.trim()) { setError('Nhập URL SoundCloud của bài hát'); return }
    if (!url.includes('soundcloud.com')) { setError('Chỉ hỗ trợ URL SoundCloud'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await adminAddTrackToArtist(artist.id, url.trim(), title.trim() || null)
      setSuccess(`Đã thêm: "${result.title}"`)
      setUrl('')
      setTitle('')
      onSaved?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md bg-[#0f0f0f] border-2 border-white/20 shadow-[8px_8px_0_rgba(245,158,11,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">+ Bài hát</h2>
            <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-widest">{artist.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg font-bold">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {error && (
            <div className="border-2 border-red-500/50 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold">
              {error}
            </div>
          )}
          {success && (
            <div className="border-2 border-green-500/50 bg-green-500/10 text-green-400 px-3 py-2 text-xs font-bold">
              {success}
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">
              SoundCloud Track URL *
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://soundcloud.com/artist/song-title"
              className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
                focus:outline-none focus:border-amber-500/40 transition-colors"
            />
            <p className="text-[8px] text-gray-600 mt-1">URL phải trỏ đến 1 bài cụ thể, không phải trang nghệ sĩ. Tối đa 10 phút.</p>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">
              Tên bài hát (tuỳ chọn — tự động lấy từ SC)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Để trống để lấy tên từ SoundCloud"
              className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
                focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
        </div>

        <div className="border-t-2 border-white/10 px-5 py-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
              hover:border-white/40 hover:text-white px-4 py-1.5 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
              hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#fff]
              active:translate-x-0 active:translate-y-0 active:shadow-none
              px-4 py-1.5 transition-all duration-75 disabled:opacity-40"
          >
            {loading ? '...' : '+ Thêm'}
          </button>
        </div>
      </div>
    </div>
  )
}
