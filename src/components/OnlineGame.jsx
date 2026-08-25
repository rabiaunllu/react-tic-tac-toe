import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getRoomStatusText,
  isConnectionError,
  isRoomNotFoundError,
  leaveRoom,
  requestRoomJson,
  startRoom,
} from '../api/roomsApi'
import { clearOnlineSession, writeOnlineSession } from '../sessionStorage'
import Board from './Board'
import PowerPanel from './PowerPanel'
import RoundResultModal from './RoundResultModal'
import RoundResultPreviewBar from './RoundResultPreviewBar'
import SoundToggle from './SoundToggle'
import { playSound, registerUserGesture } from '../game/soundManager'

const ROOM_INACTIVE_MESSAGE = 'Oda artık aktif değil. Menüye dönüp yeni oda oluşturabilirsin.'
const ONLINE_ARENA_POWER_OPTIONS = {
  gameMode: 'arena',
  opponentType: 'human',
  playContext: 'online',
}
const EMPTY_ARENA_POWER_COUNTS = {
  bomb: 0,
  shield: 0,
  boost: 0,
  trap: 0,
}
const ARENA_POWER_NAMES = {
  bomb: 'Bomba',
  shield: 'Kalkan',
  boost: 'Boost',
  trap: 'Kara Delik',
}

function pickRandomTarget(indexes) {
  return indexes[Math.floor(Math.random() * indexes.length)]
}

const onlineWinnerMessages = [
  ['Tempo sende.', 'Baskı hissedildi.'],
  ['Tahta ısındı.', 'Rakip bunu unutmaz.'],
  ['Sıra sende, baskı onda.', 'Bir hamlelik fark, büyük gürültü.'],
  ['Temiz baskı.', 'Ritim sende kaldı.'],
]

const onlineLoserMessages = [
  ['Plan biraz kaydı.', 'Rövanş kokusu geldi.'],
  ['Rakip öne geçti.', 'Bir sonraki tur cevap zamanı.'],
  ['Baskı hissedildi.', 'Tahta daha bitmedi.'],
  ['Bu tur kaçtı.', 'Rövanş için güzel sebep.'],
]

const onlineDrawMessages = [
  ['Tahta kilitlendi.', 'Kimse düşmedi.'],
  ['Denge bozulmadı.', 'Rövanş kokusu geldi.'],
  ['Planlar çarpıştı.', 'Ses var, kazanan yok.'],
  ['Beraberlik çıktı.', 'Tahta ısındı.'],
]

function getBoardSignature(room) {
  return `${room.game.roundNumber}:${room.game.squares.join('|')}`
}

function getResultSignature(room) {
  return `${room.game.roundNumber}:${room.game.winner ?? ''}:${room.game.isDraw}:${room.status}:${room.game.isForfeit ? 'forfeit' : 'normal'}`
}

function pickRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)]
}

function createOnlineRoundMessage(room, mySymbol) {
  if (!room.game.winner && !room.game.isDraw && room.status !== 'completed') {
    return null
  }

  const isForfeit = Boolean(
    room.game.isForfeit ||
    (room.status === 'completed' && (!room.game.winningLine || room.game.winningLine.length === 0) && room.game.winner)
  )

  if (isForfeit) {
    if (room.game.winner === mySymbol) {
      return ['🏆 Rakip oyundan ayrıldı ', 'Rakip maçtan çekildi. Hükmen galip ilan edildin!']
    }
    return ['🏳️ Maçtan çekilindi', 'Oyundan ayrıldığın için hükmen mağlubiyet.']
  }

  if (room.game.isDraw) {
    return pickRandomMessage(onlineDrawMessages)
  }

  return pickRandomMessage(
    room.game.winner === mySymbol ? onlineWinnerMessages : onlineLoserMessages
  )
}

