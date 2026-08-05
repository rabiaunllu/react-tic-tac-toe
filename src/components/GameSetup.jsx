import { useEffect, useState } from 'react'
import { getRoomStatusText, requestRoomJson, startRoom } from '../api/roomsApi'
import HowToPlay from './HowToPlay'

const boardOptions = [
  { size: 3, label: '3x3', description: 'Klasik hızlı oyun', winLength: 3 },
  { size: 4, label: '4x4', description: 'Dengeli arena', winLength: 3 },
  { size: 5, label: '5x5', description: 'Stratejik büyük tahta', winLength: 4 },
]

const classicTargets = [3, 5, 7, 9]
const arenaTargets = [15, 30, 50, 100]

export default function GameSetup({ onStartGame, onStartOnlineGame }) {
  const [boardSize, setBoardSize] = useState(3)
  const [gameMode, setGameMode] = useState('classic')
  const [opponentType, setOpponentType] = useState('human')
  const [targetValue, setTargetValue] = useState(5)
  const [isInfinite, setIsInfinite] = useState(false)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const [onlinePlayerName, setOnlinePlayerName] = useState('')
  const [onlineRoomCode, setOnlineRoomCode] = useState('')
  const [onlineLobby, setOnlineLobby] = useState(null)
  const [onlineError, setOnlineError] = useState('')
  const [onlineLoadingAction, setOnlineLoadingAction] = useState(null)

  const selectedBoard = boardOptions.find((board) => board.size === boardSize)
  const targetOptions = gameMode === 'classic' ? classicTargets : arenaTargets
  const targetLabel = gameMode === 'classic' ? 'Tur Sayısı' : 'Hedef Puan'
  const isOnlineMode = opponentType === 'online'
  const isOnlineLoading = onlineLoadingAction !== null
  const previewGameConfig = {
    boardSize,
    winLength: selectedBoard.winLength,
    gameMode,
    targetValue,
    isInfinite,
    opponentType,
  }

  function handleModeChange(nextMode) {
    setGameMode(nextMode)
    setTargetValue(nextMode === 'classic' ? 5 : 30)
    setIsInfinite(false)
    setOnlineLobby(null)
    setOnlineError('')
  }

  function handleOpponentTypeChange(nextOpponentType) {
    setOpponentType(nextOpponentType)
    setOnlineError('')

    if (nextOpponentType !== 'online') {
      setOnlineLobby(null)
    }
  }

  function handleStartGame() {
    onStartGame({
      boardSize,
      winLength: selectedBoard.winLength,
      gameMode,
      targetType: gameMode === 'classic' ? 'rounds' : 'points',
      targetValue: isInfinite ? null : targetValue,
      isInfinite,
      opponentType,
    })
  }

  function getCurrentOnlinePlayer(room, playerName, preferredSymbol) {
    const normalizedPlayerName = playerName.trim().toLowerCase()
    const matchingPlayers = room.players.filter(
      (player) => player.name.trim().toLowerCase() === normalizedPlayerName
    )

    return (
      matchingPlayers.find((player) => player.symbol === preferredSymbol) ??
      matchingPlayers.at(-1) ??
      room.players.at(-1)
    )
  }

  async function handleCreateOnlineRoom() {
    const playerName = onlinePlayerName.trim()

    if (!playerName) {
      setOnlineError('Oyuncu adı boş olamaz.')
      return
    }

    setOnlineError('')
    setOnlineLoadingAction('create')

    try {
      const room = await requestRoomJson('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          playerName,
          gameMode,
          boardSize,
          winLength: selectedBoard.winLength,
          targetValue,
        }),
      })
      const player = getCurrentOnlinePlayer(room, playerName, 'X')

      setOnlineRoomCode(room.roomCode)
      setOnlineLobby({
        room,
        playerId: player.id,
        symbol: player.symbol,
      })
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleJoinOnlineRoom() {
    const playerName = onlinePlayerName.trim()
    const roomCode = onlineRoomCode.trim().toUpperCase()

    if (!playerName) {
      setOnlineError('Oyuncu adı boş olamaz.')
      return
    }

    if (!roomCode) {
      setOnlineError('Oda kodu boş olamaz.')
      return
    }

    setOnlineError('')
    setOnlineLoadingAction('join')

    try {
      const room = await requestRoomJson(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerName }),
      })
      const player = getCurrentOnlinePlayer(room, playerName, 'O')

      setOnlineRoomCode(room.roomCode)
      setOnlineLobby({
        room,
        playerId: player.id,
        symbol: player.symbol,
      })
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleStartOnlineRoom() {
    if (!onlineLobby || onlineLobby.symbol !== 'X' || onlineLobby.room.status !== 'ready') {
      return
    }

    setOnlineError('')
    setOnlineLoadingAction('start')

    try {
      const room = await startRoom(onlineLobby.room.roomCode, onlineLobby.playerId)

      setOnlineLobby((currentLobby) => {
        if (!currentLobby) {
          return currentLobby
        }

        return {
          ...currentLobby,
          room,
        }
      })
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  useEffect(() => {
    if (!isOnlineMode || !onlineLobby?.room.roomCode) {
      return undefined
    }

    let isPollingActive = true
    const roomCode = onlineLobby.room.roomCode

    async function pollRoom() {
      try {
        const room = await requestRoomJson(`/api/rooms/${roomCode}`)

        if (!isPollingActive) {
          return
        }

        setOnlineLobby((currentLobby) => {
          if (!currentLobby || currentLobby.room.roomCode !== roomCode) {
            return currentLobby
          }

          return {
            ...currentLobby,
            room,
          }
        })
      } catch (error) {
        if (isPollingActive) {
          setOnlineError(error.message)
        }
      }
    }

    const pollingId = window.setInterval(pollRoom, 2000)

    return () => {
      isPollingActive = false
      window.clearInterval(pollingId)
    }
  }, [isOnlineMode, onlineLobby?.room.roomCode])

  useEffect(() => {
    if (onlineLobby?.room.status !== 'playing') {
      return
    }

    onStartOnlineGame({
      roomCode: onlineLobby.room.roomCode,
      playerId: onlineLobby.playerId,
      symbol: onlineLobby.symbol,
      room: onlineLobby.room,
    })
  }, [onlineLobby, onStartOnlineGame])

  return (
    <main className="app-shell">
      <section className="game-card setup-card">
        <header className="game-header brand-header setup-brand-header">
          <h1>XO ARENA</h1>
          <p>Tahtanı seç. Modu kur. Rövanşa hazır ol.</p>
        </header>

        <div className="setup-control-group setup-opponent-group">
          <span className="setup-control-label">OYUNCU MODU</span>

          <div className="setup-segment-grid setup-segment-grid--three">
            <button
              type="button"
              className={`setup-segment ${opponentType === 'human' ? 'is-selected' : ''}`}
              onClick={() => handleOpponentTypeChange('human')}
              aria-pressed={opponentType === 'human'}
            >
              <span>PvP</span>
            </button>

            <button
              type="button"
              className={`setup-segment ${opponentType === 'ai' ? 'is-selected' : ''}`}
              onClick={() => handleOpponentTypeChange('ai')}
              aria-pressed={opponentType === 'ai'}
            >
              <span>PvC</span>
            </button>

            <button
              type="button"
              className={`setup-segment ${opponentType === 'online' ? 'is-selected' : ''}`}
              onClick={() => handleOpponentTypeChange('online')}
              aria-pressed={opponentType === 'online'}
            >
              <span>Online</span>
            </button>
          </div>
        </div>

        <div className="setup-group">
          <span className="setup-label">Izgara Boyutu</span>
          <div className="setup-options">
            {boardOptions.map((board) => (
              <button
                key={board.size}
                className={boardSize === board.size ? 'setup-option active' : 'setup-option'}
                type="button"
                onClick={() => setBoardSize(board.size)}
              >
                {board.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-group">
          <span className="setup-label">Oyun Türü</span>
          <div className="setup-options">
            <button
              className={gameMode === 'classic' ? 'setup-option active' : 'setup-option'}
              type="button"
              onClick={() => handleModeChange('classic')}
            >
              Klasik
            </button>
            <button
              className={gameMode === 'arena' ? 'setup-option active' : 'setup-option'}
              type="button"
              onClick={() => handleModeChange('arena')}
            >
              Arena
            </button>
          </div>
        </div>

        <div className="setup-group">
          <span className="setup-label">{targetLabel}</span>
          <div className="setup-options target-options">
            {targetOptions.map((target) => (
              <button
                key={target}
                className={!isInfinite && targetValue === target ? 'setup-option active' : 'setup-option'}
                type="button"
                onClick={() => {
                  setTargetValue(target)
                  setIsInfinite(false)
                  setOnlineLobby(null)
                }}
              >
                {gameMode === 'classic' ? `${target} Tur` : `${target} Pts`}
              </button>
            ))}
            <button
              className={isInfinite ? 'setup-option active infinite-option' : 'setup-option infinite-option'}
              type="button"
              onClick={() => {
                setIsInfinite(true)
                setOnlineLobby(null)
              }}
            >
              ∞
            </button>
          </div>
        </div>

        <div className={`setup-summary ${gameMode}`}>
          {gameMode === 'classic'
            ? `Klasik mod: ${isInfinite ? 'Sonsuz oyun' : `${targetValue} tur hedefi`}. Izgara ${selectedBoard.label}, ${selectedBoard.winLength} taş yan yana kazandırır.`
            : `Arena mod: ${isInfinite ? 'Sonsuz puan' : `${targetValue} puan hedefi`}. Izgara ${selectedBoard.label}, ${selectedBoard.winLength} taş yan yana kazandırır.`}
        </div>

        {isOnlineMode && (
          <div className="online-lobby-panel">
            <div className="online-field">
              <label htmlFor="online-player-name">Oyuncu Adı</label>
              <input
                id="online-player-name"
                type="text"
                value={onlinePlayerName}
                onChange={(event) => setOnlinePlayerName(event.target.value)}
                placeholder="Adınızı yazın"
                disabled={isOnlineLoading}
              />
            </div>

            <div className="online-action-grid">
              <button
                type="button"
                className="online-primary-action"
                onClick={handleCreateOnlineRoom}
                disabled={isOnlineLoading}
              >
                {onlineLoadingAction === 'create' ? 'Oluşturuluyor...' : 'Oda Oluştur'}
              </button>

              <div className="online-join-row">
                <input
                  type="text"
                  value={onlineRoomCode}
                  onChange={(event) => setOnlineRoomCode(event.target.value.toUpperCase())}
                  placeholder="Oda kodu"
                  disabled={isOnlineLoading}
                  aria-label="Oda kodu"
                />
                <button
                  type="button"
                  className="online-secondary-action"
                  onClick={handleJoinOnlineRoom}
                  disabled={isOnlineLoading}
                >
                  {onlineLoadingAction === 'join' ? 'Katılıyor...' : 'Katıl'}
                </button>
              </div>
            </div>

            {onlineError && (
              <div className="online-message online-message--error" role="alert">
                {onlineError}
              </div>
            )}

            {onlineLobby && (
              <div className="online-room-summary" aria-live="polite">
                <div className="online-room-code">
                  <span>Oda Kodu</span>
                  <strong>{onlineLobby.room.roomCode}</strong>
                </div>

                <div className="online-room-details">
                  <div>
                    <span>Player ID</span>
                    <strong>{onlineLobby.playerId}</strong>
                  </div>
                  <div>
                    <span>Sembol</span>
                    <strong>{onlineLobby.symbol}</strong>
                  </div>
                  <div>
                    <span>Durum</span>
                    <strong>{getRoomStatusText(onlineLobby.room.status)}</strong>
                  </div>
                </div>

                <div className="online-player-list">
                  {onlineLobby.room.players.map((player) => (
                    <div key={player.id} className="online-player-row">
                      <strong>{player.symbol}</strong>
                      <span>{player.name}</span>
                    </div>
                  ))}
                </div>

                <div className="online-message">
                  {getRoomStatusText(onlineLobby.room.status)}
                </div>

                {onlineLobby.room.status === 'ready' && onlineLobby.symbol === 'X' && (
                  <button
                    type="button"
                    className="online-play-action"
                    onClick={handleStartOnlineRoom}
                    disabled={isOnlineLoading}
                  >
                    <span>{onlineLoadingAction === 'start' ? 'Başlatılıyor...' : 'Oyuna Geç'}</span>
                    <small>Odayı başlat ve online oyun ekranına geç</small>
                  </button>
                )}

                {onlineLobby.room.status === 'ready' && onlineLobby.symbol === 'O' && (
                  <button type="button" className="online-play-action" disabled>
                    <span>Oyuna Geç</span>
                    <small>Oda sahibi oyunu başlatacak</small>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="setup-action-row" aria-label="Setup ek aksiyonları">
          <button
            type="button"
            className="setup-secondary-action setup-secondary-action--disabled"
            disabled
            aria-disabled="true"
          >
            <span>Turnuva</span>
            <small>Yakında</small>
          </button>
          <button
            type="button"
            className="setup-secondary-action setup-secondary-action--help"
            onClick={() => setIsHowToPlayOpen(true)}
          >
            <span>Nasıl Oynanır</span>
            <small>Kurallar ve güçler</small>
          </button>
        </div>

        {!isOnlineMode && (
          <button className="start-game-button" onClick={handleStartGame}>
            Oyuna Başla
          </button>
        )}
      </section>

      {isHowToPlayOpen && (
        <HowToPlay
          gameConfig={previewGameConfig}
          gameMode={gameMode}
          arenaSettings={{
            powersEnabled: true,
            multipliersEnabled: true,
            boostMode: 'random',
          }}
          onClose={() => setIsHowToPlayOpen(false)}
        />
      )}
    </main>
  )
}
