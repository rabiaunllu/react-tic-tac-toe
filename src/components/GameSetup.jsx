import { useEffect, useState } from 'react'
import {
  getRoomStatusText,
  isConnectionError,
  isRoomNotFoundError,
  requestRoomJson,
  startRoom,
} from '../api/roomsApi'
import { clearOnlineSession } from '../sessionStorage'
import HowToPlay from './HowToPlay'

const boardOptions = [
  { size: 3, label: '3x3', description: 'Klasik hızlı oyun', winLength: 3 },
  { size: 4, label: '4x4', description: 'Dengeli arena', winLength: 3 },
  { size: 5, label: '5x5', description: 'Stratejik büyük tahta', winLength: 4 },
]

const classicTargets = [3, 5, 7, 9]
const arenaTargets = [15, 30, 50, 100]

function normalizeName(name) {
  return name.trim().toLowerCase()
}

function getCurrentOnlinePlayer(room, playerName, preferredSymbol) {
  const normalizedPlayerName = normalizeName(playerName)
  const matchingPlayers = room.players.filter(
    (player) => normalizeName(player.name) === normalizedPlayerName
  )

  return (
    matchingPlayers.find((player) => player.symbol === preferredSymbol) ??
    matchingPlayers.at(-1) ??
    room.players.at(-1)
  )
}

function getLobbyMessage(onlineLobby) {
  if (!onlineLobby) {
    return ''
  }

  if (onlineLobby.room.status === 'waiting') {
    return 'Rakip bekleniyor.'
  }

  if (onlineLobby.room.status === 'ready') {
    return onlineLobby.symbol === 'X'
      ? 'Oyunu başlatabilirsin.'
      : 'Oda sahibi oyunu başlatacak.'
  }

  return getRoomStatusText(onlineLobby.room.status)
}

