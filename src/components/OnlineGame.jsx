import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getRoomStatusText,
  isConnectionError,
  isRoomNotFoundError,
  requestRoomJson,
  startRoom,
} from '../api/roomsApi'
import { clearOnlineSession } from '../sessionStorage'
import Board from './Board'
import PowerPanel from './PowerPanel'
import RoundResultModal from './RoundResultModal'
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
  return `${room.game.roundNumber}:${room.game.winner ?? ''}:${room.game.isDraw}`
}

function pickRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)]
}

function createOnlineRoundMessage(room, mySymbol) {
  if (!room.game.winner && !room.game.isDraw) {
    return null
  }

  if (room.game.isDraw) {
    return pickRandomMessage(onlineDrawMessages)
  }

  return pickRandomMessage(
    room.game.winner === mySymbol ? onlineWinnerMessages : onlineLoserMessages
  )
}

function getStatusMessage({ room, mySymbol }) {
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

function OnlinePlayerPanel({ player, isActive, position }) {
  if (!player) {
    return (
      <section className="power-panel player-panel inactive-player online-seat-panel">
        <div className="player-panel-topline">
          <div className="player-identity">
            <span className="player-symbol">?</span>
            <span className="player-name">Rakip bekleniyor</span>
          </div>
          <div className="player-score">
            <small>Puan</small>
            <strong>0</strong>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`power-panel player-panel player-${player.symbol.toLowerCase()} online-seat-panel ${
        isActive ? 'active-player' : 'inactive-player'
      }`}
      aria-label={`${position} oyuncu paneli`}
    >
      <div className="player-panel-topline">
        <div className="player-identity">
          <span className="player-symbol">{player.symbol}</span>
          <span className="player-name">{player.name}</span>
        </div>
        <div className="player-score">
          <small>Puan</small>
          <strong>{player.score ?? 0}</strong>
        </div>
      </div>
    </section>
  )
}

export default function OnlineGame({ initialOnlineGame, onMenu }) {
  const [room, setRoom] = useState(initialOnlineGame.room)
  const [actionError, setActionError] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [isRoomInactive, setIsRoomInactive] = useState(false)
  const [isMovePending, setIsMovePending] = useState(false)
  const [isPowerPending, setIsPowerPending] = useState(false)
  const [activePower, setActivePower] = useState(null)
  const [bombEvent, setBombEvent] = useState(null)
  const [blackHoleEvent, setBlackHoleEvent] = useState(null)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isNextRoundPending, setIsNextRoundPending] = useState(false)
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
  const [onlineRoundMessage, setOnlineRoundMessage] = useState(() =>
    createOnlineRoundMessage(initialOnlineGame.room, initialOnlineGame.symbol)
  )
  const onlineRoundMessageSignatureRef = useRef(getResultSignature(initialOnlineGame.room))
  const previousRoomRef = useRef(initialOnlineGame.room)
  const pendingLocalMoveSignatureRef = useRef(null)
  const resultSoundSignatureRef = useRef(getResultSignature(initialOnlineGame.room))

  const { roomCode, playerId } = initialOnlineGame
  const ownerPlayer = room.players[0]
  const guestPlayer = room.players[1]
  const myPlayer = room.players.find((player) => player.id === playerId)
  const mySymbol = myPlayer?.symbol ?? ''
  const currentSymbol = room.game.xIsNext ? 'X' : 'O'
  const isArena = room.gameMode === 'arena'
  const isRoundFinished = Boolean(room.game.winner) || room.game.isDraw
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
  const visibleLockedSquares = bombEvent
    ? Array.from(new Set([...lockedSquares, bombEvent.index]))
    : lockedSquares
  const boostMode = room.boostMode ?? 'manual'
  const visibleBoostedSquares = boostMode === 'random'
    ? boostedSquares.filter((index) => Boolean(room.game.squares[index]))
    : boostedSquares
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
  }
  const activePowerTargets = isArena && activePower ? arenaPowerTargets[activePower] ?? [] : null
  const arenaDisabledPowers = {
    bomb: arenaPowerTargets.bomb.length === 0,
    shield: arenaPowerTargets.shield.length === 0,
    boost: arenaPowerTargets.boost.length === 0,
    trap: arenaPowerTargets.trap.length === 0,
  }
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
    const nextResultSignature = getResultSignature(nextRoom)
    const nextCurrentSymbol = nextRoom.game.xIsNext ? 'X' : 'O'

    if (nextResultSignature !== onlineRoundMessageSignatureRef.current) {
      onlineRoundMessageSignatureRef.current = nextResultSignature
      setOnlineRoundMessage(createOnlineRoundMessage(nextRoom, mySymbol))
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
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/powers`, {
        method: 'POST',
        body: JSON.stringify({
          playerId,
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

    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/moves`, {
        method: 'POST',
        body: JSON.stringify({
          playerId,
          index,
        }),
      })
      const wasBlackHoleTriggered = nextRoom.game.squares[index] === null

      if (wasBlackHoleTriggered) {
        setBlackHoleEvent({ index })
      }

      pendingLocalMoveSignatureRef.current = getBoardSignature(nextRoom)
      applyRoom(nextRoom)
      playSound(wasBlackHoleTriggered ? 'blackhole' : 'move')
      setConnectionMessage('')
    } catch (error) {
      handleRoomError(error, setActionError)
    } finally {
      setIsMovePending(false)
    }
  }

  async function handleNextRound() {
    registerUserGesture()
    playSound('click')

    if (!canRequestNextRound || hasRequestedNextRound) {
      return
    }

    setActionError('')
    setIsNextRoundPending(true)

    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/next-round`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      })
      applyRoom(nextRoom)
      setConnectionMessage('')
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
    setIsStartPending(true)

    try {
      const nextRoom = await startRoom(roomCode, playerId)
      applyRoom(nextRoom)
      setConnectionMessage('')
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

    if (nextBoardSignature !== previousBoardSignature) {
      if (pendingLocalMoveSignatureRef.current === nextBoardSignature) {
        pendingLocalMoveSignatureRef.current = null
      } else if (nextMoveCount > previousMoveCount && room.status === 'playing') {
        playSound('move')
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

  useEffect(() => {
    let isPollingActive = true

    async function pollRoom() {
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
            return
          }

          setActionError(error.message)
        }
      }
    }

    const pollingId = window.setInterval(pollRoom, 2000)

    return () => {
      isPollingActive = false
      window.clearInterval(pollingId)
    }
  }, [applyRoom, roomCode])

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
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  onMenu()
                }}
              >
                Menüye dön
              </button>
            </div>
          </div>
        )}

        {!isArena && (
          <div className="online-turn-line" role="status" aria-live="polite">
            {isRoomInactive ? 'Oda aktif değil' : getStatusMessage({ room, mySymbol })}
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
                currentPlayer={ownerPlayer.symbol}
                playerName={ownerPlayer.name}
                score={ownerPlayer.score ?? 0}
                scoreLabel="Puan"
                powerOptions={ONLINE_ARENA_POWER_OPTIONS}
                isActivePlayer={ownerIsActive}
                canInteract={ownerPlayer.id === playerId && canMove}
                isPowersEnabled
                powerCounts={ownerPowerCounts}
                activePower={ownerPlayer.id === playerId ? activePower : null}
                boostMode={boostMode}
                disabledPowers={arenaDisabledPowers}
                statusText={
                  ownerIsActive
                    ? ownerPlayer.id === playerId
                      ? activePower
                        ? 'Güç hazır. Parlayan hedeflerden birini seç.'
                        : 'Hamle sende. Güç seç veya taş koy.'
                      : 'Rakibin hamlesi bekleniyor.'
                    : 'Sıranı bekle, tahtayı oku.'
                }
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
                visibleBoostedSquares={visibleBoostedSquares}
                powerTargetIndexes={activePowerTargets}
                powerTargetLabel={ARENA_POWER_NAMES[activePower]}
                onSquareClick={handleSquareClick}
                currentPlayer={mySymbol}
                blackHoleEventIndex={blackHoleEvent?.index}
              />

              <PowerPanel
                currentPlayer={guestPlayer.symbol}
                playerName={guestPlayer.name}
                score={guestPlayer.score ?? 0}
                scoreLabel="Puan"
                powerOptions={ONLINE_ARENA_POWER_OPTIONS}
                isActivePlayer={guestIsActive}
                canInteract={guestPlayer.id === playerId && canMove}
                isPowersEnabled
                powerCounts={guestPowerCounts}
                activePower={guestPlayer.id === playerId ? activePower : null}
                boostMode={boostMode}
                disabledPowers={arenaDisabledPowers}
                statusText={
                  guestIsActive
                    ? guestPlayer.id === playerId
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
              <OnlinePlayerPanel player={ownerPlayer} position="Üst" isActive={ownerIsActive} />
              <Board
                boardSize={room.boardSize}
                squares={room.game.squares}
                multipliers={{}}
                winningLine={winningLine}
                shieldedSquares={[]}
                lockedSquares={[]}
                visibleBoostedSquares={[]}
                onSquareClick={handleSquareClick}
                currentPlayer={mySymbol}
              />
              <OnlinePlayerPanel player={guestPlayer} position="Alt" isActive={guestIsActive} />
            </>
          )}
        </div>
      </section>

      {isRoundFinished && (
        <RoundResultModal
          roundNumber={room.game.roundNumber}
          winner={room.game.winner}
          isDraw={room.game.isDraw}
          scores={{ X: ownerPlayer?.score ?? 0, O: guestPlayer?.score ?? 0 }}
          scoreLabel={isArena ? 'Puan' : 'Skor'}
          resultMessage={roundResultMessage[0]}
          loserMessage={nextRoundStatusMessage}
          onNextRound={handleNextRound}
          onMenu={onMenu}
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
        />
      )}
    </main>
  )
}
