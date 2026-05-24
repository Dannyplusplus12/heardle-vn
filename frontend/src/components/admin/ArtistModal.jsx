import { useState } from 'react'
import { adminCreateArtist, adminUpdateArtist, adminDeleteArtist, adminRecrawlArtist } from '../../api'

export default function ArtistModal({ artist, onClose, onSaved }) {
  const isEdit = !!artist
  const [form, setForm] = useState({
    name: artist?.name ?? '',
    avatar_url: artist?.avatar_url ?? '',
    description: artist?.description ?? '',
    genre: artist?.genre ?? '',
    soundcloud_url: artist?.soundcloud_url ?? '',
    youtube_url: artist?.youtube_url ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [crawlStatus, setCrawlStatus] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tên nghệ sĩ không được để trống'); return }
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        await adminUpdateArtist(artist.id, form)
      } else {
        await adminCreateArtist(form)
      }
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Xóa "${artist.name}"? Thao tác này không thể hoàn tác.`)) return
    setLoading(true)
    try {
      await adminDeleteArtist(artist.id)
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecrawl = async () => {
    setLoading(true)
    setCrawlStatus('')
    try {
      await adminRecrawlArtist(artist.id)
      setCrawlStatus('Đang crawl... kiểm tra logs sau vài phút')
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
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            {isEdit ? `Sửa: ${artist.name}` : '+ Nghệ sĩ mới'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-3">
          {error && (
            <div className="border-2 border-red-500/50 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold">
              {error}
            </div>
          )}
          {crawlStatus && (
            <div className="border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 px-3 py-2 text-xs font-bold">
              {crawlStatus}
            </div>
          )}

          <Field label="Tên nghệ sĩ *" value={form.name} onChange={set('name')} placeholder="Sơn Tùng MTP" />
          <Field label="Ảnh đại diện (URL)" value={form.avatar_url} onChange={set('avatar_url')} placeholder="https://..." />
          <Field label="Thể loại" value={form.genre} onChange={set('genre')} placeholder="Pop / Indie / Hip-Hop / Rock" />
          <Field
            label="Mô tả"
            value={form.description}
            onChange={set('description')}
            placeholder="Tiểu sử ngắn..."
            textarea
          />
          <div className="border-t border-white/8 pt-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">
              Nguồn crawl (khi Deezer không đủ)
            </p>
            <Field label="SoundCloud URL" value={form.soundcloud_url} onChange={set('soundcloud_url')} placeholder="https://soundcloud.com/artist" />
            <Field label="YouTube URL" value={form.youtube_url} onChange={set('youtube_url')} placeholder="https://youtube.com/@artist" />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t-2 border-white/10 px-5 py-4 flex gap-2 justify-between">
          <div className="flex gap-2">
            {isEdit && (
              <>
                <button
                  onClick={handleRecrawl}
                  disabled={loading}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-white/20 text-gray-400
                    hover:border-amber-400 hover:text-amber-400 px-3 py-1.5 transition-colors disabled:opacity-40"
                >
                  ↻ Crawl
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/40 text-red-400
                    hover:bg-red-500/10 px-3 py-1.5 transition-colors disabled:opacity-40"
                >
                  Xóa
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
                hover:border-white/40 hover:text-white px-4 py-1.5 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
                hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#fff]
                active:translate-x-0 active:translate-y-0 active:shadow-none
                px-4 py-1.5 transition-all duration-75 disabled:opacity-40"
            >
              {loading ? '...' : isEdit ? 'Lưu' : 'Thêm & Crawl'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, textarea = false }) {
  const cls = `w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
    focus:outline-none focus:border-amber-500/40 transition-colors`
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}
