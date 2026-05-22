import { useState, useEffect, useRef } from 'react'
import { searchTracks } from '../api'

export default function GuessInput({ onGuess, disabled }) {
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
    <div ref={containerRef} className="relative w-full max-w-md mx-auto mb-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        disabled={disabled}
        placeholder="Tìm kiếm bài hát..."
        className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-orange-500 focus:outline-none disabled:opacity-40"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          ...
        </div>
      )}
      {open && (
        <ul className="absolute z-20 w-full mt-1 rounded-lg bg-gray-800 border border-gray-700 shadow-xl max-h-60 overflow-y-auto">
          {results.map(r => (
            <li
              key={r.id}
              onMouseDown={() => handleSelect(r)}
              className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
            >
              <div className="text-white text-sm font-medium truncate">{r.title}</div>
              <div className="text-gray-400 text-xs truncate">{r.artist}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
