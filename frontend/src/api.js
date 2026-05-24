const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Game ──────────────────────────────────────────────────────────────────────

export async function fetchNewGame({ genre, artists, artistIds, playlistIds } = {}) {
  const params = new URLSearchParams()
  if (genre) params.set('genre', genre)
  if (artists?.length) params.set('artists', artists.join(','))
  if (artistIds?.length) params.set('artist_ids', artistIds.join(','))
  if (playlistIds?.length) params.set('playlist_ids', playlistIds.join(','))
  const qs = params.toString()
  const res = await fetch(`${API_BASE}/api/game/new${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Không thể tải bài hát')
  return res.json()
}

export function getClipUrl(trackId, full = false) {
  return `${API_BASE}/api/game/clip/${trackId}${full ? '?full=true' : ''}`
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchTracks(q, { artists = [], artistIds = [], playlistIds = [] } = {}) {
  const params = new URLSearchParams({ q })
  if (artistIds.length) params.set('artist_ids', artistIds.join(','))
  else if (playlistIds.length) params.set('playlist_ids', playlistIds.join(','))
  else if (artists.length) params.set('artists', artists.join(','))
  const res = await fetch(`${API_BASE}/api/search?${params}`)
  if (!res.ok) throw new Error('Tìm kiếm thất bại')
  return res.json()
}

// ── Artists (public) ──────────────────────────────────────────────────────────

export async function fetchArtists({ search = '', limit = 60, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  const res = await fetch(`${API_BASE}/api/artists?${params}`)
  if (!res.ok) throw new Error('Không thể tải danh sách nghệ sĩ')
  return res.json()
}

export async function fetchAllArtists({ search = '' } = {}) {
  return fetchArtists({ search, limit: 1000 })
}

export async function fetchArtistProfiles(names) {
  const params = new URLSearchParams({ names: names.join(',') })
  const res = await fetch(`${API_BASE}/api/artists/profiles?${params}`)
  if (!res.ok) throw new Error('Failed to fetch profiles')
  return res.json()
}

// ── Playlists (public) ────────────────────────────────────────────────────────

export async function fetchPlaylists() {
  const res = await fetch(`${API_BASE}/api/playlists`)
  if (!res.ok) throw new Error('Không thể tải danh sách')
  return res.json()
}

export async function fetchPlaylistTracks(playlistId) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/tracks`)
  if (!res.ok) throw new Error('Không thể tải bài hát')
  return res.json()
}

// ── Admin: Artists ─────────────────────────────────────────────────────────────

export async function adminListArtists(needsUrl = false) {
  const res = await fetch(
    `${API_BASE}/api/admin/artists${needsUrl ? '?needs_url=true' : ''}`,
    { headers: authHeaders() },
  )
  if (!res.ok) throw new Error('Forbidden')
  return res.json()
}

export async function adminCreateArtist(data) {
  const res = await fetch(`${API_BASE}/api/admin/artists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Lỗi tạo nghệ sĩ')
  }
  return res.json()
}

export async function adminUpdateArtist(id, data) {
  const res = await fetch(`${API_BASE}/api/admin/artists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Lỗi cập nhật')
  return res.json()
}

export async function adminDeleteArtist(id) {
  const res = await fetch(`${API_BASE}/api/admin/artists/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Lỗi xóa')
  return res.json()
}

export async function adminRecrawlArtist(id) {
  const res = await fetch(`${API_BASE}/api/admin/artists/${id}/crawl`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Lỗi crawl')
  return res.json()
}

export async function adminNeedsUrlCount() {
  const res = await fetch(`${API_BASE}/api/admin/artists/needs-url-count`, {
    headers: authHeaders(),
  })
  if (!res.ok) return { count: 0 }
  return res.json()
}

// ── Admin: Playlists ───────────────────────────────────────────────────────────

export async function adminListPlaylists() {
  const res = await fetch(`${API_BASE}/api/admin/playlists`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Forbidden')
  return res.json()
}

export async function adminCreatePlaylist(data) {
  const res = await fetch(`${API_BASE}/api/admin/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Lỗi tạo danh sách')
  return res.json()
}

export async function adminUpdatePlaylist(id, data) {
  const res = await fetch(`${API_BASE}/api/admin/playlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Lỗi cập nhật')
  return res.json()
}

export async function adminDeletePlaylist(id) {
  const res = await fetch(`${API_BASE}/api/admin/playlists/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Lỗi xóa')
  return res.json()
}

export async function adminAddTrackToPlaylist(playlistId, trackId) {
  const res = await fetch(`${API_BASE}/api/admin/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ track_id: trackId }),
  })
  if (!res.ok) throw new Error('Lỗi thêm bài hát')
  return res.json()
}

export async function adminRemoveTrackFromPlaylist(playlistId, ptId) {
  const res = await fetch(`${API_BASE}/api/admin/playlists/${playlistId}/tracks/${ptId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Lỗi xóa bài hát')
  return res.json()
}
