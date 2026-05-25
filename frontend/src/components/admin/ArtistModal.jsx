import { useState, useEffect, useCallback } from 'react'
import {
  adminCreateArtist, adminUpdateArtist, adminDeleteArtist,
  adminRecrawlArtist, adminListArtistTracks, adminAddArtistTrack, adminDeleteArtistTrack,
} from '../../api'

const SOURCE_LABEL = { deezer: 'DZ', soundcloud: 'SC', youtube: 'YT' }
const SOURCE_COLOR = {
  deezer:     { bg: '#1db954', text: '#000' },
  soundcloud: { bg: '#ff5500', text: '#fff' },
  youtube:    { bg: '#ff0000', text: '#fff' },
}

function SourceBadge({ source }) {
  const c = SOURCE_COLOR[source] || { bg: '#444', text: '#fff' }
  return (
    <span
      className="text-[8px] font-black uppercase px-1.5 py-0.5 shrink-0 leading-none"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {SOURCE_LABEL[source] || source}
    </span>
  )
}

export default function ArtistModal({ artist, onClose, onSaved }) {
  const isEdit = !!artist

  // ── Info form ──
  const [form, setForm] = useState({
    name: artist?.name ?? '',
    avatar_url: artist?.avatar_url ?? '',
    description: artist?.description ?? '',
    genre: artist?.genre ?? '',
    soundcloud_url: artist?.soundcloud_url ?? '',
    youtube_url: artist?.youtube_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Track pool ──
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [deletingTrack, setDeletingTrack] = useState(null)

  // ── Add single track ──
  const [scInput, setScInput] = useState('')
  const [dzInput, setDzInput] = useState('')
  const [addingTrack, setAddingTrack] = useState(null) // 'sc' | 'dz' | null
  const [addError, setAddError] = useState('')

  // ── Per-source crawl ──
  const [crawling, setCrawling] = useState(null) // 'deezer' | 'soundcloud' | 'youtube' | null
  const [crawlMsg, setCrawlMsg] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const loadTracks = useCallback(async () => {
    if (!artist?.id) return
    setLoadingTracks(true)
    try {
      setTracks(await adminListArtistTracks(artist.id))
    } catch { setTracks([]) }
    setLoadingTracks(false)
  }, [artist?.id])

  useEffect(() => { loadTracks() }, [loadTracks])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tên nghệ sĩ không được để trống'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) await adminUpdateArtist(artist.id, form)
      else await adminCreateArtist(form)
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Xóa "${artist.name}"? Thao tác này không thể hoàn tác.`)) return
    setSaving(true)
    try { await adminDeleteArtist(artist.id); onSaved() }
    catch (e) { setError(e.message); setSaving(false) }
  }

  const handleCrawl = async (source) => {
    setCrawling(source); setCrawlMsg('')
    try {
      await adminRecrawlArtist(artist.id, source)
      setCrawlMsg(`↻ ${source === 'deezer' ? 'Deezer' : source === 'soundcloud' ? 'SoundCloud' : 'YouTube'} đang crawl — reload sau vài phút`)
      setTimeout(() => { setCrawlMsg(''); loadTracks() }, 4000)
    } catch (e) { setCrawlMsg(`Lỗi: ${e.message}`) }
    finally { setCrawling(null) }
  }

  const handleAddTrack = async (type) => {
    const url = type === 'sc' ? scInput.trim() : dzInput.trim()
    if (!url) return
    setAddingTrack(type); setAddError('')
    try {
      await adminAddArtistTrack(artist.id, type === 'sc' ? { soundcloud_url: url } : { deezer_url: url })
      if (type === 'sc') setScInput(''); else setDzInput('')
      await loadTracks()
    } catch (e) { setAddError(e.message) }
    finally { setAddingTrack(null) }
  }

  const handleDeleteTrack = async (trackId) => {
    setDeletingTrack(trackId)
    try { await adminDeleteArtistTrack(artist.id, trackId); await loadTracks() }
    catch (e) { setAddError(e.message) }
    finally { setDeletingTrack(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full bg-[#0f0f0f] border-2 border-white/15 shadow-[8px_8px_0_rgba(245,158,11,0.25)]"
        style={{ maxWidth: isEdit ? '900px' : '440px' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-3.5">
          <h2 className="text-xs font-black uppercase tracking-widest text-white">
            {isEdit ? `Sửa: ${artist.name}` : '+ Nghệ sĩ mới'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-base leading-none">✕</button>
        </div>

        <div className={`flex ${isEdit ? 'divide-x-2 divide-white/8' : ''}`}>

          {/* ── Left: Info form ── */}
          <div className={`flex flex-col ${isEdit ? 'w-64 shrink-0' : 'w-full'}`}>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              {error && (
                <div className="border-2 border-red-500/50 bg-red-500/10 text-red-400 px-3 py-2 text-[10px] font-bold">
                  {error}
                </div>
              )}
              <Field label="Tên nghệ sĩ *" value={form.name} onChange={set('name')} placeholder="Sơn Tùng MTP" />
              <Field label="Ảnh đại diện (URL)" value={form.avatar_url} onChange={set('avatar_url')} placeholder="https://..." />
              <Field label="Thể loại" value={form.genre} onChange={set('genre')} placeholder="Pop / Hip-Hop / Indie" />
              <Field label="Mô tả" value={form.description} onChange={set('description')} placeholder="Tiểu sử ngắn..." textarea />
              <div className="border-t border-white/8 pt-2.5 mt-0.5">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-2">Nguồn crawl</p>
                <Field label="SoundCloud URL" value={form.soundcloud_url} onChange={set('soundcloud_url')} placeholder="https://soundcloud.com/artist" />
                <div className="mt-2">
                  <Field label="YouTube URL" value={form.youtube_url} onChange={set('youtube_url')} placeholder="https://youtube.com/@artist" />
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="border-t-2 border-white/8 px-4 py-3 flex gap-2 justify-between">
              {isEdit && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/40 text-red-400
                    hover:bg-red-500/10 px-3 py-1.5 transition-colors disabled:opacity-40"
                >
                  Xóa nghệ sĩ
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={onClose}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
                    hover:border-white/40 hover:text-white px-3 py-1.5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
                    hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#fff]
                    active:translate-x-0 active:translate-y-0 active:shadow-none
                    px-4 py-1.5 transition-all duration-75 disabled:opacity-40"
                >
                  {saving ? '...' : isEdit ? 'Lưu' : 'Thêm & Crawl'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Track pool (edit mode only) ── */}
          {isEdit && (
            <div className="flex-1 min-w-0 flex flex-col" style={{ maxHeight: '600px' }}>

              {/* Track pool header */}
              <div className="px-4 py-3 border-b-2 border-white/8 flex items-center justify-between shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.35em] text-gray-500">
                  Pool bài hát
                  {!loadingTracks && <span className="text-amber-400 ml-2">{tracks.length}</span>}
                </span>
                {crawlMsg && (
                  <span className="text-[9px] text-amber-400 font-bold truncate ml-3">{crawlMsg}</span>
                )}
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
                {loadingTracks ? (
                  <div className="py-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">Đang tải...</div>
                ) : tracks.length === 0 ? (
                  <div className="py-8 text-center text-gray-700 text-[10px] font-bold uppercase tracking-widest">Chưa có bài hát</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {tracks.map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 px-4 py-2 group hover:bg-white/3">
                        {/* Cover */}
                        <div className="w-8 h-8 shrink-0 bg-[#1a1a1a] overflow-hidden border border-white/8">
                          {t.cover_url
                            ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px]">♪</div>
                          }
                        </div>

                        {/* Source badge */}
                        <SourceBadge source={t.source} />

                        {/* Title */}
                        <p className="flex-1 text-[11px] text-gray-300 font-medium truncate leading-snug">
                          {t.title}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.permalink_url && (
                            <a
                              href={t.permalink_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-white text-xs leading-none"
                              title="Mở link"
                            >
                              ↗
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteTrack(t.id)}
                            disabled={deletingTrack === t.id}
                            className="text-gray-600 hover:text-red-400 text-xs leading-none transition-colors disabled:opacity-40"
                            title="Xóa bài hát"
                          >
                            {deletingTrack === t.id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add track + crawl section */}
              <div className="border-t-2 border-white/8 shrink-0 p-4 flex flex-col gap-3">
                {addError && (
                  <div className="border border-red-500/50 bg-red-500/10 text-red-400 px-2.5 py-1.5 text-[10px] font-bold">
                    {addError}
                  </div>
                )}

                {/* Deezer row */}
                <div className="flex items-center gap-2">
                  <SourceBadge source="deezer" />
                  <input
                    type="text"
                    value={dzInput}
                    onChange={e => setDzInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTrack('dz')}
                    placeholder="https://www.deezer.com/track/..."
                    className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 text-white text-[10px] px-2.5 py-1.5 placeholder-gray-700
                      focus:outline-none focus:border-amber-500/40"
                  />
                  <button
                    onClick={() => handleAddTrack('dz')}
                    disabled={!dzInput.trim() || addingTrack === 'dz'}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/15 text-gray-400
                      hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 shrink-0"
                  >
                    {addingTrack === 'dz' ? '…' : '+ Add'}
                  </button>
                  <button
                    onClick={() => handleCrawl('deezer')}
                    disabled={!!crawling}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/10 text-gray-600
                      hover:border-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-30 shrink-0"
                    title="Crawl Deezer bằng tên nghệ sĩ"
                  >
                    {crawling === 'deezer' ? '…' : '↻ Crawl'}
                  </button>
                </div>

                {/* SoundCloud row */}
                <div className="flex items-center gap-2">
                  <SourceBadge source="soundcloud" />
                  <input
                    type="text"
                    value={scInput}
                    onChange={e => setScInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTrack('sc')}
                    placeholder="https://soundcloud.com/artist/track"
                    className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 text-white text-[10px] px-2.5 py-1.5 placeholder-gray-700
                      focus:outline-none focus:border-amber-500/40"
                  />
                  <button
                    onClick={() => handleAddTrack('sc')}
                    disabled={!scInput.trim() || addingTrack === 'sc'}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/15 text-gray-400
                      hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 shrink-0"
                  >
                    {addingTrack === 'sc' ? '…' : '+ Add'}
                  </button>
                  <button
                    onClick={() => handleCrawl('soundcloud')}
                    disabled={!!crawling || !form.soundcloud_url}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/10 text-gray-600
                      hover:border-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-30 shrink-0"
                    title={form.soundcloud_url ? 'Crawl SC artist page' : 'Chưa có SC URL'}
                  >
                    {crawling === 'soundcloud' ? '…' : '↻ Crawl'}
                  </button>
                </div>

                {/* YouTube row */}
                <div className="flex items-center gap-2">
                  <SourceBadge source="youtube" />
                  <span className="flex-1 text-[10px] text-gray-700 truncate font-mono">
                    {form.youtube_url || '— chưa có YT URL'}
                  </span>
                  <button
                    onClick={() => handleCrawl('youtube')}
                    disabled={!!crawling || !form.youtube_url}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/10 text-gray-600
                      hover:border-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-30 shrink-0"
                    title={form.youtube_url ? 'Crawl YouTube channel' : 'Chưa có YT URL'}
                  >
                    {crawling === 'youtube' ? '…' : '↻ Crawl'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
      <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className={cls} />
        : <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}
