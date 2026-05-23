import { useState, useEffect, useRef } from 'react'
import { searchTracks } from '../api'

export default function GuessInput({ onGuess }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchTracks(query)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (track) => {
    setQuery('')
    setResults([])
    setOpen(false)
    onGuess(track)
  }

  return (
    <div ref={containerRef} className="relative w-full mb-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm bài hát để đoán..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-orange-500/60 focus:bg-white/8 focus:outline-none transition-all text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <ul className="absolute z-20 w-full mt-1.5 rounded-xl bg-[#18181f] border border-white/10 shadow-2xl max-h-56 overflow-y-auto">
          {results.map(r => (
            <li
              key={r.id}
              onMouseDown={() => handleSelect(r)}
              className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
            >
              <div className="text-white text-sm font-medium truncate">{r.title}</div>
              <div className="text-gray-500 text-xs truncate">{r.artist}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
