import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchAllArtists, fetchPlaylists } from '../api'
import RoomScreen from '../screens/RoomScreen'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Artist / Playlist mini cards ──────────────────────────────────────────────

function getInitials(name) {
  return name.split(/[\s\-_]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
function getHue(id) { return (id * 137.508) % 360 }

function ArtistCard({ artist, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 text-left w-full border-2"
      style={{
        borderColor: selected ? '#FF006E' : 'rgba(255,255,255,0.1)',
        boxShadow: selected ? '4px 4px 0 #FF006E' : 'none',
        transform: selected ? 'translate(-2px, -2px)' : 'none',
      }}
    >
      <div className="w-full aspect-square relative overflow-hidden"
        style={{ background: `hsl(${getHue(artist.id)}, 50%, 15%)` }}>
        {artist.avatar_url
          ? <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white/15 select-none">{getInitials(artist.name)}</span>
        }
        {selected && <div className="absolute inset-0" style={{ backgroundColor: 'rgba(255,0,110,0.15)' }} />}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center"
            style={{ backgroundColor: '#FF006E' }}>
            <span className="text-[10px] text-white font-black leading-none">✓</span>
          </div>
        )}
      </div>
      <div className="px-1.5 py-1 shrink-0 border-t-2"
        style={{ borderColor: selected ? '#FF006E' : 'rgba(255,255,255,0.08)', backgroundColor: selected ? 'rgba(255,0,110,0.08)' : '#0f0f0f' }}>
        <p className="text-[9px] font-black leading-tight truncate uppercase"
          style={{ color: selected ? '#FF006E' : '#6b7280' }}>{artist.name}</p>
      </div>
    </button>
  )
}

function PlaylistCard({ playlist, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col overflow-hidden cursor-pointer transition-all duration-75 text-left shrink-0 w-28 border-2"
      style={{
        borderColor: selected ? '#FF006E' : 'rgba(255,255,255,0.1)',
        boxShadow: selected ? '4px 4px 0 #FF006E' : 'none',
        transform: selected ? 'translate(-2px, -2px)' : 'none',
      }}
    >
      <div className="w-28 h-20 relative overflow-hidden flex items-center justify-center bg-[#111]">
        {playlist.cover_url
          ? <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-2xl opacity-20">♪</span>
        }
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#FF006E' }}>
            <span className="text-[10px] text-white font-black">✓</span>
          </div>
        )}
      </div>
      <div className="px-1.5 py-1.5 shrink-0 border-t-2"
        style={{ borderColor: selected ? '#FF006E' : 'rgba(255,255,255,0.08)', backgroundColor: '#0f0f0f' }}>
        <p className="text-[9px] font-black leading-tight uppercase truncate"
          style={{ color: selected ? '#FF006E' : '#6b7280' }}>{playlist.name}</p>
        <p className="text-[8px] text-gray-700">{playlist.track_count ?? 0} bài</p>
      </div>
    </button>
  )
}

// ── Playlist/Artist picker (step: picking) ────────────────────────────────────

