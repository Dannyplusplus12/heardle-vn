import { useState, useRef, useCallback } from 'react'

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws')

export function useRoom() {
  const [connected, setConnected] = useState(false)
  const [phase, setPhase] = useState('disconnected')
  const [players, setPlayers] = useState([])
  const [hostId, setHostId] = useState(null)
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(9)
  const [code, setCode] = useState(null)
  const [artistIds, setArtistIds] = useState([])
  const [playlistIds, setPlaylistIds] = useState([])
  const [trackId, setTrackId] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [playTrigger, setPlayTrigger] = useState(0)
  const [roundResult, setRoundResult] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const notifId = useRef(0)

  const _addNotif = (text, color = 'cyan') => {
    const id = ++notifId.current
    setNotifications(prev => [...prev.slice(-4), { id, text, color }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  const connect = useCallback((roomCode, token) => {
    if (wsRef.current) wsRef.current.close()

    const url = `${WS_BASE}/api/doi-dau/ws/${roomCode}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => { setConnected(false); setPhase('disconnected') }
    ws.onerror = () => setError('Mất kết nối. Vui lòng thử lại.')

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      switch (msg.type) {
        case 'room_state':
          setPhase(msg.phase)
          setPlayers(msg.players)
          setHostId(msg.host_id)
          setRound(msg.round)
          setTotalRounds(msg.total_rounds)
          setCode(msg.code)
          setArtistIds(msg.artist_ids || [])
          setPlaylistIds(msg.playlist_ids || [])
          break

        case 'player_joined':
          setPlayers(prev => {
            const exists = prev.find(p => p.id === msg.player.id)
            return exists
              ? prev.map(p => p.id === msg.player.id ? msg.player : p)
              : [...prev, msg.player]
          })
          _addNotif(`${msg.player.name} đã vào phòng`, 'cyan')
          break

        case 'player_left':
          setPlayers(prev => prev.filter(p => p.id !== msg.player_id))
          break

        case 'host_changed':
          setHostId(msg.host_id)
          break

        case 'round_start':
          setTrackId(msg.track_id)
          setRound(msg.round)
          setTotalRounds(msg.total_rounds)
          setRoundResult(null)
          setGameResult(null)
          setCountdown(null)
          setPlayTrigger(0)
          break

        case 'player_ready':
          setPlayers(prev => prev.map(p =>
            p.id === msg.player_id ? { ...p, is_ready: true } : p
          ))
          break

        case 'countdown':
          setCountdown(msg.seconds)
          break

        case 'play_now':
          setCountdown(null)
          setPlayTrigger(t => t + 1)
          break

        case 'player_guessed':
          setPlayers(prev => prev.map(p =>
            p.id === msg.player_id
              ? { ...p, has_guessed: true, correct_this_round: msg.correct }
              : p
          ))
          if (msg.correct) {
            _addNotif(`${msg.name} đoán đúng! #${msg.position}`, 'lime')
          }
          break

        case 'round_end':
          setPlayers(prev => {
            const map = {}
            msg.scores.forEach(s => { map[s.player_id] = s })
            return prev.map(p => map[p.id]
              ? { ...p, score: map[p.id].score, round_pts: map[p.id].round_pts, correct_this_round: map[p.id].correct }
              : p
            )
          })
          setRoundResult(msg)
          setPhase('round_end')
          break

        case 'game_end':
          setGameResult(msg)
          setPhase('game_end')
          break

        case 'error':
          setError(msg.message)
          break

        default:
          break
      }
    }

    return () => ws.close()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const _send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const sendReady = useCallback(() => _send({ type: 'ready' }), [_send])
  const sendGuess = useCallback((tId) => _send({ type: 'guess', track_id: tId }), [_send])
  const sendSkip = useCallback(() => _send({ type: 'skip' }), [_send])
  const startGame = useCallback(() => _send({ type: 'start_game' }), [_send])
  const nextRound = useCallback(() => _send({ type: 'next_round' }), [_send])

  return {
    connected, phase, players, hostId, round, totalRounds, code,
    artistIds, playlistIds, trackId, countdown, playTrigger,
    roundResult, gameResult, notifications, error,
    connect, disconnect, sendReady, sendGuess, sendSkip, startGame, nextRound,
    clearError: () => setError(null),
  }
}
