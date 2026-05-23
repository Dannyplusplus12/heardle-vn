const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchNewGame({ genre, artists } = {}) {
  const params = new URLSearchParams()
  if (genre) params.set('genre', genre)
  if (artists?.length) params.set('artists', artists.join(','))
  const qs = params.toString()
  const res = await fetch(`${API_BASE}/api/game/new${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Không thể tải bài hát')
  return res.json()
}

export function getClipUrl(trackId, full = false) {
  return `${API_BASE}/api/game/clip/${trackId}${full ? '?full=true' : ''}`
}

export async function fetchArtistProfiles(names) {
  const params = new URLSearchParams({ names: names.join(',') })
  const res = await fetch(`${API_BASE}/api/artists/profiles?${params}`)
  if (!res.ok) throw new Error('Failed to fetch profiles')
  return res.json()
}

export async function searchTracks(q, artists = []) {
  const params = new URLSearchParams({ q })
  if (artists.length) params.set('artists', artists.join(','))
  const res = await fetch(`${API_BASE}/api/search?${params}`)
  if (!res.ok) throw new Error('Tìm kiếm thất bại')
  return res.json()
}