function PickingScreen({ selectedArtistIds, selectedPlaylistIds, toggleArtist, togglePlaylist, onBack, onConfirm, loading }) {
  const [artists, setArtists] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState('')
  const [dq, setDq] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    Promise.all([fetchAllArtists(), fetchPlaylists()])
      .then(([a, p]) => { setArtists(a); setPlaylists(p) })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDq(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const filteredArtists = dq ? artists.filter(a => a.name.toLowerCase().includes(dq.toLowerCase())) : artists
  const filteredPlaylists = dq ? playlists.filter(p => p.name.toLowerCase().includes(dq.toLowerCase())) : playlists
  const totalSelected = selectedArtistIds.size + selectedPlaylistIds.size

  return (
    <div className="flex h-full bg-[#070707]">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b-2 border-white/8 flex items-center gap-4">
          <button onClick={onBack}
            className="text-gray-500 hover:text-white text-lg font-black transition-colors">←</button>
          <div>
            <div className="text-[8px] font-black tracking-[0.4em] uppercase mb-0.5" style={{ color: '#FF006E' }}>✦ TẠO PHÒNG</div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Chọn nhạc</h1>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 px-6 py-3 border-b border-white/5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nghệ sĩ hoặc danh sách..."
            className="w-full bg-[#0f0f0f] border-2 border-white/12 text-white placeholder-gray-600
              px-4 py-2.5 text-sm font-medium focus:outline-none transition-all"
            style={{ borderColor: search ? '#FF006E40' : undefined }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,0,110,0.2) transparent' }}>
          {/* Artists */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3 px-6">
              <span className="text-[9px] font-black tracking-[0.35em] uppercase" style={{ color: '#FF006E' }}>✦ NGHỆ SĨ</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>
            <div className="px-6 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
              {loadingData
                ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square bg-white/4 animate-pulse border border-white/5" />)
                : filteredArtists.map(a => (
                  <ArtistCard key={a.id} artist={a}
                    selected={selectedArtistIds.has(a.id)}
                    onClick={() => toggleArtist(a.id)} />
                ))
              }
            </div>
          </div>

          {/* Playlists */}
          {playlists.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3 px-6">
                <span className="text-[9px] font-black tracking-[0.35em] uppercase" style={{ color: '#00E5FF' }}>✦ DANH SÁCH</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 px-6" style={{ scrollbarWidth: 'none' }}>
                {filteredPlaylists.map(p => (
                  <PlaylistCard key={p.id} playlist={p}
                    selected={selectedPlaylistIds.has(p.id)}
                    onClick={() => togglePlaylist(p.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-52 shrink-0 border-l-2 border-white/8 bg-[#050505] flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-white/8">
          <span className="text-[9px] font-black tracking-[0.3em] uppercase text-gray-600">
            Đã chọn {totalSelected > 0 ? `— ${totalSelected}` : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {totalSelected === 0 ? (
            <p className="text-gray-700 text-[10px] italic mt-2 leading-relaxed">
              Chọn nghệ sĩ hoặc danh sách để bắt đầu
            </p>
          ) : (
            <>
              {[...selectedArtistIds].map(id => {
                const a = artists.find(x => x.id === id)
                return a ? (
                  <span key={`a-${id}`} className="flex items-center gap-1.5 border-2 px-2 py-1 text-[9px] font-black uppercase"
                    style={{ borderColor: 'rgba(255,0,110,0.4)', backgroundColor: 'rgba(255,0,110,0.06)', color: '#FF006E' }}>
                    <span className="flex-1 truncate">{a.name}</span>
                    <button onClick={() => toggleArtist(id)} className="shrink-0" style={{ color: '#FF006E' }}>✕</button>
                  </span>
                ) : null
              })}
              {[...selectedPlaylistIds].map(id => {
                const p = playlists.find(x => x.id === id)
                return p ? (
                  <span key={`p-${id}`} className="flex items-center gap-1.5 border-2 px-2 py-1 text-[9px] font-black uppercase"
                    style={{ borderColor: 'rgba(0,229,255,0.4)', backgroundColor: 'rgba(0,229,255,0.06)', color: '#00E5FF' }}>
                    <span className="flex-1 truncate">♪ {p.name}</span>
                    <button onClick={() => togglePlaylist(id)} style={{ color: '#00E5FF' }}>✕</button>
                  </span>
                ) : null
              })}
            </>
          )}
        </div>

        <div className="shrink-0 p-4 border-t border-white/8">
          <button
            onClick={onConfirm}
            disabled={totalSelected === 0 || loading}
            className="w-full py-3.5 font-black text-xs uppercase tracking-widest border-2 transition-all duration-75
              text-white
              hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
              active:translate-x-0 active:translate-y-0 active:shadow-none
              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ backgroundColor: '#FF006E', borderColor: 'white' }}>
            {loading ? 'Đang tạo...' : totalSelected > 0 ? `Tạo phòng (${totalSelected}) →` : 'Tạo phòng →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Home screen ───────────────────────────────────────────────────────────────

function HomeScreen({ playerName, setPlayerName, joinCode, setJoinCode, isLoggedIn, onCreateRoom, onJoinRoom, onGoogleLogin, error }) {
  return (
    <div className="flex items-center justify-center min-h-full p-5 bg-[#070707]">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="text-[8px] font-black tracking-[0.5em] uppercase mb-3" style={{ color: '#FF006E' }}>
            ✦ HEARDLE VN ✦
          </div>
          <h1 className="text-[3.5rem] font-black uppercase leading-none tracking-tight mb-1"
            style={{ background: 'linear-gradient(135deg, #FF006E 0%, #00E5FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Đối Đầu
          </h1>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.3em]">Chế độ nhiều người chơi</p>
        </div>

        {/* Name input (guest) */}
        {!isLoggedIn && (
          <div className="mb-5">
            <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#FF006E' }}>
              ✦ Tên của bạn
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Nhập tên..."
              maxLength={30}
              className="w-full bg-[#0f0f0f] border-2 text-white placeholder-gray-600
                px-4 py-3 text-sm font-black focus:outline-none transition-all"
              style={{ borderColor: playerName ? '#FF006E' : 'rgba(255,255,255,0.15)' }}
            />
          </div>
        )}

        {/* Logged in user display */}
        {isLoggedIn && (
          <div className="mb-5 border-2 border-white/10 px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: '#CCFF00' }} />
            <span className="text-xs font-black uppercase text-white">{playerName}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 border-2 border-[#FF006E]/50 bg-[#FF006E]/8 px-4 py-2 text-xs font-black text-[#FF006E]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={onCreateRoom}
            className="w-full py-4 font-black text-sm uppercase tracking-widest border-2 transition-all duration-75
              text-white
              hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#fff]
              active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: '#FF006E', borderColor: 'white' }}>
            ✦ Tạo phòng mới
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && onJoinRoom()}
              placeholder="MÃ PHÒNG"
              className="flex-1 bg-[#0f0f0f] border-2 text-white placeholder-gray-700
                px-4 py-3 text-sm font-black text-center focus:outline-none tracking-widest uppercase transition-all"
              style={{ borderColor: joinCode ? '#00E5FF' : 'rgba(255,255,255,0.12)' }}
            />
            <button
              onClick={onJoinRoom}
              className="shrink-0 px-5 py-3 font-black text-xs uppercase tracking-widest border-2 transition-all duration-75
                text-white
                hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#00E5FF]
                active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: '#00E5FF10', borderColor: '#00E5FF', color: '#00E5FF' }}>
              Vào →
            </button>
          </div>
        </div>

        {/* Rules */}
        <div className="border-2 border-white/8 p-4">
          <div className="text-[8px] font-black tracking-[0.35em] uppercase mb-3 text-gray-600">✦ Luật chơi</div>
          <div className="flex flex-col gap-2">
            {[
              ['✦', 'Nghe nhạc và đoán tên bài hát'],
              ['★', '9 vòng — đoán nhanh nhất được nhiều điểm nhất'],
              ['◆', 'Thêm điểm thưởng nếu đoán sớm'],
              ['✦', 'Vòng bonus nếu hòa điểm'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-2">
                <span className="text-[9px] shrink-0 mt-0.5" style={{ color: '#FF006E' }}>{icon}</span>
                <span className="text-[10px] text-gray-500 font-medium leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DoiDauPage() {
  const { user, token: authToken } = useAuth()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState('home') // home | picking | room
  const [playerName, setPlayerName] = useState(user?.name || '')
  const [playerToken, setPlayerToken] = useState(authToken || null)
  const [joinCode, setJoinCode] = useState(searchParams.get('join') || '')
  const [roomCode, setRoomCode] = useState(null)
  const [selectedArtistIds, setSelectedArtistIds] = useState(new Set())
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState(new Set())
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      setPlayerName(user.name)
      setPlayerToken(authToken)
    }
  }, [user, authToken])

  const ensureToken = async () => {
    if (playerToken) return playerToken
    if (!playerName.trim()) { setError('Nhập tên của bạn trước'); return null }
    try {
      const res = await fetch(`${API_BASE}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPlayerToken(data.token)
      return data.token
    } catch {
      setError('Lỗi đăng ký. Thử lại.')
      return null
    }
  }

  const toggleArtist = (id) => setSelectedArtistIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togglePlaylist = (id) => setSelectedPlaylistIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleCreateRoom = async () => {
    setError(null)
    const tok = await ensureToken()
    if (!tok) return
    setStep('picking')
  }

  const handlePickingConfirm = async () => {
    if (selectedArtistIds.size === 0 && selectedPlaylistIds.size === 0) {
      setError('Chọn ít nhất 1 nghệ sĩ hoặc danh sách')
      return
    }
    setCreatingRoom(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_BASE}/api/doi-dau/rooms?token=${encodeURIComponent(playerToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artist_ids: [...selectedArtistIds],
            playlist_ids: [...selectedPlaylistIds],
          }),
        }
      )
      if (!res.ok) throw new Error('Lỗi tạo phòng')
      const data = await res.json()
      setRoomCode(data.code)
      setStep('room')
    } catch (e) {
      setError(e.message)
    }
    setCreatingRoom(false)
  }

  const handleJoinRoom = async () => {
    setError(null)
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Mã phòng phải có 6 ký tự'); return }
    const tok = await ensureToken()
    if (!tok) return
    setRoomCode(code)
    setStep('room')
  }

  const handleLeaveRoom = () => {
    setStep('home')
    setRoomCode(null)
    setJoinCode('')
    setSelectedArtistIds(new Set())
    setSelectedPlaylistIds(new Set())
  }

  if (step === 'room' && roomCode && playerToken) {
    return <RoomScreen code={roomCode} token={playerToken} onLeave={handleLeaveRoom} />
  }

  if (step === 'picking') {
    return (
      <PickingScreen
        selectedArtistIds={selectedArtistIds}
        selectedPlaylistIds={selectedPlaylistIds}
        toggleArtist={toggleArtist}
        togglePlaylist={togglePlaylist}
        onBack={() => setStep('home')}
        onConfirm={handlePickingConfirm}
        loading={creatingRoom}
      />
    )
  }

  return (
    <HomeScreen
      playerName={playerName}
      setPlayerName={setPlayerName}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      isLoggedIn={!!user}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      error={error}
    />
  )
}
