import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isRoomNotFoundError,
  leaveRoom,
  requestRoomJson,
  startRoom,
  timeoutRoom,
} from '../api/roomsApi'
import { useGameSync } from '../api/useGameSync'
import { clearOnlineSession, writeOnlineSession } from '../sessionStorage'
import Board from './Board'
import PowerPanel from './PowerPanel'
import RoundResultModal from './RoundResultModal'
import RoundResultPreviewBar from './RoundResultPreviewBar'
import FloatingEmote from './FloatingEmote'
import QuickEmoteBar from './QuickEmoteBar'
import SoundToggle from './SoundToggle'
import { playSound, registerUserGesture } from '../game/soundManager'
import { useTranslation } from '../i18n'
import { gameplayStart, gameplayStop, updateRoom, leftRoom } from '../services/crazyGamesService'

function isChatDisabledByPlatform() {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('disableChat') === 'true') return true
    if (window.CrazyGames?.SDK?.initialized && window.CrazyGames.SDK.game?.settings?.disableChat) return true
  } catch {
    // ignore
  }
  return false
}

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

const onlineWinnerMessages = {
  tr: [
    ['Tempo sende.', 'Baskı hissedildi.'],
    ['Tahta ısındı.', 'Rakip bunu unutmaz.'],
    ['Sıra sende, baskı onda.', 'Bir hamlelik fark, büyük gürültü.'],
    ['Temiz baskı.', 'Ritim sende kaldı.'],
  ],
  en: [
    ['Momentum is yours.', 'Pressure was felt.'],
    ['Board warmed up.', 'Opponent will remember this.'],
    ['Your turn, their pressure.', 'One move difference, big impact.'],
    ['Clean pressure.', 'Rhythm stayed with you.'],
  ],
}

const onlineLoserMessages = {
  tr: [
    ['Plan biraz kaydı.', 'Rövanş kokusu geldi.'],
    ['Rakip öne geçti.', 'Bir sonraki tur cevap zamanı.'],
    ['Baskı hissedildi.', 'Tahta daha bitmedi.'],
    ['Bu tur kaçtı.', 'Rövanş için güzel sebep.'],
  ],
  en: [
    ['Plan slipped away.', 'Revenge is brewing.'],
    ['Opponent took the lead.', 'Time to answer next round.'],
    ['Pressure was felt.', 'The board is not done yet.'],
    ['Lost this round.', 'Good reason for a rematch.'],
  ],
}

const onlineDrawMessages = {
  tr: [
    ['Tahta kilitlendi.', 'Kimse düşmedi.'],
    ['Denge bozulmadı.', 'Rövanş kokusu geldi.'],
    ['Planlar çarpıştı.', 'Ses var, kazanan yok.'],
    ['Beraberlik çıktı.', 'Tahta ısındı.'],
  ],
  en: [
    ['Board locked.', 'Nobody fell.'],
    ['Balance unbroken.', 'Revenge is brewing.'],
    ['Plans collided.', 'Sound and fury, no winner.'],
    ['Round drawn.', 'Board warmed up.'],
  ],
}

function getBoardSignature(room) {
  return `${room.game.roundNumber}:${room.game.squares.join('|')}`
}

function getResultSignature(room) {
  return `${room.game.roundNumber}:${room.game.winner ?? ''}:${room.game.isDraw}:${room.status}:${room.game.isForfeit ? 'forfeit' : 'normal'}`
}

function pickRandomMessage(messages) {
  if (!messages || messages.length === 0) return null
  return messages[Math.floor(Math.random() * messages.length)]
}

