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
import SoundToggle from './SoundToggle'
import { playSound, registerUserGesture } from '../game/soundManager'

const ROOM_INACTIVE_MESSAGE = 'Oda artık aktif değil. Menüye dönüp yeni oda oluşturabilirsin.'

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
    return room.game.winner === mySymbol ? 'Turu kazandın' : 'Rakip turu kazandı'
  }

  if (room.game.isDraw) {
    return 'Tur berabere bitti'
  }

  const currentSymbol = room.game.xIsNext ? 'X' : 'O'

  return currentSymbol === mySymbol ? 'Sıra sende' : 'Rakip hamle yapıyor'
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
    !isRoomInactive
  const canRequestNextRound = isRoundFinished && room.status !== 'completed' && !isRoomInactive
  const winningLine = room.game.winningLine.length > 0 ? room.game.winningLine : null
  const roundSymbol = room.game.isDraw ? '=' : room.game.winner
  const roundSymbolModifier = room.game.isDraw ? 'draw' : room.game.winner?.toLowerCase()
  const roundWinnerPlayer = room.players.find((player) => player.symbol === room.game.winner)
  const roundResultLabel = room.game.isDraw
    ? 'TUR BERABERE'
    : `${roundWinnerPlayer?.name ?? room.game.winner} TURU KAZANDI`
  const roundResultMessage = onlineRoundMessage ?? ['Tahta ısındı.', 'Rövanş hazır.']

  const applyRoom = useCallback((nextRoom) => {
    const nextResultSignature = getResultSignature(nextRoom)

    if (nextResultSignature !== onlineRoundMessageSignatureRef.current) {
      onlineRoundMessageSignatureRef.current = nextResultSignature
      setOnlineRoundMessage(createOnlineRoundMessage(nextRoom, mySymbol))
    }

    setRoom(nextRoom)
  }, [mySymbol])

  async function handleSquareClick(index) {
    registerUserGesture()

    if (!canMove || room.game.squares[index]) {
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
      pendingLocalMoveSignatureRef.current = getBoardSignature(nextRoom)
      applyRoom(nextRoom)
      playSound('move')
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
    if (!isRoundFinished) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isRoundFinished])

  return (
    <main className="app-shell">
      <section className="game-card online-game-card">
        <header className="game-header brand-header">
          <h1>XO ARENA</h1>
          <p>Taşını koy. Gücünü kullan. Rövanşı al.</p>
          <div className="match-chip-row" aria-label="Online maç bilgileri">
            <span className={`match-chip ${room.gameMode}`}>{room.gameMode === 'arena' ? 'ARENA' : 'KLASİK'}</span>
            <span className="match-chip">{room.boardSize}x{room.boardSize}</span>
            <span className="match-chip">{room.winLength} TAŞ</span>
            <span className="match-chip">{getRoomStatusText(room.status)}</span>
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

        <div className="online-compact-meta">
          <span>Oda kodu {roomCode}</span>
          <strong>Tur {room.game.roundNumber}</strong>
        </div>

        <div className="online-turn-line" role="status" aria-live="polite">
          {isRoomInactive ? 'Oda aktif değil' : getStatusMessage({ room, mySymbol })}
        </div>

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

        <div className="arena-board-stack online-classic-stack">
          <OnlinePlayerPanel
            player={ownerPlayer}
            position="Üst"
            isActive={ownerPlayer?.symbol === currentSymbol && !isRoundFinished && room.status === 'playing'}
          />

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

          <OnlinePlayerPanel
            player={guestPlayer}
            position="Alt"
            isActive={guestPlayer?.symbol === currentSymbol && !isRoundFinished && room.status === 'playing'}
          />
        </div>
      </section>

      {isRoundFinished && (
        <div className="round-result-overlay" role="presentation">
          <section
            className={`round-result-card round-result-card--${roundSymbolModifier}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="online-round-result-title"
            aria-describedby={isMenuConfirmOpen ? undefined : 'online-round-result-message'}
          >
            {isMenuConfirmOpen ? (
              <div className="round-result-confirm">
                <strong id="online-round-result-title">Menüye dönülsün mü?</strong>

                <div className="round-result-actions round-result-confirm-actions">
                  <button
                    type="button"
                    onClick={() => {
                      registerUserGesture()
                      playSound('click')
                      setIsMenuConfirmOpen(false)
                    }}
                    autoFocus
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
            ) : (
              <>
                <span className="round-result-eyebrow">
                  TUR {room.game.roundNumber} SONUCU
                </span>

                <span className="round-result-symbol" aria-hidden="true">
                  {roundSymbol}
                </span>

                <h2 id="online-round-result-title">{roundResultLabel}</h2>

                <div
                  className="round-result-score"
                  aria-label={`Skor ${ownerPlayer?.score ?? 0} - ${guestPlayer?.score ?? 0}`}
                >
                  <div>
                    <strong>{ownerPlayer?.score ?? 0}</strong>
                    <span>{ownerPlayer?.name ?? 'Oyuncu'}</span>
                  </div>

                  <span aria-hidden="true">VS</span>

                  <div>
                    <strong>{guestPlayer?.score ?? 0}</strong>
                    <span>{guestPlayer?.name ?? 'Rakip'}</span>
                  </div>
                </div>

                <div className="round-result-message" id="online-round-result-message">
                  <strong>{roundResultMessage[0]}</strong>
                  <small>{roundResultMessage[1]}</small>
                  {hasRequestedNextRound && <small>Rakip bekleniyor.</small>}
                  {!hasRequestedNextRound && waitingNextRoundCount > 0 && (
                    <small>Rakip sonraki tura hazır.</small>
                  )}
                </div>

                <div className="round-result-actions">
                  <button
                    type="button"
                    onClick={handleNextRound}
                    disabled={isNextRoundPending || hasRequestedNextRound || !canRequestNextRound}
                    title={
                      room.status === 'completed'
                        ? 'Maç tamamlandı.'
                        : isRoomInactive
                          ? 'Oda artık aktif değil.'
                          : undefined
                    }
                    autoFocus
                  >
                    {room.status === 'completed'
                      ? 'Maç tamamlandı'
                      : hasRequestedNextRound
                      ? 'Rakip bekleniyor'
                      : isNextRoundPending
                        ? 'Hazırlanıyor...'
                        : 'Sonraki tur'}
                  </button>

                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      registerUserGesture()
                      playSound('click')
                      setIsMenuConfirmOpen(true)
                    }}
                  >
                    Menü
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
