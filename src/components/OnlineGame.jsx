import { useEffect, useState } from 'react'
import { getRoomStatusText, requestRoomJson, startRoom } from '../api/roomsApi'
import Board from './Board'

function getOnlineStatusMessage(room, symbol) {
  if (room.status === 'waiting') {
    return 'Rakip bekleniyor'
  }

  if (room.status === 'ready') {
    return symbol === 'X' ? 'Oyunu başlatabilirsin' : 'Oda sahibi oyunu başlatacak'
  }

  if (room.status !== 'playing') {
    return getRoomStatusText(room.status)
  }

  if (room.game.winner) {
    return room.game.winner === symbol ? 'Turu kazandın' : `${room.game.winner} turu kazandı`
  }

  if (room.game.isDraw) {
    return 'Tur berabere bitti'
  }

  const currentSymbol = room.game.xIsNext ? 'X' : 'O'

  return currentSymbol === symbol ? 'Sıra sende' : 'Rakip hamle yapıyor'
}

export default function OnlineGame({ initialOnlineGame, onMenu }) {
  const [room, setRoom] = useState(initialOnlineGame.room)
  const [actionError, setActionError] = useState('')
  const [isMovePending, setIsMovePending] = useState(false)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isNextRoundPending, setIsNextRoundPending] = useState(false)

  const { roomCode, playerId, symbol } = initialOnlineGame
  const currentSymbol = room.game.xIsNext ? 'X' : 'O'
  const isRoundFinished = Boolean(room.game.winner) || room.game.isDraw
  const nextRoundPlayerIds = room.game.nextRoundPlayerIds ?? []
  const hasRequestedNextRound = nextRoundPlayerIds.includes(playerId)
  const waitingNextRoundCount = nextRoundPlayerIds.length
  const canMove =
    room.status === 'playing' &&
    !room.game.winner &&
    !room.game.isDraw &&
    symbol === currentSymbol &&
    !isMovePending
  const winningLine = room.game.winningLine.length > 0 ? room.game.winningLine : null
  const roundSymbol = room.game.isDraw ? '=' : room.game.winner
  const roundSymbolModifier = room.game.isDraw ? 'draw' : room.game.winner?.toLowerCase()
  const roundResultLabel = room.game.isDraw ? 'TUR BERABERE' : `${room.game.winner} TURU KAZANDI`
  const roundResultMessage = room.game.isDraw
    ? 'Beraberlik bozulmadı.'
    : room.game.winner === symbol
      ? 'Turu kazandın.'
      : 'Rakip turu kazandı.'

  async function refreshRoom() {
    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}`)
      setRoom(nextRoom)
      setActionError('')
    } catch (error) {
      setActionError(error.message)
    }
  }

  async function handleSquareClick(index) {
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
      setRoom(nextRoom)
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsMovePending(false)
    }
  }

  async function handleNextRound() {
    if (hasRequestedNextRound) {
      return
    }

    setActionError('')
    setIsNextRoundPending(true)

    try {
      const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}/next-round`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      })
      setRoom(nextRoom)
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsNextRoundPending(false)
    }
  }

  async function handleStartRoom() {
    if (room.status !== 'ready' || symbol !== 'X') {
      return
    }

    setActionError('')
    setIsStartPending(true)

    try {
      const nextRoom = await startRoom(roomCode, playerId)
      setRoom(nextRoom)
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsStartPending(false)
    }
  }

  useEffect(() => {
    let isPollingActive = true

    async function pollRoom() {
      try {
        const nextRoom = await requestRoomJson(`/api/rooms/${roomCode}`)

        if (isPollingActive) {
          setRoom(nextRoom)
        }
      } catch (error) {
        if (isPollingActive) {
          setActionError(error.message)
        }
      }
    }

    const pollingId = window.setInterval(pollRoom, 2000)

    return () => {
      isPollingActive = false
      window.clearInterval(pollingId)
    }
  }, [roomCode])

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
          <button className="setup-back-button" onClick={onMenu}>
            Menüye dön
          </button>
          <button className="setup-back-button" onClick={refreshRoom}>
            Yenile
          </button>
        </div>

        <div className="online-game-meta">
          <div>
            <span>Oda Kodu</span>
            <strong>{roomCode}</strong>
          </div>
          <div>
            <span>Sen</span>
            <strong>{symbol}</strong>
          </div>
          <div>
            <span>Tur</span>
            <strong>{room.game.roundNumber}</strong>
          </div>
        </div>

        <div className="score-board online-score-board">
          <div className="score-card x-score">
            <span className="score-label">X</span>
            <strong>{room.game.scores.x}</strong>
          </div>
          <div className="match-target-info">{getOnlineStatusMessage(room, symbol)}</div>
          <div className="score-card o-score">
            <span className="score-label">O</span>
            <strong>{room.game.scores.o}</strong>
          </div>
        </div>

        <div className="online-player-list online-game-players">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`online-player-row ${player.symbol === currentSymbol && !isRoundFinished ? 'is-current' : ''}`}
            >
              <strong>{player.symbol}</strong>
              <span>{player.name}</span>
            </div>
          ))}
        </div>

        {actionError && (
          <div className="online-message online-message--error" role="alert">
            {actionError}
          </div>
        )}

        {room.status === 'ready' && symbol === 'X' && (
          <button
            type="button"
            className="online-primary-action"
            onClick={handleStartRoom}
            disabled={isStartPending}
          >
            {isStartPending ? 'Başlatılıyor...' : 'Oyuna Geç'}
          </button>
        )}

        <Board
          boardSize={room.boardSize}
          squares={room.game.squares}
          multipliers={{}}
          winningLine={winningLine}
          shieldedSquares={[]}
          lockedSquares={[]}
          visibleBoostedSquares={[]}
          onSquareClick={handleSquareClick}
          currentPlayer={symbol}
        />
      </section>

      {isRoundFinished && (
        <div className="round-result-overlay" role="presentation">
          <section
            className={`round-result-card round-result-card--${roundSymbolModifier}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="online-round-result-title"
            aria-describedby="online-round-result-message"
          >
            <span className="round-result-eyebrow">
              TUR {room.game.roundNumber} SONUCU
            </span>

            <span className="round-result-symbol" aria-hidden="true">
              {roundSymbol}
            </span>

            <h2 id="online-round-result-title">{roundResultLabel}</h2>

            <div
              className="round-result-score"
              aria-label={`Skor ${room.game.scores.x} - ${room.game.scores.o}`}
            >
              <div>
                <strong>{room.game.scores.x}</strong>
                <span>X Tur</span>
              </div>

              <span aria-hidden="true">VS</span>

              <div>
                <strong>{room.game.scores.o}</strong>
                <span>O Tur</span>
              </div>
            </div>

            <div className="round-result-message" id="online-round-result-message">
              <strong>{roundResultMessage}</strong>
              {hasRequestedNextRound && <small>Rakip bekleniyor.</small>}
              {!hasRequestedNextRound && waitingNextRoundCount > 0 && (
                <small>Rakip sonraki tura hazır.</small>
              )}
            </div>

            <div className="round-result-actions">
              <button
                type="button"
                onClick={handleNextRound}
                disabled={isNextRoundPending || hasRequestedNextRound}
                autoFocus
              >
                {hasRequestedNextRound
                  ? 'Rakip bekleniyor'
                  : isNextRoundPending
                    ? 'Hazırlanıyor...'
                    : 'Sonraki tur'}
              </button>

              <button type="button" className="secondary-action" onClick={onMenu}>
                Menü
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