function createOnlineRoundMessage(room, mySymbol, isTr = true) {
  if (!room.game.winner && !room.game.isDraw && room.status !== 'completed') {
    return null
  }

  const isTimeout = Boolean(room.game.isTimeout)
  if (isTimeout) {
    const isWinner = room.game.winner === mySymbol
    if (isWinner) {
      return isTr
        ? ['⏰ Rakibin Süresi Bitti!', 'Rakibin hamle süresi doldu. Turu sen kazandın!']
        : ['⏰ Opponent Timed Out!', 'Opponent ran out of time. You won the round!']
    }
    return isTr
      ? ['⏰ Süren Bitti!', 'Hamle süren dolduğu için turu rakip kazandı.']
      : ['⏰ Time Is Up!', 'Turn timer expired. Opponent won the round.']
  }

  const isForfeit = Boolean(
    room.game.isForfeit ||
    (room.status === 'completed' && (!room.game.winningLine || room.game.winningLine.length === 0) && room.game.winner && !isTimeout)
  )

  if (isForfeit) {
    if (room.game.winner === mySymbol) {
      return isTr
        ? ['🏆 Rakip oyundan ayrıldı ', 'Rakip maçtan çekildi. Hükmen galip ilan edildin!']
        : ['🏆 Opponent left the match ', 'Opponent forfeited. You are declared the winner!']
    }
    return isTr
      ? ['🏳️ Maçtan çekilindi', 'Oyundan ayrıldığın için hükmen mağlubiyet.']
      : ['🏳️ Forfeited match', 'Forfeit loss due to leaving the game.']
  }

  const lang = isTr ? 'tr' : 'en'

  if (room.game.isDraw) {
    return pickRandomMessage(onlineDrawMessages[lang])
  }

  return pickRandomMessage(
    room.game.winner === mySymbol ? onlineWinnerMessages[lang] : onlineLoserMessages[lang]
  )
}






