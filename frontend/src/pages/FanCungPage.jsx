import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchAllArtists, fetchPlaylists, adminListArtists, adminUpdateArtist } from '../api'
import { useAuth } from '../auth/AuthContext'
import LoginButton from '../auth/LoginButton'
import GameScreen from '../screens/GameScreen'
import ArtistModal from '../components/admin/ArtistModal'
import PlaylistModal from '../components/admin/PlaylistModal'
import NeedsUrlPanel from '../components/admin/NeedsUrlPanel'
import AddTrackModal from '../components/admin/AddTrackModal'
import AdBanner from '../components/AdBanner'

// ── Utility ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(/[\s\-_]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function getColor(id) {
  const hue = (id * 137.508) % 360
  return `hsl(${hue}, 55%, 22%)`
}

// ── Regular play card ─────────────────────────────────────────────────────────

function ArtistCard({ artist, selected, onClick, onEdit, onAddTrack, isAdmin, sizeCls = 'w-24 shrink-0' }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 group text-left
        ${sizeCls} border-2
        ${selected
          ? 'border-amber-400 shadow-[4px_4px_0_#F59E0B]'
          : 'border-white/15 hover:border-white/50 hover:shadow-[3px_3px_0_rgba(255,255,255,0.15)]'
        }
      `}
    >
      <div className="w-full aspect-square relative overflow-hidden" style={{ background: getColor(artist.id) }}>
        {artist.avatar_url ? (
          <img src={artist.avatar_url} alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-black text-white/20 select-none">{getInitials(artist.name)}</span>
          </div>
        )}
        {selected && <div className="absolute inset-0 bg-amber-400/15 pointer-events-none" />}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 flex items-center justify-center">
            <span className="text-[10px] text-black font-black leading-none">✓</span>
          </div>
        )}
        {artist.needs_manual_url && (
          <div className="absolute top-1 left-1 bg-red-500 px-1 py-px">
            <span className="text-[8px] font-black text-white">!</span>
          </div>
        )}
      </div>
      <div className={`px-1.5 py-1 shrink-0 border-t-2 ${selected ? 'border-amber-400 bg-amber-950/40' : 'border-white/10 bg-[#111]'}`}>
        <p className={`text-[9px] font-black leading-tight truncate uppercase ${selected ? 'text-amber-300' : 'text-gray-400'}`}>
          {artist.name}
        </p>
        {artist.genre && <p className="text-[8px] text-gray-600 truncate">{artist.genre}</p>}
      </div>
      {isAdmin && (
        <>
          <button onClick={e => { e.stopPropagation(); onEdit?.() }}
            className="absolute top-1 left-1 w-5 h-5 bg-black/80 border border-white/30 text-white text-[9px] font-black
              opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-amber-500 hover:border-amber-500">
            ✎
          </button>
          <button onClick={e => { e.stopPropagation(); onAddTrack?.() }}
            className="absolute top-1 left-7 w-5 h-5 bg-black/80 border border-white/30 text-white text-[9px] font-black
              opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-green-600 hover:border-green-500">
            +
          </button>
        </>
      )}
    </button>
  )
}

// ── Admin review card ─────────────────────────────────────────────────────────

function AdminArtistCard({ artist, selected, onSelect, onEdit }) {
  const tc = artist.track_count ?? 0
  const isHidden = !artist.visible
  const isExcluded = !artist.in_random
  const isEmpty = tc === 0

  let borderColor = 'rgba(255,255,255,0.12)'
  let boxShadow = 'none'
  if (selected)       { borderColor = '#F59E0B'; boxShadow = '3px 3px 0 #F59E0B' }
  else if (isHidden)  { borderColor = 'rgba(239,68,68,0.55)' }
  else if (isExcluded){ borderColor = 'rgba(249,115,22,0.5)' }
  else if (isEmpty)   { borderColor = 'rgba(255,255,255,0.06)' }

  return (
    <button
      onClick={() => onSelect(artist.id)}
      className="relative flex flex-col w-full overflow-hidden cursor-pointer group text-left border-2 transition-all duration-75"
      style={{ borderColor, boxShadow }}
    >
      {/* Photo */}
      <div className="w-full aspect-square relative overflow-hidden" style={{ background: getColor(artist.id) }}>
        {artist.avatar_url
          ? <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white/15 select-none">{getInitials(artist.name)}</span>
        }
        {/* State overlays */}
        {isHidden  && <div className="absolute inset-0 bg-red-500/25 pointer-events-none" />}
        {isExcluded && !isHidden && <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" />}
        {/* Selected checkmark */}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 flex items-center justify-center">
            <span className="text-[10px] text-black font-black">✓</span>
          </div>
        )}
        {/* Needs URL badge */}
        {artist.needs_manual_url && (
          <div className="absolute top-1 left-1 w-4 h-4 bg-yellow-400 flex items-center justify-center">
            <span className="text-[8px] text-black font-black">!</span>
          </div>
        )}
      </div>

      {/* Name label */}
      <div className={`px-1.5 py-1 border-t ${selected ? 'bg-amber-950/30 border-amber-400/40' : 'bg-[#111] border-white/8'}`}>
        <p className={`text-[9px] font-black uppercase truncate leading-tight ${isHidden ? 'text-gray-600' : selected ? 'text-amber-300' : 'text-gray-400'}`}>
          {artist.name}
        </p>
      </div>

      {/* Status strip */}
      <div className="px-1.5 py-0.5 bg-[#0a0a0a] border-t border-white/5 flex items-center gap-1">
        {/* Track count */}
        <span className={`text-[8px] font-black tabular-nums leading-none
          ${tc > 5 ? 'text-gray-600' : tc > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
          {tc}
        </span>
        {/* State dots */}
        <div className="flex gap-0.5 ml-auto items-center">
          <div
            className="w-2 h-2 shrink-0"
            style={{ backgroundColor: artist.visible ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.8)' }}
            title={artist.visible ? 'Đang hiển thị' : 'Đang ẩn'}
          />
          <div
            className="w-2 h-2 shrink-0"
            style={{ backgroundColor: artist.in_random ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.8)' }}
            title={artist.in_random ? 'Trong Ngẫu Nhiên' : 'Ngoài Ngẫu Nhiên'}
          />
        </div>
      </div>

      {/* Edit button on hover */}
      <button
        onClick={e => { e.stopPropagation(); onEdit() }}
        className="absolute bottom-[26px] right-0.5 opacity-0 group-hover:opacity-100 w-5 h-5 bg-black/90 border border-white/20 text-white text-[9px]
          font-black transition-opacity flex items-center justify-center hover:bg-amber-500 hover:border-amber-500"
        title="Sửa"
      >
        ✎
      </button>
    </button>
  )
}

// ── Admin filter chips ────────────────────────────────────────────────────────

const ADMIN_FILTERS = [
  { id: 'all',       label: 'Tất cả',       color: 'text-gray-400' },
  { id: 'hidden',    label: 'Đang ẩn',       color: 'text-red-400' },
  { id: 'no_random', label: 'Ngoài Random',  color: 'text-orange-400' },
  { id: 'no_tracks', label: 'Chưa có bài',   color: 'text-yellow-500' },
  { id: 'needs_url', label: 'Cần URL',       color: 'text-pink-400' },
]

function AdminFilterBar({ value, onChange, counts }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ADMIN_FILTERS.map(f => {
        const count = counts[f.id] ?? 0
        const active = value === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`text-[9px] font-black uppercase tracking-wide px-2 py-1 border-2 transition-colors
              ${active
                ? `border-white/40 bg-white/8 ${f.color}`
                : 'border-white/8 text-gray-700 hover:border-white/20 hover:text-gray-500'
              }`}
          >
            {f.label}
            {f.id !== 'all' && count > 0 && (
              <span className={`ml-1.5 text-[8px] ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Playlist card ─────────────────────────────────────────────────────────────

function PlaylistCard({ playlist, selected, onClick, onEdit, isAdmin }) {
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a1a', '#1e1b2e']
  const bg = colors[playlist.id % colors.length]
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 group text-left shrink-0 w-28 border-2
        ${selected ? 'border-amber-400 shadow-[4px_4px_0_#F59E0B]' : 'border-white/15 hover:border-white/50 hover:shadow-[3px_3px_0_rgba(255,255,255,0.15)]'}`}
    >
      <div className="w-28 h-20 relative overflow-hidden flex items-center justify-center" style={{ background: bg }}>
        {playlist.cover_url
          ? <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-3xl opacity-30">♪</span>
        }
        {selected && <div className="absolute inset-0 bg-amber-400/15 pointer-events-none" />}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 flex items-center justify-center">
            <span className="text-[10px] text-black font-black leading-none">✓</span>
          </div>
        )}
      </div>
      <div className={`px-1.5 py-1.5 shrink-0 border-t-2 ${selected ? 'border-amber-400 bg-amber-950/40' : 'border-white/10 bg-[#111]'}`}>
        <p className={`text-[9px] font-black leading-tight uppercase truncate ${selected ? 'text-amber-300' : 'text-gray-400'}`}>{playlist.name}</p>
        <p className="text-[8px] text-gray-600">{playlist.track_count ?? 0} bài</p>
      </div>
      {isAdmin && (
        <button onClick={e => { e.stopPropagation(); onEdit?.() }}
          className="absolute top-1 left-1 w-5 h-5 bg-black/80 border border-white/30 text-white text-[9px] font-black
            opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-amber-500 hover:border-amber-500">
          ✎
        </button>
      )}
    </button>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, action }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-6">
      <span className="text-[9px] font-black tracking-[0.35em] uppercase text-amber-400">✦ {label}</span>
      <div className="flex-1 h-px bg-white/6" />
      {action}
    </div>
  )
}

// ── Genre filter bar ─────────────────────────────────────────────────────────

const GENRE_FILTERS = [
  { id: 'all',    label: 'Tất cả' },
  { id: 'pop',    label: 'Pop' },
  { id: 'hiphop', label: 'Hip-Hop & Rap' },
]

function GenreFilterBar({ value, onChange }) {
  return (
    <div className="flex gap-1.5 px-6 mb-3">
      {GENRE_FILTERS.map(g => (
        <button key={g.id} onClick={() => onChange(g.id)}
          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-2 transition-colors
            ${value === g.id
              ? 'border-amber-400 bg-amber-400/15 text-amber-300'
              : 'border-white/10 text-gray-600 hover:border-white/25 hover:text-gray-400'
            }`}>
          {g.label}
        </button>
      ))}
    </div>
  )
}

// ── Artist grid (regular) ─────────────────────────────────────────────────────

const ONE_ROW_H = 136

function ArtistGrid({ artists, loading, selectedArtistIds, toggleArtist, setArtistModal, isAdmin }) {
  const [expanded, setExpanded] = useState(false)
  const gridRef = useRef(null)
  const [fullHeight, setFullHeight] = useState(ONE_ROW_H)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFullHeight(el.scrollHeight))
    ro.observe(el)
    setFullHeight(el.scrollHeight)
    return () => ro.disconnect()
  }, [])

  const needsToggle = !loading && fullHeight > ONE_ROW_H + 8

  return (
    <div className="mb-4">
      <SectionHeader
        label="Nghệ sĩ"
        action={needsToggle && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-[9px] font-black uppercase tracking-widest text-gray-500
              hover:text-white border border-white/15 hover:border-white/40 px-2 py-0.5 transition-colors shrink-0">
            {expanded ? 'Ẩn bớt ▲' : `Tất cả (${artists.length}) ▼`}
          </button>
        )}
      />
      <div className="px-6 overflow-hidden"
        style={{ maxHeight: expanded ? `${fullHeight}px` : `${ONE_ROW_H}px`, transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div ref={gridRef} className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 animate-pulse border-2 border-white/5" />
            ))
          ) : artists.length === 0 ? (
            <p className="text-gray-600 text-xs italic col-span-full">Chưa có nghệ sĩ nào</p>
          ) : (
            artists.map(a => (
              <ArtistCard
                key={a.id} artist={a}
                selected={selectedArtistIds.has(a.id)}
                onClick={() => toggleArtist(a.id)}
                onEdit={() => setArtistModal({ artist: a })}
                isAdmin={isAdmin}
                sizeCls="w-full"
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Admin review grid (flat, all artists) ─────────────────────────────────────

function AdminArtistGrid({ artists, loading, selectedIds, onSelect, onEdit }) {
  if (loading) return (
    <div className="px-6 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="aspect-square bg-white/5 animate-pulse border border-white/5" />
      ))}
    </div>
  )
  if (artists.length === 0) return (
    <p className="px-6 text-gray-600 text-xs italic py-4">Không có nghệ sĩ nào khớp</p>
  )
  return (
    <div className="px-6 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
      {artists.map(a => (
        <AdminArtistCard
          key={a.id} artist={a}
          selected={selectedIds.has(a.id)}
          onSelect={onSelect}
          onEdit={() => onEdit(a)}
        />
      ))}
    </div>
  )
}

// ── Horizontal scroll section ─────────────────────────────────────────────────

function ScrollSection({ label, children }) {
  return (
    <div className="mb-4">
      <SectionHeader label={label} />
      <div className="flex gap-2 overflow-x-auto pb-2 px-6" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FanCungPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_admin

  const [step, setStep] = useState('pick')

  // Regular data
  const [artists, setArtists] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loadingArtists, setLoadingArtists] = useState(true)
  const [loadingPlaylists, setLoadingPlaylists] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef(null)

  // Genre filter (regular mode)
  const [genreFilter, setGenreFilter] = useState('all')

  // Selection (regular mode)
  const [selectedArtistIds, setSelectedArtistIds] = useState(new Set())
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState(new Set())

  // Admin modals
  const [artistModal, setArtistModal] = useState(null)
  const [playlistModal, setPlaylistModal] = useState(null)
  const [addTrackModal, setAddTrackModal] = useState(null)
  const [showNeedsUrl, setShowNeedsUrl] = useState(false)

  // ── Admin edit mode ──
  const [adminMode, setAdminMode] = useState(false)
  const [adminArtists, setAdminArtists] = useState([])
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [adminSelectedIds, setAdminSelectedIds] = useState(new Set())
  const [adminFilter, setAdminFilter] = useState('all')
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchMsg, setBatchMsg] = useState('')

  // Load data
  const loadArtists = useCallback(async (q = '') => {
    setLoadingArtists(true)
    try { setArtists(await fetchAllArtists({ search: q })) }
    catch { setArtists([]) }
    setLoadingArtists(false)
  }, [])

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true)
    try { setPlaylists(await fetchPlaylists()) }
    catch { setPlaylists([]) }
    setLoadingPlaylists(false)
  }, [])

  const loadAdminArtists = useCallback(async () => {
    setLoadingAdmin(true)
    try { setAdminArtists(await adminListArtists()) }
    catch { setAdminArtists([]) }
    setLoadingAdmin(false)
  }, [])

  useEffect(() => { loadArtists(); loadPlaylists() }, []) // eslint-disable-line

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  const matchedArtists = debouncedQuery
    ? artists.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : []
  const matchedPlaylists = debouncedQuery
    ? playlists.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : []

  const genreFilteredArtists = genreFilter === 'all'
    ? artists
    : artists.filter(a => {
        const g = (a.genre || '').toLowerCase()
        if (genreFilter === 'pop') return g.includes('pop')
        if (genreFilter === 'hiphop') return g.includes('hip') || g.includes('rap')
        return true
      })

  const toggleArtist = (id) => setSelectedArtistIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togglePlaylist = (id) => setSelectedPlaylistIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const totalSelected = selectedArtistIds.size + selectedPlaylistIds.size
  const canPlay = totalSelected > 0

  // ── Admin mode logic ──
  const enterAdminMode = () => {
    setAdminMode(true)
    setAdminSelectedIds(new Set())
    setAdminFilter('all')
    loadAdminArtists()
  }
  const exitAdminMode = () => {
    setAdminMode(false)
    setAdminSelectedIds(new Set())
    setBatchMsg('')
    loadArtists()
  }

  const toggleAdminSelect = (id) => setAdminSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Compute filtered admin list
  const filteredAdminArtists = (() => {
    let list = adminArtists
    if (debouncedQuery) list = list.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    if (adminFilter === 'hidden')    return list.filter(a => !a.visible)
    if (adminFilter === 'no_random') return list.filter(a => !a.in_random)
    if (adminFilter === 'no_tracks') return list.filter(a => (a.track_count || 0) === 0)
    if (adminFilter === 'needs_url') return list.filter(a => a.needs_manual_url)
    return list
  })()

  const adminStats = {
    all: adminArtists.length,
    hidden: adminArtists.filter(a => !a.visible).length,
    no_random: adminArtists.filter(a => !a.in_random).length,
    no_tracks: adminArtists.filter(a => (a.track_count || 0) === 0).length,
    needs_url: adminArtists.filter(a => a.needs_manual_url).length,
  }

  const selectAll = () => setAdminSelectedIds(new Set(filteredAdminArtists.map(a => a.id)))
  const clearSelection = () => setAdminSelectedIds(new Set())

  const batchUpdate = async (updates) => {
    const ids = [...adminSelectedIds]
    if (!ids.length) return
    setBatchSaving(true); setBatchMsg('')
    try {
      await Promise.all(ids.map(id => adminUpdateArtist(id, updates)))
      await loadAdminArtists()
      setAdminSelectedIds(new Set())
      const keys = Object.keys(updates)
      setBatchMsg(`✓ Đã cập nhật ${ids.length} nghệ sĩ`)
      setTimeout(() => setBatchMsg(''), 3000)
    } catch { setBatchMsg('Lỗi cập nhật') }
    setBatchSaving(false)
  }

  if (step === 'playing') {
    return (
      <div className="flex flex-col items-center min-h-full p-5">
        <div className="flex-1 flex items-center justify-center w-full">
          <GameScreen
            artistIds={[...selectedArtistIds]}
            playlistIds={[...selectedPlaylistIds]}
            onBack={() => setStep('pick')}
          />
        </div>
        <AdBanner slot="REPLACE_WITH_SLOT_ID" className="w-full max-w-xl mt-4" />
      </div>
    )
  }

  return (
    <div className="h-full bg-[#0A0A0A] flex overflow-hidden">

      {/* ── Main content area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 border-b-2 border-white/8 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-4 h-px bg-amber-500" />
              <span className="text-amber-500 text-[9px] font-black tracking-[0.4em] uppercase">Chế độ</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #FF006E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fan Cứng
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !adminMode && (
              <>
                <button onClick={() => setShowNeedsUrl(true)}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/50 text-red-400
                    hover:bg-red-500/10 px-2 py-1 transition-colors">
                  ⚠ URL
                </button>
                <button onClick={() => setPlaylistModal('create')}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-white/20 text-gray-400
                    hover:border-amber-400 hover:text-amber-400 px-2 py-1 transition-colors">
                  + Danh sách
                </button>
                <button onClick={() => setArtistModal('create')}
                  className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 text-amber-400 bg-amber-400/10
                    hover:bg-amber-400 hover:text-black px-2 py-1 transition-colors">
                  + Nghệ sĩ
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={adminMode ? exitAdminMode : enterAdminMode}
                className={`text-[9px] font-black uppercase tracking-widest border-2 px-2 py-1 transition-all
                  ${adminMode
                    ? 'border-amber-400 bg-amber-400 text-black shadow-[2px_2px_0_rgba(255,255,255,0.3)]'
                    : 'border-white/20 text-gray-500 hover:border-amber-400/50 hover:text-amber-500'
                  }`}
              >
                {adminMode ? '✕ Thoát' : '✎ Quản lý'}
              </button>
            )}
            <LoginButton />
          </div>
        </div>

        {/* Search bar */}
        <div className="shrink-0 px-6 py-3 border-b-2 border-white/5">
          <div className="relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={adminMode ? 'Tìm nghệ sĩ...' : 'Tìm nghệ sĩ hoặc danh sách...'}
              className="w-full bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
                px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm">✕</button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm select-none">⌕</span>
            )}
          </div>
        </div>

        {/* ── Admin mode content ── */}
        {adminMode ? (
          <div className="flex-1 overflow-y-auto py-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {/* Admin mode label */}
            <div className="px-6 mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-amber-400/20" />
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-amber-400/60">
                Mode: Quản lý — {filteredAdminArtists.length} / {adminArtists.length} nghệ sĩ
              </span>
              <div className="h-px flex-1 bg-amber-400/20" />
            </div>
            <AdminArtistGrid
              artists={filteredAdminArtists}
              loading={loadingAdmin}
              selectedIds={adminSelectedIds}
              onSelect={toggleAdminSelect}
              onEdit={(a) => setArtistModal({ artist: a })}
            />
          </div>
        ) : (
          /* ── Regular user content ── */
          <div className="flex-1 overflow-y-auto py-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {/* Search results */}
            {debouncedQuery && (matchedArtists.length > 0 || matchedPlaylists.length > 0) && (
              <ScrollSection label="Đề xuất">
                {matchedArtists.map(a => (
                  <ArtistCard key={`a-${a.id}`} artist={a}
                    selected={selectedArtistIds.has(a.id)} onClick={() => toggleArtist(a.id)}
                    onEdit={() => setArtistModal({ artist: a })} onAddTrack={() => setAddTrackModal(a)}
                    isAdmin={isAdmin} />
                ))}
                {matchedPlaylists.map(p => (
                  <PlaylistCard key={`p-${p.id}`} playlist={p}
                    selected={selectedPlaylistIds.has(p.id)} onClick={() => togglePlaylist(p.id)}
                    onEdit={() => setPlaylistModal({ playlist: p })} isAdmin={isAdmin} />
                ))}
              </ScrollSection>
            )}

            {!debouncedQuery && <GenreFilterBar value={genreFilter} onChange={setGenreFilter} />}
            <ArtistGrid
              artists={debouncedQuery ? artists : genreFilteredArtists}
              loading={loadingArtists}
              selectedArtistIds={selectedArtistIds}
              toggleArtist={toggleArtist}
              setArtistModal={setArtistModal}
              isAdmin={isAdmin}
            />

            <ScrollSection label="Danh Sách">
              {loadingPlaylists ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-28 h-28 bg-white/5 animate-pulse shrink-0 border-2 border-white/5" />
                ))
              ) : playlists.length === 0 ? (
                <p className="text-gray-600 text-xs italic">
                  {isAdmin ? 'Tạo danh sách đầu tiên →' : 'Chưa có danh sách nào'}
                </p>
              ) : playlists.map(p => (
                <PlaylistCard key={p.id} playlist={p}
                  selected={selectedPlaylistIds.has(p.id)} onClick={() => togglePlaylist(p.id)}
                  onEdit={() => setPlaylistModal({ playlist: p })} isAdmin={isAdmin} />
              ))}
            </ScrollSection>
          </div>
        )}
      </div>

      {/* ── Right Sidebar ── */}
      <div className="w-60 shrink-0 border-l-2 border-white/8 bg-[#0A0A0A] flex flex-col">

        {adminMode ? (
          /* ── Admin sidebar ── */
          <>
            <div className="shrink-0 px-4 py-3 border-b-2 border-amber-400/20 bg-amber-400/5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black tracking-[0.3em] uppercase text-amber-400">Quản lý</span>
                {batchSaving && <span className="text-[8px] text-amber-400 animate-pulse">đang lưu...</span>}
              </div>
              {batchMsg && <p className="text-[9px] text-green-400 font-bold mt-1">{batchMsg}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>

              {/* Stats */}
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.35em] text-gray-600 mb-2">Thống kê</p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: 'Tổng nghệ sĩ', val: adminStats.all, color: 'text-gray-400' },
                    { label: 'Đang hiển thị', val: adminStats.all - adminStats.hidden, color: 'text-green-500' },
                    { label: 'Đang ẩn', val: adminStats.hidden, color: adminStats.hidden > 0 ? 'text-red-400' : 'text-gray-700' },
                    { label: 'Trong Random', val: adminStats.all - adminStats.no_random, color: 'text-green-500' },
                    { label: 'Ngoài Random', val: adminStats.no_random, color: adminStats.no_random > 0 ? 'text-orange-400' : 'text-gray-700' },
                    { label: 'Chưa đủ bài', val: adminStats.no_tracks, color: adminStats.no_tracks > 0 ? 'text-yellow-500' : 'text-gray-700' },
                    { label: 'Cần URL', val: adminStats.needs_url, color: adminStats.needs_url > 0 ? 'text-pink-400' : 'text-gray-700' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-600">{s.label}</span>
                      <span className={`text-[9px] font-black tabular-nums ${s.color}`}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter */}
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.35em] text-gray-600 mb-2">Lọc</p>
                <AdminFilterBar value={adminFilter} onChange={setAdminFilter} counts={adminStats} />
              </div>

              {/* Legend */}
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.35em] text-gray-600 mb-2">Chú thích</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { squares: ['bg-green-500/60', 'bg-green-500/40'], label: 'Hiển thị + Trong Random' },
                    { squares: ['bg-red-500/80', null], label: 'Đang ẩn' },
                    { squares: [null, 'bg-orange-500/80'], label: 'Ngoài Ngẫu Nhiên' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex gap-0.5 shrink-0">
                        <div className={`w-2 h-2 border border-white/10 ${row.squares[0] || 'bg-transparent'}`} />
                        <div className={`w-2 h-2 border border-white/10 ${row.squares[1] || 'bg-transparent'}`} />
                      </div>
                      <span className="text-[8px] text-gray-600">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Batch actions */}
            <div className="shrink-0 border-t-2 border-white/8 p-4 flex flex-col gap-2">
              {/* Selected count */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide">
                  {adminSelectedIds.size > 0 ? `${adminSelectedIds.size} đã chọn` : 'Chưa chọn'}
                </span>
                <div className="flex gap-1">
                  <button onClick={selectAll}
                    className="text-[8px] font-black uppercase text-gray-600 hover:text-amber-400 transition-colors">
                    Chọn tất cả
                  </button>
                  {adminSelectedIds.size > 0 && (
                    <>
                      <span className="text-gray-700">·</span>
                      <button onClick={clearSelection}
                        className="text-[8px] font-black uppercase text-gray-600 hover:text-white transition-colors">
                        Bỏ
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Visibility batch */}
              <div className="flex gap-1.5">
                <button onClick={() => batchUpdate({ visible: true })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-green-500/40 text-green-500
                    hover:bg-green-500/10 transition-colors disabled:opacity-25">
                  Hiện
                </button>
                <button onClick={() => batchUpdate({ visible: false })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-red-500/40 text-red-500
                    hover:bg-red-500/10 transition-colors disabled:opacity-25">
                  Ẩn
                </button>
              </div>

              {/* Random batch */}
              <div className="flex gap-1.5">
                <button onClick={() => batchUpdate({ in_random: true })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-green-500/40 text-green-500
                    hover:bg-green-500/10 transition-colors disabled:opacity-25">
                  + Random
                </button>
                <button onClick={() => batchUpdate({ in_random: false })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-orange-500/40 text-orange-400
                    hover:bg-orange-500/10 transition-colors disabled:opacity-25">
                  – Random
                </button>
              </div>

              {/* Both off / both on */}
              <div className="flex gap-1.5 pt-1 border-t border-white/8">
                <button onClick={() => batchUpdate({ visible: true, in_random: true })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-amber-400/40 text-amber-400
                    hover:bg-amber-400/10 transition-colors disabled:opacity-25">
                  Bật tất cả
                </button>
                <button onClick={() => batchUpdate({ visible: false, in_random: false })}
                  disabled={adminSelectedIds.size === 0 || batchSaving}
                  className="flex-1 py-1.5 text-[8px] font-black uppercase border-2 border-gray-600/40 text-gray-600
                    hover:bg-white/5 transition-colors disabled:opacity-25">
                  Tắt tất cả
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Regular sidebar ── */
          <>
            <div className="shrink-0 px-4 py-3 border-b-2 border-white/8">
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-gray-500">
                Đã chọn{totalSelected > 0 ? ` — ${totalSelected}` : ''}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
              {totalSelected === 0 ? (
                <p className="text-gray-700 text-[10px] font-medium italic mt-2 leading-relaxed">
                  Chọn nghệ sĩ hoặc danh sách để bắt đầu
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {[...selectedArtistIds].map(id => {
                    const a = artists.find(x => x.id === id)
                    if (!a) return null
                    return (
                      <span key={`chip-a-${id}`}
                        className="flex items-center gap-1.5 border-2 border-amber-400/50 bg-amber-400/10 text-amber-300 px-2 py-1">
                        <span className="text-[9px] font-black uppercase flex-1 truncate">{a.name}</span>
                        <button onClick={() => toggleArtist(id)} className="text-amber-400 hover:text-white text-[10px] leading-none shrink-0">✕</button>
                      </span>
                    )
                  })}
                  {[...selectedPlaylistIds].map(id => {
                    const p = playlists.find(x => x.id === id)
                    if (!p) return null
                    return (
                      <span key={`chip-p-${id}`}
                        className="flex items-center gap-1.5 border-2 border-amber-400/50 bg-amber-400/10 text-amber-300 px-2 py-1">
                        <span className="text-[9px] font-black uppercase flex-1 truncate">♪ {p.name}</span>
                        <button onClick={() => togglePlaylist(id)} className="text-amber-400 hover:text-white text-[10px] leading-none shrink-0">✕</button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 p-4 border-t-2 border-white/8">
              <button onClick={() => setStep('playing')} disabled={!canPlay}
                className="w-full py-3.5 font-black text-xs uppercase tracking-[0.2em] border-2 transition-all duration-75
                  bg-amber-500 border-white text-black
                  hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
                  active:translate-x-0 active:translate-y-0 active:shadow-none
                  disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                {canPlay ? `▶  Chơi (${totalSelected})` : '▶  Chơi'}
              </button>
              {!canPlay && (
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest text-center mt-2">
                  Chọn ít nhất 1 nguồn
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Admin modals ── */}
      {artistModal && (
        <ArtistModal
          artist={artistModal === 'create' ? null : artistModal.artist}
          onClose={() => setArtistModal(null)}
          onSaved={() => {
            setArtistModal(null)
            if (adminMode) loadAdminArtists()
            else loadArtists()
          }}
        />
      )}
      {playlistModal && (
        <PlaylistModal
          playlist={playlistModal === 'create' ? null : playlistModal.playlist}
          onClose={() => setPlaylistModal(null)}
          onSaved={() => { setPlaylistModal(null); loadPlaylists() }}
        />
      )}
      {showNeedsUrl && (
        <NeedsUrlPanel onClose={() => setShowNeedsUrl(false)} onSaved={() => loadArtists()} />
      )}
      {addTrackModal && (
        <AddTrackModal artist={addTrackModal} onClose={() => setAddTrackModal(null)} onSaved={() => loadArtists()} />
      )}
    </div>
  )
}