function getStatusMessage({ room, mySymbol, reconnectSeconds = 30 }) {
  if (room.status === 'reconnecting') {
    return `📡 Rakibin interneti koptu. Yeniden bağlanması bekleniyor... (${reconnectSeconds}s)`
  }

  if (room.status === 'waiting') {
    return 'Rakip bekleniyor'
  }

  if (room.status === 'ready') {
    return mySymbol === 'X' ? 'Oyunu başlatabilirsin' : 'Oda sahibi oyunu başlatacak'
  }

  if (room.status !== 'playing') {
    return getRoomStatusText(room.status)
  }

  if (room.game.winner) {
    if (room.gameMode === 'arena') {
      return room.game.winner === mySymbol
        ? 'Raunt senin · Puanlar işlendi'
        : 'Rakip raundu aldı'
    }

    return room.game.winner === mySymbol ? 'Turu kazandın' : 'Rakip turu kazandı'
  }

  if (room.game.isDraw) {
    return room.gameMode === 'arena' ? 'Arena raundu berabere' : 'Tur berabere bitti'
  }

  const currentSymbol = room.game.xIsNext ? 'X' : 'O'

  return currentSymbol === mySymbol ? 'Sıra sende' : 'Sıranı bekle'
}




export default function OnlineGame({ initialOnlineGame, onMenu }) {
  const eventIdRef = useRef(1)

  const [room, setRoom] = useState(initialOnlineGame.room)
  const [actionError, setActionError] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [isRoomInactive, setIsRoomInactive] = useState(false)
  const [isMovePending, setIsMovePending] = useState(false)
  const [isPowerPending, setIsPowerPending] = useState(false)
  const [activePower, setActivePower] = useState(null)
  const [bombEvent, setBombEvent] = useState(null)
  const [blackHoleEvent, setBlackHoleEvent] = useState(null)
  const [vampireTransferEvent, setVampireTransferEvent] = useState(null)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isNextRoundPending, setIsNextRoundPending] = useState(false)
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
  const [isRoundResultDismissed, setIsRoundResultDismissed] = useState(false)
  const [reconnectSeconds, setReconnectSeconds] = useState(30)
  const [onlineRoundMessage, setOnlineRoundMessage] = useState(() =>
    createOnlineRoundMessage(initialOnlineGame.room, initialOnlineGame.symbol)
  )

  useEffect(() => {
    if (room.status !== 'reconnecting') {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setReconnectSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [room.status])
  const onlineRoundMessageSignatureRef = useRef(getResultSignature(initialOnlineGame.room))
  const previousRoomRef = useRef(initialOnlineGame.room)
  const pendingLocalMoveSignatureRef = useRef(null)
  const resultSoundSignatureRef = useRef(getResultSignature(initialOnlineGame.room))
  const roomJsonCacheRef = useRef(null)

  const roomCode = initialOnlineGame.roomCode || room.code || room.roomCode || initialOnlineGame.room?.code || ''
  const playerId = initialOnlineGame.playerId
  const playerSecret = initialOnlineGame.playerSecret
  const ownerPlayer = room.players[0]
  const guestPlayer = room.players[1]
  const myPlayer = room.players.find((player) => player.id === playerId)
  const mySymbol = myPlayer?.symbol ?? ''
  const currentSymbol = room.game.xIsNext ? 'X' : 'O'
  const isArena = room.gameMode === 'arena'
  const isRoundFinished = Boolean(room.game.winner) || room.game.isDraw || room.status === 'completed'
  const nextRoundPlayerIds = room.game.nextRoundPlayerIds ?? []
  const hasRequestedNextRound = nextRoundPlayerIds.includes(playerId)
  const waitingNextRoundCount = nextRoundPlayerIds.length
  const canMove =
    room.status === 'playing' &&
    !room.game.winner &&
    !room.game.isDraw &&
    mySymbol === currentSymbol &&
    !isMovePending &&
    !isPowerPending &&
    !isRoomInactive
  const playerPowers = room.game.playerPowers ?? {}
  const ownerPowerCounts = playerPowers[ownerPlayer?.id] ?? EMPTY_ARENA_POWER_COUNTS
  const guestPowerCounts = playerPowers[guestPlayer?.id] ?? EMPTY_ARENA_POWER_COUNTS
  const shieldedSquares = room.game.shieldedSquares ?? []
  const boostedSquares = room.game.boostedSquares ?? []
  const lockedSquares = room.game.lockedSquares ?? []
  const frozenSquares = room.game.frozenSquares ?? []
  const hasUsedPowerThisTurn = room.game.hasUsedPowerThisTurn ?? false
  const visibleLockedSquares = bombEvent
    ? Array.from(new Set([...lockedSquares, bombEvent.index]))
    : lockedSquares
  const boostMode = room.boostMode ?? 'manual'
  const visibleBoostedSquares = boostMode === 'random'
    ? boostedSquares.filter((index) => Boolean(room.game.squares[index]))
    : boostedSquares

  const stolenSquares = room.game.stolenSquares ?? []
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X'
  const vampireSources = Object.keys(room.game.multipliers ?? {})
    .map(Number)
    .filter((idx) => room.game.squares[idx] === opponentSymbol && !stolenSquares.includes(idx))
  const vampireTargets = room.game.squares.flatMap((square, index) =>
    square === mySymbol && !(room.game.multipliers && room.game.multipliers[index] !== undefined)
      ? [index]
      : []
  )

  const arenaPowerTargets = {
    bomb: room.game.squares.flatMap((square, index) =>
      square && !shieldedSquares.includes(index) ? [index] : []
    ),
    shield: room.game.squares.flatMap((square, index) =>
      square === mySymbol && !shieldedSquares.includes(index) ? [index] : []
    ),
    boost: room.game.squares.flatMap((square, index) =>
      !square && !boostedSquares.includes(index) && !lockedSquares.includes(index) ? [index] : []
    ),
    trap: room.game.squares.flatMap((square, index) =>
      !square && !lockedSquares.includes(index) ? [index] : []
    ),
    freeze: room.game.squares.flatMap((square, index) =>
      !square && !lockedSquares.includes(index) && !frozenSquares.includes(index) ? [index] : []
    ),
    vampire: vampireSources.length > 0 && vampireTargets.length > 0 ? vampireSources : [],
  }
  const activePowerTargets = isArena && activePower ? arenaPowerTargets[activePower] ?? [] : null
  const ownerIsActive =
    ownerPlayer?.symbol === currentSymbol && !isRoundFinished && room.status === 'playing'
  const guestIsActive =
    guestPlayer?.symbol === currentSymbol && !isRoundFinished && room.status === 'playing'
  const canRequestNextRound = isRoundFinished && room.status !== 'completed' && !isRoomInactive
  const winningLine = room.game.winningLine.length > 0 ? room.game.winningLine : null
  const roundResultMessage = onlineRoundMessage ?? ['Tahta ısındı.', 'Rövanş hazır.']
  const nextRoundStatusMessage = hasRequestedNextRound
    ? 'Rakip bekleniyor.'
    : waitingNextRoundCount > 0
      ? 'Rakip sonraki tura hazır.'
      : roundResultMessage[1]
  const nextRoundLabel = room.status === 'completed'
    ? 'Maç tamamlandı'
    : hasRequestedNextRound
      ? 'Rakip bekleniyor'
      : isNextRoundPending
        ? 'Hazırlanıyor...'
        : 'Sonraki tur'
  const isNextRoundDisabled =
    isNextRoundPending || hasRequestedNextRound || !canRequestNextRound

  const applyRoom = useCallback((nextRoom) => {
    const nextJson = JSON.stringify(nextRoom)

    // Performance Optimization: Skip re-rendering if room state hasn't changed
    if (nextJson === roomJsonCacheRef.current) {
      return
    }
    roomJsonCacheRef.current = nextJson

    const nextResultSignature = getResultSignature(nextRoom)
    const nextCurrentSymbol = nextRoom.game.xIsNext ? 'X' : 'O'

    if (nextResultSignature !== onlineRoundMessageSignatureRef.current) {
      onlineRoundMessageSignatureRef.current = nextResultSignature
      setOnlineRoundMessage(createOnlineRoundMessage(nextRoom, mySymbol))
      setIsRoundResultDismissed(false)
    }

    if (nextCurrentSymbol !== mySymbol || nextRoom.game.winner || nextRoom.game.isDraw) {
      setActivePower(null)
    }

    setRoom(nextRoom)
  }, [mySymbol])

  async function submitPowerAction(powerId, targetIndex) {
    setActionError('')
    setIsPowerPending(true)

    try {
      if (powerId === 'vampire') {
        const sourceIndex = targetIndex
        const targetStoneIndex = room.game.squares.findIndex(
          (sq, idx) => sq === mySymbol && !(room.game.multipliers && room.game.multipliers[idx] !== undefined)
        )
        const mult = room.game.multipliers?.[sourceIndex] ?? 2
        if (targetStoneIndex >= 0) {
          eventIdRef.current += 1
          setVampireTransferEvent({
            sourceIndex,
            targetIndex: targetStoneIndex,
            multiplier: mult,
            id: eventIdRef.current,
          })
        }
      }

      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/powers`, {
        method: 'POST',
        body: JSON.stringify({
          playerId,
          playerSecret,
          powerId,
          targetIndex,
        }),
      })

      if (powerId === 'bomb') {
        setBombEvent({ index: targetIndex })
      }

      if (powerId === 'trap') {
        setBlackHoleEvent({ index: targetIndex })
      }

      applyRoom(nextRoom)
      setActivePower(null)
      playSound(powerId === 'bomb' ? 'bomb' : powerId === 'trap' ? 'blackhole' : 'power')
      setConnectionMessage('')
    } catch (error) {
      handleRoomError(error, setActionError)
    } finally {
      setIsPowerPending(false)
    }
  }

  async function handleRandomBoostPower() {
    registerUserGesture()

    if (!canMove || arenaPowerTargets.boost.length === 0) {
      setActionError('Bu hedef uygun değil.')
      return
    }

    const targetIndex = pickRandomTarget(arenaPowerTargets.boost)
    await submitPowerAction('boost', targetIndex)
  }

  async function handleSquareClick(index) {
    registerUserGesture()

    if (!canMove) {
      return
    }

    if (isArena && activePower) {
      setActionError('')

      if ((playerPowers[playerId]?.[activePower] ?? 0) <= 0) {
        setActivePower(null)
        setActionError('Bu güç bitti.')
        return
      }

      if (!activePowerTargets.includes(index)) {
        setActionError(
          activePower === 'bomb' || activePower === 'shield'
            ? 'Önce uygun bir taş seç.'
            : 'Bu hedef uygun değil.'
        )
        return
      }

      submitPowerAction(activePower, index)
      return
    }

    if (room.game.squares[index] || lockedSquares.includes(index)) {
      return
    }

    setActionError('')
    setIsMovePending(true)
    const currentRoomSnapshot = room

    // Optimistic UI Update: Render local move immediately (0ms latency feel!)
    const optimisticSquares = [...room.game.squares]
    optimisticSquares[index] = mySymbol
    const optimisticRoom = {
      ...room,
      game: {
        ...room.game,
        squares: optimisticSquares,
        xIsNext: !room.game.xIsNext,
      },
    }

    applyRoom(optimisticRoom)
    playSound('move')

    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/moves`, {
        method: 'POST',
        body: JSON.stringify({
          playerId,
          playerSecret,
          index,
        }),
      })
      const wasBlackHoleTriggered = nextRoom.game.squares[index] === null

      if (wasBlackHoleTriggered) {
        setBlackHoleEvent({ index })
        playSound('blackhole')
      }

      pendingLocalMoveSignatureRef.current = getBoardSignature(nextRoom)
      applyRoom(nextRoom)
      setConnectionMessage('')
    } catch (error) {
      // Rollback optimistic state if server rejects or connection drops
      applyRoom(currentRoomSnapshot)
      handleRoomError(error, setActionError)
    } finally {
      setIsMovePending(false)
    }
  }

  async function handleNextRound() {
    registerUserGesture()
    playSound('click')

    if (!canRequestNextRound) {
      return
    }

    setBombEvent(null)
    setBlackHoleEvent(null)
    setVampireTransferEvent(null)
    setActionError('')
    setConnectionMessage('')
    setIsNextRoundPending(true)

    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/next-round`, {
        method: 'POST',
        body: JSON.stringify({ playerId, playerSecret }),
      })

      applyRoom(nextRoom)
    } catch (error) {
      handleRoomError(error, setActionError)
    } finally {
      setIsNextRoundPending(false)
    }
  }

  async function handleStartRoom() {
    registerUserGesture()
    playSound('click')

    if (room.status !== 'ready' || ownerPlayer?.id !== playerId) {
      return
    }

    setActionError('')
    setConnectionMessage('')
    setIsStartPending(true)

    try {
      const nextRoom = await startRoom(roomCode, playerId, playerSecret)
      applyRoom(nextRoom)
    } catch (error) {
      handleRoomError(error, setActionError)
    } finally {
      setIsStartPending(false)
    }
  }

  function handleRoomError(error, setMessage) {
    if (isRoomNotFoundError(error)) {
      clearOnlineSession()
      setIsRoomInactive(true)
      setConnectionMessage('')
      setMessage(ROOM_INACTIVE_MESSAGE)
      return
    }

    setMessage(error.message)
  }

  useEffect(() => {
    const previousRoom = previousRoomRef.current
    const nextBoardSignature = getBoardSignature(room)
    const previousBoardSignature = getBoardSignature(previousRoom)
    const previousMoveCount = previousRoom.game.squares.filter(Boolean).length
    const nextMoveCount = room.game.squares.filter(Boolean).length

    // If round number changed (new round started), reset active events and do not detect power diffs
    if (previousRoom.game.roundNumber !== room.game.roundNumber) {
      setBombEvent(null)
      setBlackHoleEvent(null)
      setVampireTransferEvent(null)
      previousRoomRef.current = room
      return
    }

    if (nextBoardSignature !== previousBoardSignature) {
      if (pendingLocalMoveSignatureRef.current === nextBoardSignature) {
        pendingLocalMoveSignatureRef.current = null
      } else {
        if (nextMoveCount > previousMoveCount && room.status === 'playing') {
          playSound('move')
        }

        // Opponent Power Detection: Bomb (only within same round)
        const previousSquares = previousRoom.game.squares
        const currentSquares = room.game.squares
        for (let i = 0; i < currentSquares.length; i++) {
          if (previousSquares[i] && !currentSquares[i] && room.game.lockedSquares?.includes(i)) {
            setBombEvent({ index: i })
            playSound('bomb')
            break
          }
        }

        // Opponent Power Detection: Vampire (only within same round when both squares contain stones)
        const prevMults = previousRoom.game.multipliers || {}
        const currMults = room.game.multipliers || {}
        const lostSource = Object.keys(prevMults).find((idx) => !currMults[idx])
        const gainedTarget = Object.keys(currMults).find((idx) => !prevMults[idx])
        if (
          lostSource !== undefined &&
          gainedTarget !== undefined &&
          room.game.squares[lostSource] &&
          room.game.squares[gainedTarget]
        ) {
          eventIdRef.current += 1
          setVampireTransferEvent({
            sourceIndex: Number(lostSource),
            targetIndex: Number(gainedTarget),
            multiplier: currMults[gainedTarget] ?? 2,
            id: eventIdRef.current,
          })
          playSound('power')
        }
      }
    }

    const resultSignature = getResultSignature(room)

    if (
      resultSignature !== resultSoundSignatureRef.current &&
      (room.game.winner || room.game.isDraw)
    ) {
      playSound(room.game.isDraw ? 'draw' : 'win')
    }

    resultSoundSignatureRef.current = resultSignature
    previousRoomRef.current = room
  }, [room])

  // Adaptive Polling Effect: Fast detection when waiting for opponent, reduced server load on my turn or completed game
  useEffect(() => {
    let isPollingActive = true
    let timeoutId = null

    async function pollRoom() {
      // Security/Performance: Skip polling when tab is hidden
      if (document.visibilityState === 'hidden') {
        scheduleNextPoll()
        return
      }

      try {
        const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}`)

        if (isPollingActive) {
          applyRoom(nextRoom)
          setConnectionMessage('')
          setIsRoomInactive(false)
        }
      } catch (error) {
        if (isPollingActive) {
          if (isRoomNotFoundError(error)) {
            clearOnlineSession()
            setIsRoomInactive(true)
            setConnectionMessage('')
            setActionError(ROOM_INACTIVE_MESSAGE)
            return
          }

          if (isConnectionError(error)) {
            setConnectionMessage(error.message)
          } else {
            setActionError(error.message)
          }
        }
      } finally {
        if (isPollingActive) {
          scheduleNextPoll()
        }
      }
    }

    function scheduleNextPoll() {
      if (!isPollingActive) return

      // Adaptive polling delay:
      // - Opponent turn (waiting for move): 1200ms (fast response!)
      // - My turn (thinking): 3500ms (cuts server traffic in half)
      // - Completed / Inactive: 8000ms (minimizes idle traffic)
      let delay = 2000
      if (room.status === 'completed' || isRoomInactive) {
        delay = 8000
      } else if (mySymbol === currentSymbol && room.status === 'playing') {
        delay = 3500
      } else if (mySymbol !== currentSymbol && room.status === 'playing') {
        delay = 1200
      }

      timeoutId = window.setTimeout(pollRoom, delay)
    }

    scheduleNextPoll()

    return () => {
      isPollingActive = false
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [applyRoom, roomCode, room.status, isRoomInactive, mySymbol, currentSymbol])

  useEffect(() => {
    if (!bombEvent) {
      return undefined
    }

    const timerId = window.setTimeout(() => setBombEvent(null), 760)
    return () => window.clearTimeout(timerId)
  }, [bombEvent])

  useEffect(() => {
    if (!blackHoleEvent) {
      return undefined
    }

    const timerId = window.setTimeout(() => setBlackHoleEvent(null), 1150)
    return () => window.clearTimeout(timerId)
  }, [blackHoleEvent])

  useEffect(() => {
    if (!vampireTransferEvent) {
      return undefined
    }

    const timerId = window.setTimeout(() => setVampireTransferEvent(null), 1000)
    return () => window.clearTimeout(timerId)
  }, [vampireTransferEvent])

  useEffect(() => {
    if (roomCode && playerId && mySymbol && room.status !== 'completed') {
      writeOnlineSession({
        roomCode,
        playerId,
        playerSecret,
        symbol: mySymbol,
        playerName: myPlayer?.name ?? '',
      })
    }
  }, [roomCode, playerId, playerSecret, mySymbol, myPlayer?.name, room.status])

  async function handleOnlineMenuWithLeave() {
    registerUserGesture()
    playSound('click')
    try {
      await leaveRoom(roomCode, playerId, playerSecret, { isSurrender: true })
    } catch {
      // Proceed with local menu navigation
    }
    clearOnlineSession()
    onMenu()
  }

  return (
    <main className="app-shell">
      <section className="game-card online-game-card">
        <header className="game-header brand-header">
          <h1>XO ARENA</h1>
          <p>Taşını koy. Gücünü kullan. Rövanşı al.</p>
          <div className="match-chip-row" aria-label="Online maç bilgileri">
            <span className={`match-chip ${room.gameMode}`}>{room.gameMode === 'arena' ? 'ARENA' : 'KLASİK'}</span>
            <span className="match-chip">{room.targetValue} {isArena ? 'PUAN' : 'TUR'}</span>
            <span className="match-chip">{room.boardSize}x{room.boardSize}</span>
            <span className="match-chip">{room.winLength} TAŞ</span>
            <span className="match-chip online-code-chip">ODA: <strong>{roomCode}</strong></span>
          </div>
        </header>

        <div className="game-actions">
          <button
            className="setup-back-button"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              setIsMenuConfirmOpen(true)
            }}
          >
            Menüye dön
          </button>
          <SoundToggle />
        </div>

        {isMenuConfirmOpen && (
          <div className="setup-return-confirm">
            <strong>Menüye dönülsün mü?</strong>

            <div className="setup-return-actions">
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  setIsMenuConfirmOpen(false)
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={handleOnlineMenuWithLeave}
              >
                Menüye dön
              </button>
            </div>
          </div>
        )}

        {room.status === 'reconnecting' && (
          <div className="online-reconnecting-hud" role="alert" aria-live="assertive">
            <div className="reconnect-hud-radar">
              <span className="radar-pulse"></span>
              <span className="radar-icon">📡</span>
            </div>
            <div className="reconnect-hud-info">
              <strong>Rakibin İnterneti Koptu</strong>
              <small>Yeniden bağlanması bekleniyor...</small>
            </div>
            <div className="reconnect-hud-timer" aria-label={`Kalan süre ${reconnectSeconds} saniye`}>
              <svg className="reconnect-countdown-svg" viewBox="0 0 36 36">
                <path
                  className="reconnect-circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="reconnect-circle-progress"
                  strokeDasharray={`${(reconnectSeconds / 30) * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="reconnect-timer-text">{reconnectSeconds}s</span>
            </div>
          </div>
        )}

        {!isArena && (
          <div className="online-turn-line" role="status" aria-live="polite">
            {isRoomInactive ? 'Oda aktif değil' : getStatusMessage({ room, mySymbol, reconnectSeconds })}
          </div>
        )}

        {connectionMessage && !isRoomInactive && (
          <div className="online-message" role="status">
            {connectionMessage}
          </div>
        )}

        {actionError && (
          <div className="online-message online-message--error" role="alert">
            {actionError}
          </div>
        )}

        {room.status === 'ready' && ownerPlayer?.id === playerId && (
          <button
            type="button"
            className="online-primary-action"
            onClick={handleStartRoom}
            disabled={isStartPending || isRoomInactive}
            title={isRoomInactive ? 'Oda artık aktif değil.' : undefined}
          >
            {isStartPending ? 'Başlatılıyor...' : 'Oyunu başlat'}
          </button>
        )}

        {blackHoleEvent && (
          <div className="black-hole-message" role="status" aria-live="assertive">
            KARA DELİK! Alan büküldü.
          </div>
        )}

        <div className={`arena-board-stack ${isArena ? 'online-arena-stack' : 'online-classic-stack'}`}>
          {isArena ? (
            <>
              <PowerPanel
                currentPlayer={ownerPlayer?.symbol ?? 'X'}
                playerName={ownerPlayer?.name ?? 'Oda Sahibi'}
                score={ownerPlayer?.score ?? 0}
                scoreLabel="Puan"
                powerOptions={ONLINE_ARENA_POWER_OPTIONS}
                isActivePlayer={ownerIsActive}
                canInteract={ownerPlayer?.id === playerId && canMove}
                isPowersEnabled={Boolean(ownerPlayer)}
                powerCounts={ownerPowerCounts}
                activePower={ownerPlayer?.id === playerId ? activePower : null}
                boostMode={boostMode}
                statusText={
                  ownerIsActive
                    ? ownerPlayer?.id === playerId
                      ? activePower
                        ? 'Güç hazır. Parlayan hedeflerden birini seç.'
                        : 'Hamle sende. Güç seç veya taş koy.'
                      : 'Rakibin hamlesi bekleniyor.'
                    : 'Sıranı bekle, tahtayı oku.'
                }
                hasUsedPowerThisTurn={hasUsedPowerThisTurn}
                onSelectPower={setActivePower}
                onUseRandomBoost={handleRandomBoostPower}
              />

              <Board
                boardSize={room.boardSize}
                squares={room.game.squares}
                multipliers={room.game.multipliers ?? {}}
                winningLine={winningLine}
                shieldedSquares={shieldedSquares}
                lockedSquares={visibleLockedSquares}
                frozenSquares={frozenSquares}
                visibleBoostedSquares={visibleBoostedSquares}
                powerTargetIndexes={activePowerTargets}
                powerTargetLabel={ARENA_POWER_NAMES[activePower]}
                onSquareClick={handleSquareClick}
                currentPlayer={mySymbol}
                blackHoleEventIndex={blackHoleEvent?.index}
                bombEventIndex={bombEvent?.index}
                vampireTransferEvent={vampireTransferEvent}
              />

              <PowerPanel
                currentPlayer={guestPlayer?.symbol ?? 'O'}
                playerName={guestPlayer?.name ?? 'Rakip Bekleniyor...'}
                score={guestPlayer?.score ?? 0}
                scoreLabel="Puan"
                powerOptions={ONLINE_ARENA_POWER_OPTIONS}
                isActivePlayer={guestIsActive}
                canInteract={guestPlayer?.id === playerId && canMove}
                isPowersEnabled={Boolean(guestPlayer)}
                powerCounts={guestPowerCounts}
                activePower={guestPlayer?.id === playerId ? activePower : null}
                boostMode={boostMode}
                hasUsedPowerThisTurn={hasUsedPowerThisTurn}
                statusText={
                  !guestPlayer
                    ? 'Rakip katılması bekleniyor...'
                    : guestIsActive
                      ? guestPlayer?.id === playerId
                        ? activePower
                          ? 'Güç hazır. Parlayan hedeflerden birini seç.'
                          : 'Hamle sende. Güç seç veya taş koy.'
                        : 'Rakibin hamlesi bekleniyor.'
                      : 'Sıranı bekle, tahtayı oku.'
                }
                onSelectPower={setActivePower}
                onUseRandomBoost={handleRandomBoostPower}
              />
            </>
          ) : (
            <>
              <PowerPanel
                currentPlayer={ownerPlayer?.symbol ?? 'X'}
                playerName={ownerPlayer?.name ?? 'Oda Sahibi'}
                score={ownerPlayer?.score ?? 0}
                scoreLabel="Skor"
                powerOptions={{ gameMode: 'classic' }}
                isActivePlayer={ownerIsActive}
                canInteract={false}
                isPowersEnabled={false}
                powerCounts={{}}
                statusText={
                  ownerIsActive
                    ? ownerPlayer?.id === playerId
                      ? 'Hamle sende. En iyi çizgiyi kur.'
                      : 'Rakibin hamlesi bekleniyor.'
                    : 'Sıranı bekle, tahtayı oku.'
                }
              />
              <Board
                boardSize={room.boardSize}
                squares={room.game.squares}
                multipliers={{}}
                winningLine={winningLine}
                shieldedSquares={[]}
                lockedSquares={[]}
                frozenSquares={[]}
                visibleBoostedSquares={[]}
                onSquareClick={handleSquareClick}
                currentPlayer={mySymbol}
                bombEventIndex={null}
                vampireTransferEvent={null}
              />
              <PowerPanel
                currentPlayer={guestPlayer?.symbol ?? 'O'}
                playerName={guestPlayer?.name ?? (room.status === 'waiting' ? 'Rakip Bekleniyor...' : 'Oyuncu O')}
                score={guestPlayer?.score ?? 0}
                scoreLabel="Skor"
                powerOptions={{ gameMode: 'classic' }}
                isActivePlayer={guestIsActive}
                canInteract={false}
                isPowersEnabled={false}
                powerCounts={{}}
                statusText={
                  !guestPlayer
                    ? 'Rakip katılması bekleniyor...'
                    : guestIsActive
                      ? guestPlayer?.id === playerId
                        ? 'Hamle sende. En iyi çizgiyi kur.'
                        : 'Rakibin hamlesi bekleniyor.'
                      : 'Sıranı bekle, tahtayı oku.'
                }
              />
            </>
          )}
        </div>

        {isRoundFinished && isRoundResultDismissed && (
          <RoundResultPreviewBar
            onNextRound={handleNextRound}
            nextRoundLabel={nextRoundLabel}
            isNextRoundDisabled={isNextRoundDisabled}
            nextRoundTitle={
              room.status === 'completed'
                ? 'Maç tamamlandı.'
                : isRoomInactive
                  ? 'Oda artık aktif değil.'
                  : undefined
            }
            statusMessage={nextRoundStatusMessage}
          />
        )}
      </section>

      {isRoundFinished && !isRoundResultDismissed && (
        <RoundResultModal
          roundNumber={room.game.roundNumber}
          winner={room.game.winner}
          isDraw={room.game.isDraw}
          matchWinner={room.status === 'completed' ? (room.game.winner ?? mySymbol) : null}
          isForfeit={Boolean(
            room.game.isForfeit ||
            (room.status === 'completed' && (!room.game.winningLine || room.game.winningLine.length === 0) && room.game.winner)
          )}
          scores={{ X: ownerPlayer?.score ?? 0, O: guestPlayer?.score ?? 0 }}
          scoreLabel={isArena ? 'Puan' : 'Skor'}
          resultMessage={roundResultMessage[0]}
          loserMessage={roundResultMessage[1] || nextRoundStatusMessage}
          onNextRound={handleNextRound}
          onMenu={handleOnlineMenuWithLeave}
          nextRoundLabel={nextRoundLabel}
          isNextRoundDisabled={isNextRoundDisabled}
          nextRoundTitle={
            room.status === 'completed'
              ? 'Maç tamamlandı.'
              : isRoomInactive
                ? 'Oda artık aktif değil.'
                : undefined
          }
          menuConfirmTitle="Menüye dönülsün mü?"
          menuConfirmActionLabel="Menüye dön"
          onClose={() => setIsRoundResultDismissed(true)}
        />
      )}
    </main>
  )
}
