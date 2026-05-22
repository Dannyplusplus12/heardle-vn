const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchNewGame() {
  const res = await fetch(`${API_BASE}/api/game/new`)
  if (!res.ok) throw new Error('Không thể tải bài hát')
  return res.json()
}

export function getClipUrl(trackId, duration) {
  return `${API_BASE}/api/game/clip/${trackId}?duration=${duration}`
}

export async function searchTracks(q) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('Tìm kiếm thất bại')
  return res.json()
}