export default function GameSetup({
  onStartGame,
  onStartOnlineGame,
  onSaveOnlineSession,
  restoreMessage,
}) {
  const [boardSize, setBoardSize] = useState(3)
  const [gameMode, setGameMode] = useState('classic')
  const [opponentType, setOpponentType] = useState('human')
  const [targetValue, setTargetValue] = useState(5)
  const [isInfinite, setIsInfinite] = useState(false)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const [createPlayerName, setCreatePlayerName] = useState('')
  const [joinPlayerName, setJoinPlayerName] = useState('')
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [onlineFlow, setOnlineFlow] = useState(null)
  const [onlineLobby, setOnlineLobby] = useState(null)
  const [onlineMessage, setOnlineMessage] = useState('')
  const [onlineError, setOnlineError] = useState('')
  const [onlineConnectionMessage, setOnlineConnectionMessage] = useState('')
  const [onlineLoadingAction, setOnlineLoadingAction] = useState(null)

  const selectedBoard = boardOptions.find((board) => board.size === boardSize)
  const targetOptions = gameMode === 'classic' ? classicTargets : arenaTargets
  const targetLabel = gameMode === 'classic' ? 'Tur Sayısı' : 'Hedef Puan'
  const isOnlineMode = opponentType === 'online'
  const isOnlineLoading = onlineLoadingAction !== null
  const lobbyMessage = getLobbyMessage(onlineLobby)
  const previewGameConfig = {
    boardSize,
    winLength: selectedBoard.winLength,
    gameMode,
    targetValue,
    isInfinite,
    opponentType,
  }

  function resetOnlineLobby() {
    setOnlineFlow(null)
    setOnlineLobby(null)
    setOnlineMessage('')
    setOnlineError('')
    setOnlineConnectionMessage('')
  }

  function handleModeChange(nextMode) {
    setGameMode(nextMode)
    setTargetValue(nextMode === 'classic' ? 5 : 30)
    setIsInfinite(false)
    resetOnlineLobby()
  }

  function handleOpponentTypeChange(nextOpponentType) {
    setOpponentType(nextOpponentType)
    setOnlineError('')

    if (nextOpponentType !== 'online') {
      resetOnlineLobby()
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

  function saveOnlineLobby(room, player, playerName) {
    const nextLobby = {
      room,
      playerId: player.id,
      symbol: player.symbol,
      playerName,
    }

    setOnlineLobby(nextLobby)
    setOnlineConnectionMessage('')
    onSaveOnlineSession({
      roomCode: room.roomCode,
      playerId: player.id,
      symbol: player.symbol,
      playerName,
    })
  }

  async function handleCreateOnlineRoom() {
    const playerName = createPlayerName.trim()

    if (!playerName) {
      setOnlineError('Oyuncu adı boş olamaz.')
      return
    }

    setOnlineError('')
    setOnlineMessage('')
    setOnlineConnectionMessage('')
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

      saveOnlineLobby(room, player, playerName)
      setJoinRoomCode(room.roomCode)
      setOnlineMessage('')
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleJoinOnlineRoom() {
    const playerName = joinPlayerName.trim()
    const roomCode = joinRoomCode.trim().toUpperCase()

    if (!playerName) {
      setOnlineError('Oyuncu adı boş olamaz.')
      return
    }

    if (!roomCode) {
      setOnlineError('Oda kodu boş olamaz.')
      return
    }

    setOnlineError('')
    setOnlineMessage('')
    setOnlineConnectionMessage('')
    setOnlineLoadingAction('join')

    try {
      let isReconnect = false

      try {
        const currentRoom = await requestRoomJson(`/api/rooms/${roomCode}`)
        isReconnect = currentRoom.players.some(
          (player) => normalizeName(player.name) === normalizeName(playerName)
        )
      } catch {
        isReconnect = false
      }

      const room = await requestRoomJson(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerName }),
      })
      const player = getCurrentOnlinePlayer(room, playerName, 'O')

      saveOnlineLobby(room, player, playerName)
      setJoinRoomCode(room.roomCode)
      setOnlineMessage(
        isReconnect ? 'Bu odaya aynı isimle geri döndün.' : 'Oda sahibi oyunu başlatacak.'
      )
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleCopyRoomCode() {
    if (!onlineLobby?.room.roomCode || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(onlineLobby.room.roomCode)
    setOnlineMessage('Oda kodu kopyalandı.')
  }

  async function handleStartOnlineRoom() {
    if (!onlineLobby || onlineLobby.symbol !== 'X' || onlineLobby.room.status !== 'ready') {
      return
    }

    setOnlineError('')
    setOnlineConnectionMessage('')
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
      setOnlineConnectionMessage('')
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
        setOnlineConnectionMessage('')
        setOnlineError('')
      } catch (error) {
        if (isPollingActive) {
          if (isRoomNotFoundError(error)) {
            clearOnlineSession()
            setOnlineLobby(null)
            setOnlineMessage('')
            setOnlineConnectionMessage('')
            setOnlineError('Oda artık aktif değil. Menüye dönüp yeni oda oluşturabilirsin.')
            return
          }

          if (isConnectionError(error)) {
            setOnlineConnectionMessage(error.message)
            return
          }

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
      playerName: onlineLobby.playerName,
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

        {restoreMessage && (
          <div className="online-message" role="status">
            {restoreMessage}
          </div>
        )}

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
                  resetOnlineLobby()
                }}
              >
                {gameMode === 'classic' ? `${target} Tur` : `${target} Puan`}
              </button>
            ))}
            <button
              className={isInfinite ? 'setup-option active infinite-option' : 'setup-option infinite-option'}
              type="button"
              onClick={() => {
                setIsInfinite(true)
                resetOnlineLobby()
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
            {!onlineLobby && !onlineFlow && (
              <div className="online-choice-grid">
                <button
                  type="button"
                  className="online-choice-card"
                  onClick={() => setOnlineFlow('create')}
                >
                  <span>Oda Kur</span>
                </button>

                <button
                  type="button"
                  className="online-choice-card"
                  onClick={() => setOnlineFlow('join')}
                >
                  <span>Odaya Katıl</span>
                </button>
              </div>
            )}

            {!onlineLobby && onlineFlow === 'create' && (
              <div className="online-mode-grid online-mode-grid--single">
                <div className="online-flow-card">
                  <div>
                    <span className="setup-control-label"></span>
                    
                  </div>

                  <div className="online-field">
                    <label htmlFor="create-player-name">Oyuncu Adı</label>
                    <input
                      id="create-player-name"
                      type="text"
                      value={createPlayerName}
                      onChange={(event) => setCreatePlayerName(event.target.value)}
                      placeholder="Adını yaz"
                      disabled={isOnlineLoading}
                    />
                  </div>

                  <button
                    type="button"
                    className="online-primary-action"
                    onClick={handleCreateOnlineRoom}
                    disabled={isOnlineLoading}
                    title={isOnlineLoading ? 'Oda hazırlanıyor.' : undefined}
                  >
                    {onlineLoadingAction === 'create' ? 'Oluşturuluyor...' : 'Oda Oluştur'}
                  </button>
                </div>
              </div>
            )}

            {!onlineLobby && onlineFlow === 'join' && (
              <div className="online-mode-grid online-mode-grid--single">
                <div className="online-flow-card">
                  <div>
                    <span className="setup-control-label"></span>
                    
                  </div>

                  <div className="online-field">
                    <label htmlFor="join-player-name">Oyuncu Adı</label>
                    <input
                      id="join-player-name"
                      type="text"
                      value={joinPlayerName}
                      onChange={(event) => setJoinPlayerName(event.target.value)}
                      placeholder="Adını yaz"
                      disabled={isOnlineLoading}
                    />
                  </div>

                  <div className="online-field">
                    <label htmlFor="join-room-code">Oda Kodu</label>
                    <input
                      id="join-room-code"
                      type="text"
                      value={joinRoomCode}
                      onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                      placeholder="Kodu yaz"
                      disabled={isOnlineLoading}
                    />
                  </div>

                  <button
                    type="button"
                    className="online-secondary-action"
                    onClick={handleJoinOnlineRoom}
                    disabled={isOnlineLoading}
                    title={isOnlineLoading ? 'Odaya katılma işlemi sürüyor.' : undefined}
                  >
                    {onlineLoadingAction === 'join' ? 'Katılıyor...' : 'Odaya Katıl'}
                  </button>
                </div>
              </div>
            )}

            {!onlineLobby && onlineFlow && (
              <button
                type="button"
                className="online-flow-back"
                onClick={() => {
                  setOnlineFlow(null)
                  setOnlineError('')
                  setOnlineMessage('')
                  setOnlineConnectionMessage('')
                }}
              >
                Online seçeneklere dön
              </button>
            )}

            {onlineError && (
              <div className="online-message online-message--error" role="alert">
                {onlineError}
              </div>
            )}

            {onlineConnectionMessage && !onlineError && (
              <div className="online-message" role="status">
                {onlineConnectionMessage}
              </div>
            )}

            {onlineLobby && (
              <div className="online-room-summary" aria-live="polite">
                <div className="online-room-code online-room-code--large">
                  <span>Oda Kodu</span>
                  <strong>{onlineLobby.room.roomCode}</strong>
                  <button type="button" className="online-copy-action" onClick={handleCopyRoomCode}>
                    Kopyala
                  </button>
                </div>

                <div className="online-room-details">
                  <div>
                    <span>Rol</span>
                    <strong>{onlineLobby.symbol === 'X' ? 'Oda sahibi' : 'Misafir'}</strong>
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

                {onlineMessage && (
                  <div className="online-message">
                    {onlineMessage}
                  </div>
                )}

                {lobbyMessage && lobbyMessage !== onlineMessage && (
                  <div className="online-message">
                    {lobbyMessage}
                  </div>
                )}

                {onlineLobby.room.status === 'ready' && onlineLobby.symbol === 'X' && (
                  <button
                    type="button"
                    className="online-play-action"
                    onClick={handleStartOnlineRoom}
                    disabled={isOnlineLoading}
                    title={isOnlineLoading ? 'İşlem tamamlanınca başlayabilirsin.' : undefined}
                  >
                    <span>{onlineLoadingAction === 'start' ? 'Başlatılıyor...' : 'Oyunu Başlat'}</span>
                  </button>
                )}

              </div>
            )}
          </div>
        )}

        <div className="setup-action-row" aria-label="Setup ek aksiyonlari">
          <button
            type="button"
            className="setup-secondary-action setup-secondary-action--disabled"
            disabled
            aria-disabled="true"
          >
            <span>Turnuva</span>
            <small>Yakinda</small>
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