export default function OnlineGame({ initialOnlineGame, onMenu }) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const eventIdRef = useRef(1)

  const [room, setRoom] = useState(initialOnlineGame.room)
  const [actionError, setActionError] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [isRoomInactive, setIsRoomInactive] = useState(false)
  const [isMovePending, setIsMovePending] = useState(false)
  const [isPowerPending, setIsPowerPending] = useState(false)
  const isMovePendingRef = useRef(false)
  const isPowerPendingRef = useRef(false)
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
    createOnlineRoundMessage(initialOnlineGame.room, initialOnlineGame.symbol, isTr)
  )
  const [floatingEmotes, setFloatingEmotes] = useState([])

  const reconnectStartRef = useRef(null)

  useEffect(() => {
    if (room.status !== 'reconnecting') {
      reconnectStartRef.current = null
      return undefined
    }

    reconnectStartRef.current = Date.now()

    const timerId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - reconnectStartRef.current) / 1000)
      setReconnectSeconds(Math.max(0, 30 - elapsed))
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
  const myPlayer = room.players.find((player) => String(player.id).toLowerCase() === String(playerId).toLowerCase())
  const mySymbol = myPlayer?.symbol ?? ''
  const currentSymbol = room.game.xIsNext ? 'X' : 'O'
  const isArena = room.gameMode === 'arena'
  const turnTimeLimit = room.turnTimeLimit ?? room.game?.turnTimeLimit ?? 15
  const [turnTimeLeft, setTurnTimeLeft] = useState(turnTimeLimit)
  const isTimeoutCallingRef = useRef(false)
  const lastTickSecondRef = useRef(null)

  useEffect(() => {
    if (turnTimeLimit <= 0 || room.status !== 'playing' || room.game.winner || room.game.isDraw) {
      return
    }

    let currentRemaining = turnTimeLimit
    isTimeoutCallingRef.current = false
    lastTickSecondRef.current = Math.ceil(turnTimeLimit)

    const timerId = setTimeout(() => {
      setTurnTimeLeft(turnTimeLimit)
    }, 0)

    const interval = setInterval(() => {
      currentRemaining = Math.max(0, currentRemaining - 1)
      const currentWhole = Math.ceil(currentRemaining)

      if (currentRemaining <= 5 && currentRemaining > 0 && currentWhole !== lastTickSecondRef.current) {
        lastTickSecondRef.current = currentWhole
        playSound('click')
      }

      setTurnTimeLeft(currentRemaining)

      if (currentRemaining <= 0) {
        if (!isTimeoutCallingRef.current) {
          isTimeoutCallingRef.current = true
          timeoutRoom(roomCode, playerId, playerSecret).catch(() => {})
        }
      }
    }, 1000)

    return () => {
      clearTimeout(timerId)
      clearInterval(interval)
    }
  }, [turnTimeLimit, currentSymbol, room.game.roundNumber, room.status, room.game.winner, room.game.isDraw, playerId, playerSecret, roomCode])
  const isRoundFinished = Boolean(room.game.winner) || room.game.isDraw || room.status === 'completed'

  useEffect(() => {
    if (room.status === 'playing' && !isRoundFinished) {
      gameplayStart()
    } else if (isRoundFinished || room.status === 'completed') {
      gameplayStop()
    }
  }, [room.status, isRoundFinished])

  useEffect(() => {
    return () => {
      gameplayStop()
    }
  }, [])

  useEffect(() => {
    if (roomCode) {
      updateRoom({
        roomId: roomCode,
        isJoinable: false,
        inviteParams: { room: roomCode },
      })
    }
    return () => {
      leftRoom()
    }
  }, [roomCode])

  const isPlatformChatDisabled = isChatDisabledByPlatform()
  const nextRoundPlayerIds = room.game.nextRoundPlayerIds ?? []
  const hasRequestedNextRound = nextRoundPlayerIds.includes(playerId)
  const waitingNextRoundCount = nextRoundPlayerIds.length
  const canMove =
    room.status === 'playing' &&
    !room.game.winner &&
    !room.game.isDraw &&
    mySymbol === currentSymbol &&
    (turnTimeLimit <= 0 || turnTimeLeft > 0) &&
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
  const winningLine = room.game.winningLine?.length > 0 ? room.game.winningLine : null
  const roundResultMessage = onlineRoundMessage ?? (isTr ? ['Tahta ısındı.', 'Rövanş hazır.'] : ['Board warmed up.', 'Rematch ready.'])
  const nextRoundStatusMessage = hasRequestedNextRound
    ? (isTr ? 'Rakip bekleniyor.' : 'Waiting for opponent.')
    : waitingNextRoundCount > 0
      ? (isTr ? 'Rakip sonraki tura hazır.' : 'Opponent ready for next round.')
      : roundResultMessage[1]
  const nextRoundLabel = room.status === 'completed'
    ? (isTr ? 'Maç tamamlandı' : 'Match completed')
    : hasRequestedNextRound
      ? (isTr ? 'Rakip bekleniyor' : 'Waiting for opponent')
      : isNextRoundPending
        ? (isTr ? 'Hazırlanıyor...' : 'Preparing...')
        : (isTr ? 'Sonraki tur' : 'Next round')
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
    const nextMyPlayer = nextRoom.players?.find(
      (player) => String(player.id).toLowerCase() === String(playerId).toLowerCase()
    )
    const nextMySymbol = nextMyPlayer?.symbol ?? mySymbol

    if (nextResultSignature !== onlineRoundMessageSignatureRef.current) {
      onlineRoundMessageSignatureRef.current = nextResultSignature
      setOnlineRoundMessage(createOnlineRoundMessage(nextRoom, nextMySymbol, isTr))
      setIsRoundResultDismissed(false)
    }

    if (nextCurrentSymbol !== nextMySymbol || nextRoom.game.winner || nextRoom.game.isDraw) {
      setActivePower(null)
    }

    setRoom(nextRoom)
  }, [playerId, mySymbol, isTr])

  async function submitPowerAction(powerId, targetIndex) {
    if (isPowerPendingRef.current || isMovePendingRef.current) {
      return
    }
    isPowerPendingRef.current = true
    setIsPowerPending(true)
    setActionError('')

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

      const safeRoomCode = encodeURIComponent(String(roomCode ?? '').trim())
      const nextRoom = await requestRoomJson(`/api/rooms/${safeRoomCode}/powers`, {
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
      playSound(
        powerId === 'bomb'
          ? 'bomb'
          : powerId === 'trap'
            ? 'blackhole'
            : powerId === 'shield'
              ? 'shield'
              : powerId === 'freeze'
                ? 'freezeActivate'
                : powerId === 'vampire'
                  ? 'vampireDrain'
                  : 'power'
      )
      setConnectionMessage('')
    } catch (error) {
      if (powerId === 'vampire') {
        setVampireTransferEvent(null)
      }
      handleRoomError(error, setActionError)
    } finally {
      setIsPowerPending(false)
      isPowerPendingRef.current = false
    }
  }

  async function handleRandomBoostPower() {
    registerUserGesture()

    if (!canMove || isPowerPendingRef.current || isMovePendingRef.current || arenaPowerTargets.boost.length === 0) {
      setActionError(isTr ? 'Bu hedef uygun değil.' : 'Invalid target.')
      return
    }

    const targetIndex = pickRandomTarget(arenaPowerTargets.boost)
    await submitPowerAction('boost', targetIndex)
  }

  async function handleSquareClick(index) {
    registerUserGesture()

    if (!canMove || isMovePendingRef.current || isPowerPendingRef.current) {
      return
    }

    if (isArena && activePower) {
      setActionError('')

      if ((playerPowers[playerId]?.[activePower] ?? 0) <= 0) {
        setActivePower(null)
        setActionError(isTr ? 'Bu güç bitti.' : 'Power depleted.')
        return
      }

      if (!activePowerTargets.includes(index)) {
        setActionError(
          activePower === 'bomb' || activePower === 'shield'
            ? (isTr ? 'Önce uygun bir taş seç.' : 'Select an eligible mark first.')
            : (isTr ? 'Bu hedef uygun değil.' : 'Invalid target.')
        )
        return
      }

      await submitPowerAction(activePower, index)
      return
    }

    if (room.game.squares[index] || lockedSquares.includes(index)) {
      return
    }

    // Synchronously lock immediately before optimistic render & async dispatch
    isMovePendingRef.current = true
    setIsMovePending(true)
    setActionError('')
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
      const safeRoomCode = encodeURIComponent(String(roomCode ?? '').trim())
      const nextRoom = await requestRoomJson(`/api/rooms/${safeRoomCode}/moves`, {
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
      isMovePendingRef.current = false
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
      const safeRoomCode = encodeURIComponent(String(roomCode ?? '').trim())
      const nextRoom = await requestRoomJson(`/api/rooms/${safeRoomCode}/next-round`, {
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
          playSound('vampireDrain')
        }

        // Opponent Power Detection: Shield
        const previousShields = previousRoom.game.shieldedSquares || []
        const currentShields = room.game.shieldedSquares || []
        if (currentShields.length > previousShields.length) {
          playSound('shield')
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

  const handleEmoteComplete = useCallback((emoteInstanceId) => {
    setFloatingEmotes((prev) => prev.filter((e) => e.id !== emoteInstanceId))
  }, [])

  const handleQuickEmoteReceived = useCallback((payload) => {
    if (!payload?.emoteId) return
    if (payload.senderPlayerId === playerId) return

    const senderSymbol = payload.senderSymbol || (mySymbol === 'X' ? 'O' : 'X')
    const position = mySymbol === 'X' ? 'right' : 'left'

    setFloatingEmotes((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        emoteId: payload.emoteId,
        senderSymbol,
        position,
      },
    ])
    playSound('emote')
  }, [playerId, mySymbol])

  // Hybrid Real-time Synchronization (SignalR WebSocket + Adaptive Polling Fallback)
  const { sendEmote } = useGameSync({
    roomCode,
    playerId,
    playerSecret,
    onRoomUpdate: applyRoom,
    onConnectionMessage: setConnectionMessage,
    onRoomInactive: (inactive) => {
      if (inactive) {
        clearOnlineSession()
        setIsRoomInactive(true)
        setConnectionMessage('')
        setActionError(isTr ? 'Oda artık aktif değil. Menüye dönüp yeni oda oluşturabilirsin.' : 'Room is no longer active. Return to menu to create a new room.')
      } else {
        setIsRoomInactive(false)
      }
    },
    onError: (msg) => setActionError(msg),
    isMovePendingRef,
    isPowerPendingRef,
    enabled: Boolean(roomCode) && !isRoomInactive,
    roomStatus: room.status,
    isMyTurn: mySymbol === currentSymbol,
    onQuickEmote: handleQuickEmoteReceived,
  })

  const handleSendEmote = useCallback((emoteId) => {
    setFloatingEmotes((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        emoteId,
        senderSymbol: mySymbol,
        position: mySymbol === 'X' ? 'left' : 'right',
      },
    ])
    playSound('emote')
    sendEmote(emoteId)
  }, [mySymbol, sendEmote])

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
    } else if (room.status === 'completed') {
      clearOnlineSession()
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
    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    onMenu()
  }

  return (
    <main className="app-shell app-shell--playing">
      <section className="game-card online-game-card game-card--playing">
        <header className="game-header brand-header">
          <h1>XO TACTIX</h1>
          <div className="match-chip-row" aria-label={t('common.matchInfo')}>
            <span className={`match-chip ${room.gameMode}`}>{room.gameMode === 'arena' ? 'ARENA' : (isTr ? 'KLASİK' : 'CLASSIC')}</span>
            <span className="match-chip">{room.targetValue} {isArena ? (isTr ? 'PUAN' : 'PTS') : (isTr ? 'TUR' : 'ROUNDS')}</span>
            <span className="match-chip">{room.boardSize}x{room.boardSize}</span>
            <span className="match-chip">{room.winLength} {isTr ? 'TAŞ' : 'IN A ROW'}</span>
            <span className="match-chip match-chip--room">{isTr ? 'ODA' : 'ROOM'}: <strong>{roomCode}</strong></span>
          </div>
          <div className="game-actions">
            <button
              type="button"
              className="setup-back-button"
              onClick={() => {
                registerUserGesture()
                playSound('click')
                setIsMenuConfirmOpen(true)
              }}
              title={t('common.mainMenu')}
              aria-label={t('common.mainMenu')}
            >
              <svg className="game-action-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            <SoundToggle />
          </div>
        </header>

        {isMenuConfirmOpen && (
          <div
            className="confirm-modal-overlay"
            role="presentation"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              setIsMenuConfirmOpen(false)
            }}
          >
            <div
              className="setup-return-confirm"
              role="alertdialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <strong>{t('modals.confirmMenuTitle')}</strong>
              <p>{isTr ? 'Odadan ayrılacaksın ve maç sonlandırılacak.' : 'You will leave the room and forfeit the match.'}</p>

              <div className="setup-return-actions">
                <button
                  type="button"
                  onClick={() => {
                    registerUserGesture()
                    playSound('click')
                    setIsMenuConfirmOpen(false)
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={handleOnlineMenuWithLeave}
                >
                  {t('modals.confirmMenuAction')}
                </button>
              </div>
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
              <strong>{isTr ? 'Rakibin İnterneti Koptu' : 'Opponent Disconnected'}</strong>
              <small>{isTr ? 'Yeniden bağlanması bekleniyor...' : 'Waiting for reconnect...'}</small>
            </div>
            <div className="reconnect-hud-timer" aria-label={isTr ? `Kalan süre ${reconnectSeconds} saniye` : `${reconnectSeconds}s remaining`}>
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

        {isRoomInactive && (
          <div className="online-message online-message--error" role="alert">
            {isTr ? 'Oda aktif değil' : 'Room is inactive'}
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
            title={isRoomInactive ? (isTr ? 'Oda artık aktif değil.' : 'Room is inactive.') : undefined}
          >
            {isStartPending ? (isTr ? 'Başlatılıyor...' : 'Starting...') : (isTr ? 'Oyunu başlat' : 'Start Game')}
          </button>
        )}

        {blackHoleEvent && (
          <div className="black-hole-message" role="status" aria-live="assertive">
            {isTr ? 'KARA DELİK! Alan büküldü.' : 'BLACK HOLE! Space distorted.'}
          </div>
        )}

        <div className="floating-emotes-container" aria-live="polite">
          {floatingEmotes.map((emote) => (
            <FloatingEmote
              key={emote.id}
              emoteId={emote.emoteId}
              senderSymbol={emote.senderSymbol}
              position={emote.position}
              onComplete={() => handleEmoteComplete(emote.id)}
            />
          ))}
        </div>

        <div className={`arena-board-stack ${isArena ? 'online-arena-stack' : 'online-classic-stack'}`}>
          {isArena ? (
            <>
              <PowerPanel
                currentPlayer={ownerPlayer?.symbol ?? 'X'}
                playerName={ownerPlayer?.name ?? (isTr ? 'Oda Sahibi' : 'Host')}
                score={ownerPlayer?.score ?? 0}
                scoreLabel={isTr ? 'Puan' : 'Points'}
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
                        ? t('game.activePowerHint')
                        : t('game.turnActionHintArena')
                      : t('game.waitActionHintArena')
                    : t('game.waitActionHintClassic')
                }
                hasUsedPowerThisTurn={hasUsedPowerThisTurn}
                onSelectPower={setActivePower}
                onUseRandomBoost={handleRandomBoostPower}
                timeLimit={turnTimeLimit}
                timeLeft={turnTimeLeft}
                isWarning={turnTimeLeft <= 5}
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
                powerTargetLabel={activePower ? (t(`powers.${activePower}.name`) || ARENA_POWER_NAMES[activePower]) : undefined}
                onSquareClick={handleSquareClick}
                currentPlayer={currentSymbol ?? mySymbol}
                topPlayerSymbol={ownerPlayer?.symbol ?? 'X'}
                bottomPlayerSymbol={guestPlayer?.symbol ?? 'O'}
                activePower={activePower}
                blackHoleEventIndex={blackHoleEvent?.index}
                bombEventIndex={bombEvent?.index}
                vampireTransferEvent={vampireTransferEvent}
              />

              <PowerPanel
                currentPlayer={guestPlayer?.symbol ?? 'O'}
                playerName={guestPlayer?.name ?? (room.status === 'waiting' ? (isTr ? 'Rakip Bekleniyor...' : 'Waiting for Opponent...') : (isTr ? 'Misafir' : 'Guest'))}
                score={guestPlayer?.score ?? 0}
                scoreLabel={isTr ? 'Puan' : 'Points'}
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
                    ? (isTr ? 'Rakip katılması bekleniyor...' : 'Waiting for opponent to join...')
                    : guestIsActive
                      ? guestPlayer?.id === playerId
                        ? activePower
                          ? t('game.activePowerHint')
                          : t('game.turnActionHintArena')
                        : t('game.waitActionHintArena')
                      : t('game.waitActionHintClassic')
                }
                onSelectPower={setActivePower}
                onUseRandomBoost={handleRandomBoostPower}
                timeLimit={turnTimeLimit}
                timeLeft={turnTimeLeft}
                isWarning={turnTimeLeft <= 5}
              />
            </>
          ) : (
            <>
              <PowerPanel
                currentPlayer={ownerPlayer?.symbol ?? 'X'}
                playerName={ownerPlayer?.name ?? (isTr ? 'Oda Sahibi' : 'Host')}
                score={ownerPlayer?.score ?? 0}
                scoreLabel={isTr ? 'Skor' : 'Score'}
                powerOptions={{ gameMode: 'classic' }}
                isActivePlayer={ownerIsActive}
                canInteract={false}
                isPowersEnabled={false}
                powerCounts={{}}
                statusText={
                  ownerIsActive
                    ? ownerPlayer?.id === playerId
                      ? t('game.turnActionHintClassic')
                      : t('game.waitActionHintArena')
                    : t('game.waitActionHintClassic')
                }
                timeLimit={turnTimeLimit}
                timeLeft={turnTimeLeft}
                isWarning={turnTimeLeft <= 5}
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
                currentPlayer={currentSymbol ?? mySymbol}
                topPlayerSymbol={ownerPlayer?.symbol ?? 'X'}
                bottomPlayerSymbol={guestPlayer?.symbol ?? 'O'}
                activePower={null}
                bombEventIndex={null}
                vampireTransferEvent={null}
              />
              <PowerPanel
                currentPlayer={guestPlayer?.symbol ?? 'O'}
                playerName={guestPlayer?.name ?? (room.status === 'waiting' ? (isTr ? 'Rakip Bekleniyor...' : 'Waiting for Opponent...') : (isTr ? 'Misafir' : 'Guest'))}
                score={guestPlayer?.score ?? 0}
                scoreLabel={isTr ? 'Skor' : 'Score'}
                powerOptions={{ gameMode: 'classic' }}
                isActivePlayer={guestIsActive}
                canInteract={false}
                isPowersEnabled={false}
                powerCounts={{}}
                statusText={
                  !guestPlayer
                    ? (isTr ? 'Rakip katılması bekleniyor...' : 'Waiting for opponent to join...')
                    : guestIsActive
                      ? guestPlayer?.id === playerId
                        ? t('game.turnActionHintClassic')
                        : t('game.waitActionHintArena')
                      : t('game.waitActionHintClassic')
                }
                timeLimit={turnTimeLimit}
                timeLeft={turnTimeLeft}
                isWarning={turnTimeLeft <= 5}
              />
            </>
          )}

          {!isPlatformChatDisabled && room.status !== 'waiting' && room.status !== 'ready' && (
            <QuickEmoteBar
              onSendEmote={handleSendEmote}
              disabled={isRoomInactive || room.status === 'completed'}
            />
          )}
        </div>

        {isRoundFinished && isRoundResultDismissed && (
          <RoundResultPreviewBar
            onNextRound={handleNextRound}
            nextRoundLabel={nextRoundLabel}
            isNextRoundDisabled={isNextRoundDisabled}
            nextRoundTitle={
              room.status === 'completed'
                ? (isTr ? 'Maç tamamlandı.' : 'Match completed.')
                : isRoomInactive
                  ? (isTr ? 'Oda artık aktif değil.' : 'Room is inactive.')
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
          winningSymbol={room.game.winner}
          mySymbol={mySymbol}
          isDraw={room.game.isDraw}
          matchWinner={room.status === 'completed' ? (room.game.winner ?? mySymbol) : null}
          isForfeit={Boolean(
            room.game.isForfeit ||
            (room.status === 'completed' && (!room.game.winningLine || room.game.winningLine.length === 0) && room.game.winner && !room.game.isTimeout)
          )}
          isTimeout={Boolean(room.game.isTimeout)}
          scores={{ X: ownerPlayer?.score ?? 0, O: guestPlayer?.score ?? 0 }}
          scoreLabel={isArena ? (isTr ? 'Puan' : 'Points') : (isTr ? 'Skor' : 'Score')}
          resultMessage={roundResultMessage?.[0]}
          loserMessage={roundResultMessage?.[1] || nextRoundStatusMessage}
          player1Name={ownerPlayer?.name ?? (isTr ? 'Oda Sahibi' : 'Host')}
          player2Name={guestPlayer?.name ?? (room.status === 'waiting' ? (isTr ? 'Rakip Bekleniyor...' : 'Waiting for Opponent...') : (isTr ? 'Misafir' : 'Guest'))}
          onNextRound={handleNextRound}
          onNewMatch={handleOnlineMenuWithLeave}
          onMenu={handleOnlineMenuWithLeave}
          nextRoundLabel={nextRoundLabel}
          isNextRoundDisabled={isNextRoundDisabled}
          nextRoundTitle={
            room.status === 'completed'
              ? (isTr ? 'Maç tamamlandı.' : 'Match completed.')
              : isRoomInactive
                ? (isTr ? 'Oda artık aktif değil.' : 'Room is no longer active.')
                : undefined
          }
          menuConfirmTitle={isTr ? 'Menüye dönülsün mü?' : 'Return to menu?'}
          menuConfirmActionLabel={isTr ? 'Menü' : 'Menu'}
          onClose={() => setIsRoundResultDismissed(true)}
          gameMode={room.gameMode}
          boardSize={room.boardSize}
          winStreak={0}
          opponentType="online"
        />
      )}
    </main>
  )
}
