import { useEffect, useRef } from 'react'

const PALETTE = [
  { r: 255, g: 0,   b: 110 },  // #FF006E — pink
  { r: 249, g: 115, b: 22  },  // #f97316 — orange
  { r: 204, g: 255, b: 0   },  // #CCFF00 — lime
  { r: 0,   g: 229, b: 255 },  // #00E5FF — cyan
  { r: 168, g: 85,  b: 247 },  // #a855f7 — violet
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})` }

export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Layer 1: small rising dots
    const dots = Array.from({ length: 48 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.28 + 0.06),
      opacity: Math.random() * 0.07 + 0.025,
      color: pick(PALETTE),
    }))

    // Layer 2: medium soft orbs drifting freely
    const orbs = Array.from({ length: 8 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 35 + 18,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      opacity: Math.random() * 0.028 + 0.012,
      color: pick(PALETTE),
    }))

    // Layer 3: large ambient color blobs — very faint
    const glows = Array.from({ length: 4 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 130 + 90,
      vx: (Math.random() - 0.5) * 0.04,
      vy: (Math.random() - 0.5) * 0.04,
      opacity: Math.random() * 0.014 + 0.007,
      color: pick(PALETTE),
    }))

    const wrap = (p) => {
      const pad = p.r * 2
      const w = canvas.width, h = canvas.height
      if (p.x < -pad) p.x = w + pad
      if (p.x > w + pad) p.x = -pad
      if (p.y < -pad) p.y = h + pad
      if (p.y > h + pad) p.y = -pad
    }

    const drawRadial = (p) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      g.addColorStop(0, rgba(p.color, p.opacity))
      g.addColorStop(1, rgba(p.color, 0))
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
    }

    let then = performance.now()
    const draw = (now) => {
      const delta = Math.min((now - then) / 16, 3)
      then = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      glows.forEach(p => { drawRadial(p); p.x += p.vx * delta; p.y += p.vy * delta; wrap(p) })
      orbs.forEach(p => { drawRadial(p); p.x += p.vx * delta; p.y += p.vy * delta; wrap(p) })

      dots.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = rgba(p.color, p.opacity)
        ctx.fill()
        p.x += p.vx * delta
        p.y += p.vy * delta
        if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width }
        if (p.x < -4) p.x = canvas.width + 4
        if (p.x > canvas.width + 4) p.x = -4
      })

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
