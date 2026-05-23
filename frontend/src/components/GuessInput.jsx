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
    if (query.length < 1) { setResults([]); setOpen(false); return }
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
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleInputChange = (e) => {
    setDisplayValue(e.target.value)
    setQuery(e.target.value)
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

  return (
    <div ref={containerRef} className="w-full mb-3">
      <div className="relative mb-2">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tìm bài hát hoặc nghệ sĩ..."
          className={`w-full px-4 py-3 border-2 bg-[#1a1a1a] text-white font-medium text-sm placeholder-white/20
            focus:outline-none transition-all duration-75
            ${selected
              ? 'border-orange-500 shadow-[2px_2px_0_rgba(249,115,22,0.4)]'
              : 'border-white/25 focus:border-white/60'
            }`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}
        {open && (
          <ul className="absolute z-20 w-full top-full border-x-2 border-b-2 border-white/25 bg-[#151515] max-h-52 overflow-y-auto shadow-[4px_4px_0_rgba(255,255,255,0.1)]">
            {results.map(r => (
              <li
                key={r.id}
                onMouseDown={() => handleSelect(r)}
                className="px-4 py-2.5 border-b border-white/8 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span className="text-white text-sm font-semibold">{r.title}</span>
                <span className="text-gray-500 text-sm"> · {r.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full py-3 border-2 font-black text-sm uppercase tracking-widest transition-all duration-75
          border-white/30 bg-[#1a1a1a] text-gray-300
          hover:border-white hover:text-white hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
          active:translate-x-0 active:translate-y-0 active:shadow-none
          disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        Đoán
      </button>
    </div>
  )
}
