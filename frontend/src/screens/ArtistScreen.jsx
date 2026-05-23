import { useState } from 'react'

const ARTISTS = [
  { id: 'son-tung',        name: 'Sơn Tùng M-TP',   query: 'Son Tung MTP',          initials: 'ST',  color: '#f97316' },
  { id: 'hieuthuhai',      name: 'HIEUTHUHAI',        query: 'HIEUTHUHAI',             initials: 'HH',  color: '#8b5cf6' },
  { id: 'tlinh',           name: 'tlinh',             query: 'tlinh',                  initials: 'TL',  color: '#ec4899' },
  { id: 'wren-evans',      name: 'Wren Evans',        query: 'Wren Evans',             initials: 'WE',  color: '#06b6d4' },
  { id: 'hoang-thuy-linh', name: 'Hoàng Thùy Linh',  query: 'Hoang Thuy Linh',        initials: 'HT',  color: '#84cc16' },
  { id: 'den-vau',         name: 'Đen Vâu',           query: 'Den Vau rapper',         initials: 'ĐV',  color: '#475569' },
  { id: 'mono',            name: 'MONO',              query: 'MONO singer vietnam',    initials: 'MO',  color: '#6366f1' },
  { id: 'tang-duy-tan',    name: 'Tăng Duy Tân',      query: 'Tang Duy Tan',           initials: 'TDT', color: '#f59e0b' },
  { id: 'my-tam',          name: 'Mỹ Tâm',            query: 'My Tam singer',          initials: 'MT',  color: '#e11d48' },
  { id: 'bich-phuong',     name: 'Bích Phương',       query: 'Bich Phuong',            initials: 'BP',  color: '#0ea5e9' },
  { id: 'amee',            name: 'AMEE',              query: 'AMEE vietnam',           initials: 'AM',  color: '#f43f5e' },
  { id: 'erik',            name: 'Erik',              query: 'Erik singer vietnam',    initials: 'ER',  color: '#10b981' },
  { id: 'grey-d',          name: 'Grey D',            query: 'Grey D vietnam',         initials: 'GD',  color: '#64748b' },
  { id: 'binz',            name: 'Binz',              query: 'Binz rapper',            initials: 'BZ',  color: '#dc2626' },
  { id: 'jack',            name: 'Jack (J97)',         query: 'Jack J97 vietnam',       initials: 'JK',  color: '#7c3aed' },
  { id: 'obito',           name: 'Obito',             query: 'Obito rapper vietnam',   initials: 'OB',  color: '#2563eb' },
  { id: 'da-lab',          name: 'Da LAB',            query: 'Da LAB vietnam',         initials: 'DL',  color: '#059669' },
  { id: 'phuong-my-chi',   name: 'Phương Mỹ Chi',     query: 'Phuong My Chi',          initials: 'PC',  color: '#d97706' },
  { id: 'vu-cat-tuong',    name: 'Vũ Cát Tường',      query: 'Vu Cat Tuong',           initials: 'VC',  color: '#9333ea' },
  { id: 'bray',            name: 'Bray',              query: 'Bray rapper',            initials: 'BR',  color: '#1e3a5f' },
  { id: 'noo-phuoc-thinh', name: 'Noo Phước Thịnh',   query: 'Noo Phuoc Thinh',        initials: 'NP',  color: '#0891b2' },
  { id: 'mck',             name: 'RPT MCK',           query: 'RPT MCK rapper',         initials: 'MC',  color: '#7f1d1d' },
  { id: 'duy-manh',        name: 'Duy Mạnh',          query: 'Duy Manh singer',        initials: 'DM',  color: '#b45309' },
  { id: 'bao-thy',         name: 'Bảo Thy',           query: 'Bao Thy singer',         initials: 'BT',  color: '#be185d' },
]

export default function ArtistScreen({ onStart }) {
  const [selected, setSelected] = useState(new Set())

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStart = () => {
    if (selected.size === 0) return
    const queries = ARTISTS.filter(a => selected.has(a.id)).map(a => a.query)
    onStart(queries)
  }

  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">⭐</span>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white">
            Fan <span className="text-orange-500">Cứng</span>
          </h1>
        </div>
        <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
          {selected.size > 0
            ? `${selected.size} nghệ sĩ đã chọn · click để bỏ chọn`
            : 'Chọn một hoặc nhiều nghệ sĩ'}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {ARTISTS.map(artist => {
          const isSelected = selected.has(artist.id)
          return (
            <button
              key={artist.id}
              onClick={() => toggle(artist.id)}
              className={`
                flex flex-col items-start border-2 overflow-hidden transition-all duration-75 cursor-pointer select-none text-left
                ${isSelected
                  ? 'border-orange-500 -translate-x-[2px] -translate-y-[2px] shadow-[4px_4px_0_rgba(249,115,22,0.7)]'
                  : 'border-white/15 hover:border-white/40 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_rgba(255,255,255,0.15)]'
                }
              `}
            >
              <div
                className="w-full aspect-square flex items-center justify-center font-black text-2xl text-white/90 relative"
                style={{ background: artist.color }}
              >
                <span className="drop-shadow-sm">{artist.initials}</span>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-orange-500 border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] text-white font-black leading-none">✓</span>
                  </div>
                )}
              </div>
              <div className="px-2 pt-1.5 pb-2 w-full bg-[#1a1a1a]">
                <p className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-orange-400' : 'text-gray-300'}`}>
                  {artist.name}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleStart}
        disabled={selected.size === 0}
        className="w-full py-4 font-black text-sm uppercase tracking-widest border-2 transition-all duration-75
          bg-orange-500 border-white text-white
          hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#fff]
          active:translate-x-0 active:translate-y-0 active:shadow-none
          disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {selected.size > 0 ? `Chơi với ${selected.size} nghệ sĩ →` : 'Chọn ít nhất 1 nghệ sĩ'}
      </button>
    </div>
  )
}
