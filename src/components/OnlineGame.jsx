import { useEffect, useState } from 'react'
import { getRoomStatusText, requestRoomJson, startRoom } from '../api/roomsApi'
import Board from './Board'

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
            <small>Tur</small>
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
          <small>Tur</small>
          <strong>{player.score ?? 0}</strong>
        </div>
      </div>
    </section>
  )
}

export default function OnlineGame({ initialOnlineGame, onMenu }) {
  const [room, setRoom] = useState(initialOnlineGame.room)
  const [actionError, setActionError] = useState('')
  const [isMovePending, setIsMovePending] = useState(false)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isNextRoundPending, setIsNextRoundPending] = useState(false)
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)

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
    !isMovePending
  const winningLine = room.game.winningLine.length > 0 ? room.game.winningLine : null
  const roundSymbol = room.game.isDraw ? '=' : room.game.winner
  const roundSymbolModifier = room.game.isDraw ? 'draw' : room.game.winner?.toLowerCase()
  const roundWinnerPlayer = room.players.find((player) => player.symbol === room.game.winner)
  const roundResultLabel = room.game.isDraw
    ? 'TUR BERABERE'
    : `${roundWinnerPlayer?.name ?? room.game.winner} TURU KAZANDI`
  const roundResultMessage = room.game.isDraw
    ? 'Beraberlik bozulmadı.'
    : roundWinnerPlayer?.id === playerId
      ? 'Turu kazandın.'
      : 'Rakip turu kazandı.'

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
    if (room.status !== 'ready' || ownerPlayer?.id !== playerId) {
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
          <button className="setup-back-button" onClick={() => setIsMenuConfirmOpen(true)}>
            Menüye dön
          </button>
        </div>

        {isMenuConfirmOpen && (
          <div className="setup-return-confirm">
            <strong>Menüye dönülsün mü?</strong>
            <p>Mevcut online oyun ekranından çıkılacak.</p>

            <div className="setup-return-actions">
              <button type="button" onClick={() => setIsMenuConfirmOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="danger-action" onClick={onMenu}>
                Menüye dön
              </button>
            </div>
          </div>
        )}

        <div className="online-compact-meta">
          <span>Oda {roomCode}</span>
          <strong>Tur {room.game.roundNumber}</strong>
        </div>

        <div className="score-board online-score-board">
          <div className="score-card x-score">
            <span className="score-label">{ownerPlayer?.name ?? 'Oyuncu'} Tur</span>
            <strong>{ownerPlayer?.score ?? 0}</strong>
          </div>
          <div className="match-target-info">{getStatusMessage({ room, mySymbol })}</div>
          <div className="score-card o-score">
            <span className="score-label">{guestPlayer?.name ?? 'Rakip'} Tur</span>
            <strong>{guestPlayer?.score ?? 0}</strong>
          </div>
        </div>

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
            disabled={isStartPending}
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
            aria-describedby="online-round-result-message"
          >
            {isMenuConfirmOpen ? (
              <div className="round-result-confirm">
                <strong id="online-round-result-title">Menüye dönülsün mü?</strong>
                <p id="online-round-result-message">Mevcut online oyun ekranından çıkılacak.</p>

                <div className="round-result-actions round-result-confirm-actions">
                  <button type="button" onClick={() => setIsMenuConfirmOpen(false)} autoFocus>
                    Vazgeç
                  </button>
                  <button type="button" className="danger-action" onClick={onMenu}>
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

                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setIsMenuConfirmOpen(true)}
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
