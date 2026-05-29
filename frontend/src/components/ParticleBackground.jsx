import { useEffect, useRef } from 'react'

const PALETTE = [
  { r: 255, g: 0,   b: 110 },  // pink
  { r: 249, g: 115, b: 22  },  // orange
  { r: 204, g: 255, b: 0   },  // lime
  { r: 0,   g: 229, b: 255 },  // cyan
  { r: 168, g: 85,  b: 247 },  // violet
  { r: 255, g: 200, b: 0   },  // gold
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${+a.toFixed(3)})` }

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

    // Layer 1: twinkling rising dots
    const dots = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 3.5 + 1.2,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(Math.random() * 0.4 + 0.08),
      baseOpacity: Math.random() * 0.25 + 0.15,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.03 + 0.01,
      color: pick(PALETTE),
    }))

    // Layer 2: pulsing soft orbs
    const orbs = Array.from({ length: 14 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 70 + 40,
      vx: (Math.random() - 0.5) * 0.13,
      vy: (Math.random() - 0.5) * 0.13,
      baseOpacity: Math.random() * 0.1 + 0.06,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.012 + 0.004,
      color: pick(PALETTE),
    }))

    // Layer 3: large ambient color blobs
    const glows = Array.from({ length: 6 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 200 + 150,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      baseOpacity: Math.random() * 0.06 + 0.04,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.007 + 0.003,
      color: pick(PALETTE),
    }))

    // Shooting stars
    const stars = []
    let nextStarTime = performance.now() + Math.random() * 1500 + 500

    const spawnStar = (now) => {
      const fromLeft = Math.random() > 0.5
      const vx = (fromLeft ? 1 : -1) * (Math.random() * 4 + 3)
      const vy = Math.random() * 1.8 + 0.4
      stars.push({
        x: fromLeft ? -20 : canvas.width + 20,
        y: Math.random() * canvas.height * 0.6,
        vx, vy,
        speed: Math.sqrt(vx * vx + vy * vy),
        len: Math.random() * 140 + 90,
        life: 1,
        decay: Math.random() * 0.006 + 0.003,
        peakOpacity: Math.random() * 0.45 + 0.35,
        color: pick(PALETTE),
      })
      nextStarTime = now + Math.random() * 2500 + 1200
    }

    const wrap = (p) => {
      const pad = p.r * 2, w = canvas.width, h = canvas.height
      if (p.x < -pad) p.x = w + pad
      if (p.x > w + pad) p.x = -pad
      if (p.y < -pad) p.y = h + pad
      if (p.y > h + pad) p.y = -pad
    }

    const drawRadial = (p, opacity) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      g.addColorStop(0, rgba(p.color, opacity))
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

      if (now >= nextStarTime) spawnStar(now)

      // Ambient glows
      glows.forEach(p => {
        p.phase += p.phaseSpeed * delta
        drawRadial(p, p.baseOpacity * (0.6 + 0.4 * Math.sin(p.phase)))
        p.x += p.vx * delta; p.y += p.vy * delta; wrap(p)
      })

      // Orbs
      orbs.forEach(p => {
        p.phase += p.phaseSpeed * delta
        drawRadial(p, p.baseOpacity * (0.5 + 0.5 * Math.sin(p.phase)))
        p.x += p.vx * delta; p.y += p.vy * delta; wrap(p)
      })

      // Shooting stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i]
        const alpha = s.life * s.peakOpacity
        const nx = s.vx / s.speed
        const ny = s.vy / s.speed
        const tx = s.x - nx * s.len
        const ty = s.y - ny * s.len
        const grad = ctx.createLinearGradient(tx, ty, s.x, s.y)
        grad.addColorStop(0, rgba(s.color, 0))
        grad.addColorStop(1, rgba(s.color, alpha))
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 2.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = rgba(s.color, Math.min(alpha * 1.6, 0.9))
        ctx.fill()
        s.x += s.vx * delta
        s.y += s.vy * delta
        s.life -= s.decay * delta
        if (s.life <= 0 || s.x < -200 || s.x > canvas.width + 200 || s.y > canvas.height + 50) {
          stars.splice(i, 1)
        }
      }

      // Twinkling dots
      dots.forEach(p => {
        p.phase += p.phaseSpeed * delta
        const opacity = p.baseOpacity * (0.35 + 0.65 * Math.abs(Math.sin(p.phase)))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = rgba(p.color, opacity)
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
