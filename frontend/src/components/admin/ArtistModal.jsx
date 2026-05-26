import { useState, useEffect, useCallback } from 'react'
import {
  adminCreateArtist, adminUpdateArtist, adminDeleteArtist,
  adminRecrawlArtist, adminListArtistTracks,
  adminAddArtistTrack, adminUpdateArtistTrack, adminDeleteArtistTrack,
} from '../../api'

const SOURCE_LABEL = { deezer: 'DZ', soundcloud: 'SC', youtube: 'YT', zing: 'ZG' }
const SOURCE_COLOR = {
  deezer:     { bg: '#1db954', text: '#000' },
  soundcloud: { bg: '#ff5500', text: '#fff' },
  youtube:    { bg: '#ff0000', text: '#fff' },
  zing:       { bg: '#8b5cf6', text: '#fff' },
}

function SourceBadge({ source }) {
  const c = SOURCE_COLOR[source] || { bg: '#444', text: '#fff' }
  return (
    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 shrink-0 leading-none"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {SOURCE_LABEL[source] || source}
    </span>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 group w-full text-left"
    >
      <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors
        ${value ? 'border-amber-400 bg-amber-400' : 'border-white/20 bg-transparent'}`}>
        {value && <div className="w-2 h-2 bg-black" />}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wide transition-colors
        ${value ? 'text-amber-300' : 'text-gray-600 group-hover:text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}

function UrlCrawlRow({ label, value, onChange, onCrawl, crawling, crawlDisabled, placeholder }) {
  return (
    <div>
      <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-[#1a1a1a] border-2 border-white/10 text-white text-xs px-3 py-2 placeholder-gray-600
            focus:outline-none focus:border-amber-500/40 transition-colors"
        />
        <button
          onClick={onCrawl}
          disabled={crawlDisabled || crawling}
          title={crawlDisabled ? 'Nhập URL trước' : 'Crawl toàn bộ bài hát'}
          className="text-[9px] font-black uppercase px-2.5 border-2 border-white/15 text-gray-500
            hover:border-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-25 shrink-0"
        >
          {crawling ? '…' : '↻'}
        </button>
      </div>
    </div>
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
    zing_url: artist?.zing_url ?? '',
    visible: artist?.visible ?? true,
    in_random: artist?.in_random ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Track pool ──
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [deletingTrack, setDeletingTrack] = useState(null)

  // ── Inline track edit ──
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', cover_url: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Add single track ──
  const [scInput, setScInput] = useState('')
  const [dzInput, setDzInput] = useState('')
  const [addingTrack, setAddingTrack] = useState(null)
  const [addError, setAddError] = useState('')

  // ── Per-source crawl ──
  const [crawling, setCrawling] = useState(null)
  const [crawlMsg, setCrawlMsg] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setVal = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const loadTracks = useCallback(async () => {
    if (!artist?.id) return
    setLoadingTracks(true)
    try { setTracks(await adminListArtistTracks(artist.id)) }
    catch { setTracks([]) }
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
      const names = { deezer: 'Deezer', soundcloud: 'SoundCloud', youtube: 'YouTube', zing: 'Zing MP3' }
      const name = names[source] || source
      setCrawlMsg(`↻ ${name} đang crawl — reload sau vài phút`)
      setTimeout(() => { setCrawlMsg(''); loadTracks() }, 5000)
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

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ title: t.title, cover_url: t.cover_url || '' })
  }

  const handleSaveTrack = async () => {
    setSavingEdit(true)
    try {
      const updated = await adminUpdateArtistTrack(artist.id, editingId, editForm)
      setTracks(prev => prev.map(t => t.id === editingId ? { ...t, ...updated } : t))
      setEditingId(null)
    } catch (e) { setAddError(e.message) }
    finally { setSavingEdit(false) }
  }

  const handleDeleteTrack = async (trackId) => {
    setDeletingTrack(trackId)
    try { await adminDeleteArtistTrack(artist.id, trackId); await loadTracks() }
    catch (e) { setAddError(e.message) }
    finally { setDeletingTrack(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div
        className="w-full bg-[#0f0f0f] border-2 border-white/15 shadow-[8px_8px_0_rgba(245,158,11,0.2)]"
        style={{ maxWidth: isEdit ? '920px' : '440px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-3.5 shrink-0">
          <h2 className="text-xs font-black uppercase tracking-widest text-white">
            {isEdit ? `Sửa: ${artist.name}` : '+ Nghệ sĩ mới'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-base leading-none">✕</button>
        </div>

        <div className={`flex min-h-0 flex-1 ${isEdit ? 'divide-x-2 divide-white/8' : ''}`}>

          {/* ── Left: Info form ── */}
          <div className={`flex flex-col shrink-0 ${isEdit ? 'w-64' : 'w-full'}`}>
            <div className="p-4 flex flex-col gap-2.5 overflow-y-auto flex-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
              {error && (
                <div className="border-2 border-red-500/50 bg-red-500/10 text-red-400 px-3 py-2 text-[10px] font-bold">{error}</div>
              )}

              <Field label="Tên nghệ sĩ *" value={form.name} onChange={set('name')} placeholder="Sơn Tùng MTP" />
              <Field label="Ảnh đại diện (URL)" value={form.avatar_url} onChange={set('avatar_url')} placeholder="https://..." />
              <Field label="Thể loại" value={form.genre} onChange={set('genre')} placeholder="Pop / Hip-Hop / Indie" />
              <Field label="Mô tả" value={form.description} onChange={set('description')} placeholder="Tiểu sử ngắn..." textarea />

              {/* Source URLs with crawl buttons */}
              {isEdit && (
                <div className="border-t border-white/8 pt-2.5 mt-0.5 flex flex-col gap-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Nguồn crawl</p>
                  <UrlCrawlRow
                    label="SoundCloud URL"
                    value={form.soundcloud_url}
                    onChange={v => setForm(f => ({ ...f, soundcloud_url: v }))}
                    onCrawl={() => handleCrawl('soundcloud')}
                    crawling={crawling === 'soundcloud'}
                    crawlDisabled={!form.soundcloud_url}
                    placeholder="https://soundcloud.com/artist"
                  />
                  <UrlCrawlRow
                    label="YouTube URL"
                    value={form.youtube_url}
                    onChange={v => setForm(f => ({ ...f, youtube_url: v }))}
                    onCrawl={() => handleCrawl('youtube')}
                    crawling={crawling === 'youtube'}
                    crawlDisabled={!form.youtube_url}
                    placeholder="https://youtube.com/@artist"
                  />
                  <UrlCrawlRow
                    label="Zing MP3 URL"
                    value={form.zing_url}
                    onChange={v => setForm(f => ({ ...f, zing_url: v }))}
                    onCrawl={() => handleCrawl('zing')}
                    crawling={crawling === 'zing'}
                    crawlDisabled={!form.zing_url}
                    placeholder="https://zingmp3.vn/nghe-si/son-tung-m-tp"
                  />
                  {crawlMsg && (
                    <p className="text-[9px] text-amber-400 font-bold">{crawlMsg}</p>
                  )}
                </div>
              )}
              {!isEdit && (
                <div className="border-t border-white/8 pt-2.5 mt-0.5 flex flex-col gap-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Nguồn crawl</p>
                  <Field label="SoundCloud URL" value={form.soundcloud_url} onChange={set('soundcloud_url')} placeholder="https://soundcloud.com/artist" />
                  <Field label="YouTube URL" value={form.youtube_url} onChange={set('youtube_url')} placeholder="https://youtube.com/@artist" />
                  <Field label="Zing MP3 URL" value={form.zing_url} onChange={set('zing_url')} placeholder="https://zingmp3.vn/nghe-si/son-tung-m-tp" />
                </div>
              )}

              {/* Visibility toggles */}
              <div className="border-t border-white/8 pt-2.5 mt-0.5 flex flex-col gap-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Hiển thị</p>
                <Toggle label="Hiện trong danh sách nghệ sĩ" value={form.visible} onChange={setVal('visible')} />
                <Toggle label="Xuất hiện trong Ngẫu Nhiên" value={form.in_random} onChange={setVal('in_random')} />
              </div>
            </div>

            {/* Form actions */}
            <div className="border-t-2 border-white/8 px-4 py-3 flex gap-2 justify-between shrink-0">
              {isEdit && (
                <button onClick={handleDelete} disabled={saving}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/40 text-red-400
                    hover:bg-red-500/10 px-3 py-1.5 transition-colors disabled:opacity-40">
                  Xóa
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={onClose}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-white/15 text-gray-500
                    hover:border-white/40 hover:text-white px-3 py-1.5 transition-colors">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 bg-amber-400 text-black
                    hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#fff]
                    active:translate-x-0 active:translate-y-0 active:shadow-none
                    px-4 py-1.5 transition-all duration-75 disabled:opacity-40">
                  {saving ? '...' : isEdit ? 'Lưu' : 'Thêm & Crawl'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Track pool (edit mode only) ── */}
          {isEdit && (
            <div className="flex-1 min-w-0 flex flex-col min-h-0">

              {/* Track pool header */}
              <div className="px-4 py-3 border-b-2 border-white/8 flex items-center gap-3 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">
                  Pool bài hát
                </span>
                {!loadingTracks && (
                  <span className="text-[8px] font-black text-amber-400 border border-amber-400/30 px-1.5 py-0.5">
                    {tracks.length}
                  </span>
                )}
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto min-h-0"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
                {loadingTracks ? (
                  <div className="py-8 text-center text-gray-700 text-[10px] font-bold uppercase tracking-widest">Đang tải...</div>
                ) : tracks.length === 0 ? (
                  <div className="py-8 text-center text-gray-700 text-[10px] font-bold uppercase tracking-widest">Chưa có bài hát</div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {tracks.map(t => (
                      <div key={t.id}>
                        {/* Normal row */}
                        {editingId !== t.id ? (
                          <div className="flex items-center gap-2.5 px-4 py-2 group hover:bg-white/[0.03]">
                            {/* Cover */}
                            <div className="w-8 h-8 shrink-0 bg-[#1a1a1a] overflow-hidden border border-white/8">
                              {t.cover_url
                                ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px]">♪</div>
                              }
                            </div>
                            <SourceBadge source={t.source} />
                            <p className="flex-1 text-[11px] text-gray-300 font-medium truncate">{t.title}</p>
                            {/* Actions (hover) */}
                            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {t.permalink_url && (
                                <a href={t.permalink_url} target="_blank" rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-white text-xs" title="Mở link">↗</a>
                              )}
                              <button onClick={() => startEdit(t)}
                                className="text-gray-600 hover:text-amber-400 text-xs transition-colors" title="Sửa">✎</button>
                              <button
                                onClick={() => handleDeleteTrack(t.id)}
                                disabled={deletingTrack === t.id}
                                className="text-gray-600 hover:text-red-400 text-xs transition-colors disabled:opacity-40"
                                title="Xóa">
                                {deletingTrack === t.id ? '…' : '✕'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Inline edit row */
                          <div className="px-4 py-2.5 bg-white/[0.04] border-l-2 border-amber-400/60">
                            <div className="flex gap-2 mb-2">
                              <div className="w-8 h-8 shrink-0 bg-[#1a1a1a] border border-white/8 overflow-hidden">
                                {editForm.cover_url
                                  ? <img src={editForm.cover_url} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px]">♪</div>
                                }
                              </div>
                              <SourceBadge source={t.source} />
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Tên bài hát"
                                className="flex-1 bg-[#111] border border-amber-400/40 text-white text-xs px-2 py-1 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={editForm.cover_url}
                                onChange={e => setEditForm(f => ({ ...f, cover_url: e.target.value }))}
                                placeholder="Cover URL (https://...)"
                                className="flex-1 bg-[#111] border border-white/10 text-white text-[10px] px-2 py-1 focus:outline-none focus:border-amber-400/40"
                              />
                              <button onClick={handleSaveTrack} disabled={savingEdit}
                                className="text-[9px] font-black uppercase px-2.5 py-1 border-2 border-amber-400 bg-amber-400 text-black
                                  disabled:opacity-40 shrink-0">
                                {savingEdit ? '…' : 'Lưu'}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="text-[9px] font-black uppercase px-2.5 py-1 border border-white/15 text-gray-500
                                  hover:text-white shrink-0">
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add track section */}
              <div className="border-t-2 border-white/8 shrink-0 p-4 flex flex-col gap-2.5">
                {addError && (
                  <div className="border border-red-500/50 bg-red-500/10 text-red-400 px-2.5 py-1.5 text-[10px] font-bold">{addError}</div>
                )}

                {/* Deezer row */}
                <div className="flex items-center gap-1.5">
                  <SourceBadge source="deezer" />
                  <input type="text" value={dzInput} onChange={e => setDzInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTrack('dz')}
                    placeholder="https://www.deezer.com/track/..."
                    className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 text-white text-[10px] px-2.5 py-1.5 placeholder-gray-700
                      focus:outline-none focus:border-amber-500/40" />
                  <button onClick={() => handleAddTrack('dz')} disabled={!dzInput.trim() || addingTrack === 'dz'}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/15 text-gray-400
                      hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 shrink-0">
                    {addingTrack === 'dz' ? '…' : '+ Add'}
                  </button>
                  <button onClick={() => handleCrawl('deezer')} disabled={!!crawling}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/10 text-gray-600
                      hover:border-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-30 shrink-0"
                    title="Crawl Deezer bằng tên nghệ sĩ">
                    {crawling === 'deezer' ? '…' : '↻'}
                  </button>
                </div>

                {/* SoundCloud row */}
                <div className="flex items-center gap-1.5">
                  <SourceBadge source="soundcloud" />
                  <input type="text" value={scInput} onChange={e => setScInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTrack('sc')}
                    placeholder="https://soundcloud.com/artist/track"
                    className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 text-white text-[10px] px-2.5 py-1.5 placeholder-gray-700
                      focus:outline-none focus:border-amber-500/40" />
                  <button onClick={() => handleAddTrack('sc')} disabled={!scInput.trim() || addingTrack === 'sc'}
                    className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-white/15 text-gray-400
                      hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 shrink-0">
                    {addingTrack === 'sc' ? '…' : '+ Add'}
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
