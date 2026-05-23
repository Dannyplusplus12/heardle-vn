import { useState, useEffect, useRef } from 'react'
import { searchTracks } from '../api'

export default function GuessInput({ onGuess }) {
  const [query, setQuery] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
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

  const handleInputChange = (e) => {
    const val = e.target.value
    setDisplayValue(val)
    setQuery(val)
    setSelected(null)
  }

  const handleSelect = (track) => {
    setSelected(track)
    setDisplayValue(`${track.title} · ${track.artist}`)
    setQuery('')
    setOpen(false)
  }

  const handleSubmit = () => {
    if (!selected) return
    onGuess(selected)
    setSelected(null)
    setDisplayValue('')
    setQuery('')
    setResults([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && selected) handleSubmit()
  }

  return (
    <div ref={containerRef} className="w-full mb-3">
      <div className="relative mb-2">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Tìm theo tên bài hoặc nghệ sĩ..."
          className={`w-full px-4 py-3 rounded-xl border text-white placeholder-white/25 focus:outline-none transition-all text-sm
            ${selected
              ? 'bg-orange-500/10 border-orange-500/40 focus:border-orange-500/60'
              : 'bg-white/5 border-white/10 focus:border-orange-500/40 focus:bg-white/8'
            }
          `}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}

        {open && (
          <ul className="absolute z-20 w-full mt-1.5 rounded-xl bg-[#18181f] border border-white/10 shadow-2xl max-h-52 overflow-y-auto">
            {results.map(r => (
              <li
                key={r.id}
                onMouseDown={() => handleSelect(r)}
                className="px-4 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
              >
                <span className="text-white text-sm font-medium">{r.title}</span>
                <span className="text-gray-500 text-sm"> · {r.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
          bg-white/8 border border-white/10 text-gray-300
          hover:bg-white/12 hover:border-white/20 hover:text-white
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Đoán
      </button>
    </div>
  )
}
