import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchArtists, fetchPlaylists } from '../api'
import { useAuth } from '../auth/AuthContext'
import LoginButton from '../auth/LoginButton'
import GameScreen from '../screens/GameScreen'
import ArtistModal from '../components/admin/ArtistModal'
import PlaylistModal from '../components/admin/PlaylistModal'
import NeedsUrlPanel from '../components/admin/NeedsUrlPanel'

// ── Utility ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(/[\s\-_]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function getColor(id) {
  const hue = (id * 137.508) % 360
  return `hsl(${hue}, 55%, 22%)`
}

// ── Card components ───────────────────────────────────────────────────────────

function ArtistCard({ artist, selected, onClick, onEdit, isAdmin }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 group text-left shrink-0
        w-24 border-2
        ${selected
          ? 'border-amber-400 shadow-[4px_4px_0_#F59E0B]'
          : 'border-white/15 hover:border-white/50 hover:shadow-[3px_3px_0_rgba(255,255,255,0.15)]'
        }
      `}
    >
      {/* Image */}
      <div className="w-24 h-24 relative overflow-hidden" style={{ background: getColor(artist.id) }}>
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
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
      {/* Label */}
      <div className={`px-1.5 py-1 shrink-0 border-t-2 ${selected ? 'border-amber-400 bg-amber-950/40' : 'border-white/10 bg-[#111]'}`}>
        <p className={`text-[9px] font-black leading-tight truncate uppercase ${selected ? 'text-amber-300' : 'text-gray-400'}`}>
          {artist.name}
        </p>
        {artist.genre && (
          <p className="text-[8px] text-gray-600 truncate">{artist.genre}</p>
        )}
      </div>
      {/* Admin edit button */}
      {isAdmin && (
        <button
          onClick={e => { e.stopPropagation(); onEdit?.(artist) }}
          className="absolute top-1 left-1 w-5 h-5 bg-black/80 border border-white/30 text-white text-[9px] font-black
            opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-amber-500 hover:border-amber-500"
        >
          ✎
        </button>
      )}
    </button>
  )
}

function PlaylistCard({ playlist, selected, onClick, onEdit, isAdmin }) {
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a1a', '#1e1b2e']
  const bg = colors[playlist.id % colors.length]

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 group text-left shrink-0
        w-28 border-2
        ${selected
          ? 'border-amber-400 shadow-[4px_4px_0_#F59E0B]'
          : 'border-white/15 hover:border-white/50 hover:shadow-[3px_3px_0_rgba(255,255,255,0.15)]'
        }
      `}
    >
      <div className="w-28 h-20 relative overflow-hidden flex items-center justify-center" style={{ background: bg }}>
        {playlist.cover_url ? (
          <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-3xl opacity-30">♪</span>
        )}
        {selected && <div className="absolute inset-0 bg-amber-400/15 pointer-events-none" />}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 flex items-center justify-center">
            <span className="text-[10px] text-black font-black leading-none">✓</span>
          </div>
        )}
      </div>
      <div className={`px-1.5 py-1.5 shrink-0 border-t-2 ${selected ? 'border-amber-400 bg-amber-950/40' : 'border-white/10 bg-[#111]'}`}>
        <p className={`text-[9px] font-black leading-tight uppercase truncate ${selected ? 'text-amber-300' : 'text-gray-400'}`}>
          {playlist.name}
        </p>
        <p className="text-[8px] text-gray-600">{playlist.track_count ?? 0} bài</p>
      </div>
      {isAdmin && (
        <button
          onClick={e => { e.stopPropagation(); onEdit?.(playlist) }}
          className="absolute top-1 left-1 w-5 h-5 bg-black/80 border border-white/30 text-white text-[9px] font-black
            opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-amber-500 hover:border-amber-500"
        >
          ✎
        </button>
      )}
    </button>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function SectionRow({ label, children, expandable, expandLabel = 'Tất cả', collapseLabel = 'Ẩn bớt', extraContent }) {
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef(null)

  return (
    <div className="mb-1">
      {/* Row header */}
      <div className="flex items-center gap-3 mb-2 px-6">
        <div className="w-3 h-3 bg-amber-400 shrink-0" />
        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-amber-400">{label}</span>
        <div className="flex-1 h-px bg-white/8" />
        {expandable && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[9px] font-black uppercase tracking-widest text-gray-500
              hover:text-white border border-white/15 hover:border-white/40 px-2 py-0.5 transition-colors shrink-0"
          >
            {expanded ? collapseLabel : expandLabel} {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {/* Expanded grid */}
      {expandable && expanded && extraContent && (
        <div className="mx-6 mt-2 mb-1 border-2 border-white/10 p-3 bg-[#0f0f0f]">
          <div className="flex flex-wrap gap-2">
            {extraContent}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FanCungPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_admin

  const [step, setStep] = useState('pick') // 'pick' | 'playing'

  // Data
  const [artists, setArtists] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loadingArtists, setLoadingArtists] = useState(true)
  const [loadingPlaylists, setLoadingPlaylists] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef(null)

  // Selection
  const [selectedArtistIds, setSelectedArtistIds] = useState(new Set())
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState(new Set())

  // Admin modals
  const [artistModal, setArtistModal] = useState(null)   // null | 'create' | { artist }
  const [playlistModal, setPlaylistModal] = useState(null)
  const [showNeedsUrl, setShowNeedsUrl] = useState(false)

  // Load data
  const loadArtists = useCallback(async (q = '') => {
    setLoadingArtists(true)
    try {
      const data = await fetchArtists({ search: q, limit: 200 })
      setArtists(data)
    } catch { setArtists([]) }
    setLoadingArtists(false)
  }, [])

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true)
    try {
      const data = await fetchPlaylists()
      setPlaylists(data)
    } catch { setPlaylists([]) }
    setLoadingPlaylists(false)
  }, [])

  useEffect(() => { loadArtists(); loadPlaylists() }, []) // eslint-disable-line

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // Filter for search results
  const matchedArtists = debouncedQuery
    ? artists.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : []
  const matchedPlaylists = debouncedQuery
    ? playlists.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : []

  const toggleArtist = (id) => {
    setSelectedArtistIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const togglePlaylist = (id) => {
    setSelectedPlaylistIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalSelected = selectedArtistIds.size + selectedPlaylistIds.size
  const canPlay = totalSelected > 0

  // Visible artists in main row (first 10), rest go in expanded dropdown
  const visibleArtists = artists.slice(0, 10)
  const hiddenArtists = artists.slice(10)

  if (step === 'playing') {
    return (
      <div className="flex items-center justify-center min-h-full p-5">
        <GameScreen
          artistIds={[...selectedArtistIds]}
          playlistIds={[...selectedPlaylistIds]}
          onBack={() => setStep('pick')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#0A0A0A] flex flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 border-b-2 border-white/8 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-4 h-px bg-amber-500" />
            <span className="text-amber-500 text-[9px] font-black tracking-[0.4em] uppercase">Chế độ</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-none">
            Fan <span className="text-amber-400">Cứng</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {/* Warning badge for artists needing URL */}
              <button
                onClick={() => setShowNeedsUrl(true)}
                className="text-[9px] font-black uppercase tracking-widest border-2 border-red-500/50 text-red-400
                  hover:bg-red-500/10 px-2 py-1 transition-colors"
              >
                ⚠ URL
              </button>
              <button
                onClick={() => setPlaylistModal('create')}
                className="text-[9px] font-black uppercase tracking-widest border-2 border-white/20 text-gray-400
                  hover:border-amber-400 hover:text-amber-400 px-2 py-1 transition-colors"
              >
                + Danh sách
              </button>
              <button
                onClick={() => setArtistModal('create')}
                className="text-[9px] font-black uppercase tracking-widest border-2 border-amber-400 text-amber-400 bg-amber-400/10
                  hover:bg-amber-400 hover:text-black px-2 py-1 transition-colors"
              >
                + Nghệ sĩ
              </button>
            </>
          )}
          <LoginButton />
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 px-6 py-3 border-b-2 border-white/5">
        <div className="relative max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm nghệ sĩ hoặc danh sách..."
            className="w-full bg-[#111] border-2 border-white/15 text-white placeholder-gray-600
              px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm select-none">⌕</span>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {/* Đề xuất row — only when searching */}
        {debouncedQuery && (matchedArtists.length > 0 || matchedPlaylists.length > 0) && (
          <SectionRow label="Đề xuất">
            {matchedArtists.map(a => (
              <ArtistCard
                key={`a-${a.id}`}
                artist={a}
                selected={selectedArtistIds.has(a.id)}
                onClick={() => toggleArtist(a.id)}
                onEdit={a => setArtistModal({ artist: a })}
                isAdmin={isAdmin}
              />
            ))}
            {matchedPlaylists.map(p => (
              <PlaylistCard
                key={`p-${p.id}`}
                playlist={p}
                selected={selectedPlaylistIds.has(p.id)}
                onClick={() => togglePlaylist(p.id)}
                onEdit={p => setPlaylistModal({ playlist: p })}
                isAdmin={isAdmin}
              />
            ))}
          </SectionRow>
        )}

        {/* Nghệ sĩ row */}
        <SectionRow
          label="Nghệ sĩ"
          expandable={hiddenArtists.length > 0}
          expandLabel="Tất cả"
          collapseLabel="Ẩn bớt"
          extraContent={hiddenArtists.map(a => (
            <ArtistCard
              key={a.id}
              artist={a}
              selected={selectedArtistIds.has(a.id)}
              onClick={() => toggleArtist(a.id)}
              onEdit={a => setArtistModal({ artist: a })}
              isAdmin={isAdmin}
            />
          ))}
        >
          {loadingArtists ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-24 h-32 bg-white/5 animate-pulse shrink-0 border-2 border-white/5" />
            ))
          ) : visibleArtists.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Chưa có nghệ sĩ nào</p>
          ) : (
            visibleArtists.map(a => (
              <ArtistCard
                key={a.id}
                artist={a}
                selected={selectedArtistIds.has(a.id)}
                onClick={() => toggleArtist(a.id)}
                onEdit={a => setArtistModal({ artist: a })}
                isAdmin={isAdmin}
              />
            ))
          )}
        </SectionRow>

        {/* Danh Sách row */}
        <SectionRow label="Danh Sách">
          {loadingPlaylists ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-28 h-28 bg-white/5 animate-pulse shrink-0 border-2 border-white/5" />
            ))
          ) : playlists.length === 0 ? (
            <p className="text-gray-600 text-xs italic">
              {isAdmin ? 'Tạo danh sách đầu tiên →' : 'Chưa có danh sách nào'}
            </p>
          ) : (
            playlists.map(p => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                selected={selectedPlaylistIds.has(p.id)}
                onClick={() => togglePlaylist(p.id)}
                onEdit={p => setPlaylistModal({ playlist: p })}
                isAdmin={isAdmin}
              />
            ))
          )}
        </SectionRow>
      </div>

      {/* ── Footer: selected chips + play button ── */}
      <div className="shrink-0 border-t-2 border-white/8 bg-[#0A0A0A] px-6 py-4">
        {/* Selected chips */}
        {totalSelected > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[...selectedArtistIds].map(id => {
              const a = artists.find(x => x.id === id)
              if (!a) return null
              return (
                <span
                  key={`chip-a-${id}`}
                  className="inline-flex items-center gap-1 border-2 border-amber-400/50 bg-amber-400/10 text-amber-300 px-2 py-0.5"
                >
                  <span className="text-[9px] font-black uppercase">{a.name}</span>
                  <button
                    onClick={() => toggleArtist(id)}
                    className="text-amber-400 hover:text-white text-[10px] leading-none"
                  >
                    ✕
                  </button>
                </span>
              )
            })}
            {[...selectedPlaylistIds].map(id => {
              const p = playlists.find(x => x.id === id)
              if (!p) return null
              return (
                <span
                  key={`chip-p-${id}`}
                  className="inline-flex items-center gap-1 border-2 border-amber-400/50 bg-amber-400/10 text-amber-300 px-2 py-0.5"
                >
                  <span className="text-[9px] font-black uppercase">♪ {p.name}</span>
                  <button
                    onClick={() => togglePlaylist(id)}
                    className="text-amber-400 hover:text-white text-[10px] leading-none"
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setStep('playing')}
          disabled={!canPlay}
          className="w-full py-3.5 font-black text-xs uppercase tracking-[0.2em] border-2 transition-all duration-75
            bg-amber-500 border-white text-black
            hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
            active:translate-x-0 active:translate-y-0 active:shadow-none
            disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {canPlay
            ? `▶  Chơi với ${totalSelected} nguồn`
            : 'Chọn ít nhất 1 nghệ sĩ hoặc danh sách'}
        </button>
      </div>

      {/* ── Admin modals ── */}
      {artistModal && (
        <ArtistModal
          artist={artistModal === 'create' ? null : artistModal.artist}
          onClose={() => setArtistModal(null)}
          onSaved={() => { setArtistModal(null); loadArtists() }}
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
        <NeedsUrlPanel
          onClose={() => setShowNeedsUrl(false)}
          onSaved={() => loadArtists()}
        />
      )}
    </div>
  )
}
