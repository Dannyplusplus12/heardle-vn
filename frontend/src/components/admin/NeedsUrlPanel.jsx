import { useState, useEffect } from 'react'
import { adminListArtists, adminUpdateArtist, adminRecrawlArtist } from '../../api'

export default function NeedsUrlPanel({ onClose, onSaved }) {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminListArtists(true)
      .then(setArtists)
      .catch(() => setArtists([]))
      .finally(() => setLoading(false))
  }, [])

  const setField = (id, key, val) =>
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }))

  const handleSave = async (artist) => {
    const patch = edits[artist.id] || {}
    if (!patch.soundcloud_url && !patch.youtube_url) {
      setMsg('Nhập ít nhất một URL')
      return
    }
    setSaving(artist.id)
    setMsg('')
    try {
      await adminUpdateArtist(artist.id, {
        ...patch,
        needs_manual_url: false,
      })
      await adminRecrawlArtist(artist.id)
      setArtists(prev => prev.filter(a => a.id !== artist.id))
      setMsg(`✓ Đã lưu & crawl: ${artist.name}`)
      onSaved()
    } catch (e) {
      setMsg(`Lỗi: ${e.message}`)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-xl bg-[#0f0f0f] border-2 border-red-500/40 shadow-[8px_8px_0_rgba(239,68,68,0.2)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-red-400">
              ⚠ Nghệ sĩ cần URL thủ công
            </h2>
            <p className="text-[9px] text-gray-600 mt-0.5">
              Không tìm thấy nhạc trên Deezer — cần cung cấp SoundCloud hoặc YouTube URL
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {msg && (
            <div className="border-2 border-amber-500/40 bg-amber-500/10 text-amber-400 px-3 py-2 text-xs font-bold mb-4">
              {msg}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-600 text-xs">Đang tải...</div>
          ) : artists.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Không có nghệ sĩ nào cần xử lý
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {artists.map(artist => (
                <div key={artist.id} className="border-2 border-white/10 bg-[#111] p-3">
                  <div className="flex items-center gap-3 mb-3">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.name} className="w-10 h-10 object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10">
                        <span className="text-xs text-gray-600">?</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-white uppercase">{artist.name}</p>
                      <p className="text-[9px] text-gray-600">{artist.genre || 'Không rõ thể loại'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 block mb-1">
                        SoundCloud URL
                      </label>
                      <input
                        type="text"
                        value={edits[artist.id]?.soundcloud_url ?? artist.soundcloud_url ?? ''}
                        onChange={e => setField(artist.id, 'soundcloud_url', e.target.value)}
                        placeholder="https://soundcloud.com/artist"
                        className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
                          focus:outline-none focus:border-amber-500/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 block mb-1">
                        YouTube URL
                      </label>
                      <input
                        type="text"
                        value={edits[artist.id]?.youtube_url ?? artist.youtube_url ?? ''}
                        onChange={e => setField(artist.id, 'youtube_url', e.target.value)}
                        placeholder="https://youtube.com/@artist"
                        className="w-full bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
                          focus:outline-none focus:border-amber-500/40 transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(artist)}
                      disabled={saving === artist.id}
                      className="self-end text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
                        hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_#fff]
                        active:translate-x-0 active:translate-y-0 active:shadow-none
                        px-4 py-1.5 transition-all duration-75 disabled:opacity-40"
                    >
                      {saving === artist.id ? '...' : 'Lưu & Crawl'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t-2 border-white/10 px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
              hover:border-white/40 hover:text-white px-4 py-1.5 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
