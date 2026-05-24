import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchArtists, fetchArtistProfiles } from '../api'

function getInitials(name) {
  return name
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function getColor(rank) {
  const hue = (rank * 137.508) % 360
  return `hsl(${hue}, 50%, 28%)`
}

export default function ArtistScreen({ onStart }) {
  const [artists, setArtists] = useState([])
  const [avatars, setAvatars] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const debounceRef = useRef(null)
  const LIMIT = 60

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const loadArtists = useCallback(async (q, off) => {
    try {
      const data = await fetchArtists({ search: q, limit: LIMIT, offset: off })
      return data
    } catch {
      return []
    }
  }, [])

  // Initial load (fires on debounced search change)
  useEffect(() => {
    setLoading(true)
    setArtists([])
    setOffset(0)
    setHasMore(true)
    loadArtists(debouncedSearch, 0).then(data => {
      setArtists(data)
      setHasMore(data.length === LIMIT)
      setLoading(false)
      // Fetch avatars for first batch
      const names = data.map(a => a.name)
      if (names.length) {
        fetchArtistProfiles(names)
          .then(profiles => {
            const map = {}
            profiles.forEach(p => { map[p.name] = p.avatar_url })
            setAvatars(prev => ({ ...prev, ...map }))
          })
          .catch(() => {})
      }
    })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const newOffset = offset + LIMIT
    const data = await loadArtists(debouncedSearch, newOffset)
    setArtists(prev => [...prev, ...data])
    setOffset(newOffset)
    setHasMore(data.length === LIMIT)
    setLoadingMore(false)
    // Fetch avatars for new batch
    const names = data.map(a => a.name)
    if (names.length) {
      fetchArtistProfiles(names)
        .then(profiles => {
          const map = {}
          profiles.forEach(p => { map[p.name] = p.avatar_url })
          setAvatars(prev => ({ ...prev, ...map }))
        })
        .catch(() => {})
    }
  }

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStart = () => {
    if (selected.size === 0) return
    const names = artists.filter(a => selected.has(a.id)).map(a => a.name)
    onStart(names)
  }

  return (
    <div
      className="flex flex-col w-full"
      style={{ height: 'min(calc(100vh - 40px), 960px)', maxWidth: '960px' }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-px bg-amber-500" />
          <span className="text-amber-500 text-[10px] font-bold tracking-[0.35em] uppercase">Chế độ</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tight text-white leading-none mb-1">
          Fan <span className="text-amber-400">Cứng</span>
        </h1>
        <p className="text-xs text-gray-500 tracking-widest uppercase">
          {selected.size > 0
            ? `${selected.size} nghệ sĩ đã chọn`
            : 'Chọn nghệ sĩ để bắt đầu'}
        </p>
      </div>

      {/* ── Search ── */}
      <div className="shrink-0 mb-3 relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm nghệ sĩ..."
          className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600
            px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm select-none">⌕</span>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {loading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            Không tìm thấy nghệ sĩ nào
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2">
              {artists.map(artist => {
                const isSelected = selected.has(artist.id)
                const avatarUrl = avatars[artist.name] || artist.avatar_url
                return (
                  <button
                    key={artist.id}
                    onClick={() => toggle(artist.id)}
                    className={`
                      relative flex flex-col overflow-hidden cursor-pointer transition-all duration-150 group text-left
                      ${isSelected
                        ? 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                        : 'ring-1 ring-white/8 hover:ring-white/30'
                      }
                    `}
                  >
                    {/* Poster */}
                    <div className="aspect-[3/4] relative overflow-hidden"
                      style={{ background: getColor(artist.rank) }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl font-black text-white/30 select-none">
                            {getInitials(artist.name)}
                          </span>
                        </div>
                      )}

                      {/* Cinematic gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                      {/* Rank badge */}
                      <div className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-amber-400">#{artist.rank}</span>
                      </div>

                      {/* Genre badge */}
                      {artist.genre && (
                        <div className="absolute bottom-9 left-1.5">
                          <span className="text-[8px] font-semibold uppercase tracking-wider text-white/50">
                            {artist.genre}
                          </span>
                        </div>
                      )}

                      {/* Selected overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-400/8 pointer-events-none" />
                      )}

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-400 flex items-center justify-center shadow-md">
                          <span className="text-[10px] text-black font-black leading-none">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Name strip */}
                    <div className={`px-2 py-1.5 shrink-0 transition-colors duration-150 ${isSelected ? 'bg-amber-950/60' : 'bg-[#111]'}`}>
                      <p className={`text-[10px] font-bold leading-tight truncate ${isSelected ? 'text-amber-300' : 'text-gray-300'}`}>
                        {artist.name}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 text-xs font-bold uppercase tracking-widest border border-white/15
                    text-gray-400 hover:text-white hover:border-white/35 transition-colors disabled:opacity-40"
                >
                  {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Play button ── */}
      <div className="shrink-0 pt-3 border-t border-white/10 mt-3">
        <button
          onClick={handleStart}
          disabled={selected.size === 0}
          className="w-full py-3.5 font-black text-xs uppercase tracking-[0.2em] border-2 transition-all duration-75
            bg-amber-500 border-white text-black
            hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
            active:translate-x-0 active:translate-y-0 active:shadow-none
            disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {selected.size > 0 ? `▶  Chơi với ${selected.size} nghệ sĩ` : 'Chọn ít nhất 1 nghệ sĩ'}
        </button>
      </div>
    </div>
  )
}
