import { useEffect, useState } from 'react'
import {
  getRoomStatusText,
  IS_ONLINE_ENABLED,
  isConnectionError,
  isRoomNotFoundError,
  leaveRoom,
  requestRoomJson,
  startRoom,
} from '../api/roomsApi'
import { clearOnlineSession } from '../sessionStorage'
import HowToPlay from './HowToPlay'
import SoundToggle from './SoundToggle'
import { useTranslation } from '../i18n'
import { playSound, registerUserGesture } from '../game/soundManager'
import SetupHeroBanner from './SetupHeroBanner'
import PowerSimulation from './PowerSimulation'

const boardOptions = [
  { size: 3, label: '3x3', description: 'Klasik hızlı oyun', winLength: 3 },
  { size: 4, label: '4x4', description: 'Taktiksel arena (4 taş)', winLength: 4 },
  { size: 5, label: '5x5', description: 'Stratejik büyük tahta (4 taş)', winLength: 4 },
]

const classicTargets = [3, 5, 7, 9]
const arenaTargets = [15, 30, 50, 100]

const turnTimeOptions = [
  { value: 10, label: '10s', sublabel: 'hızlı' },
  { value: 15, label: '15s', sublabel: 'standart' },
  { value: 20, label: '20s', sublabel: 'rahat' },
  { value: 0, label: '∞', sublabel: 'sınırsız' },
]

const SKINS = [
  { id: 'neon', name: 'Siber Neon', icon: '⚡', isFree: true },
  { id: 'gold', name: 'Altın Efsane', icon: '🌟', isFree: true },
  { id: 'emerald', name: 'Zümrüt Retro', icon: '🌲', isFree: true },
  { id: 'cosmic', name: 'Kozmik Mor', icon: '🔮', isFree: true },
  { id: 'ice', name: 'Buz Kristali', icon: '❄️', isFree: true },
]

// Security: strip HTML/JS injection chars and enforce max length on player names
const MAX_NAME_LENGTH = 16
const ROOM_CODE_REGEX = /^[A-Z0-9]{1,8}$/

function sanitizePlayerName(raw) {
  return raw
    .replace(/[<>"'&/\\]/g, '') // strip HTML/JS chars
    .slice(0, MAX_NAME_LENGTH)
}

function isValidRoomCodeInput(code) {
  return ROOM_CODE_REGEX.test(code)
}

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

function getInitialDeepLinkRoom() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const roomParam = params.get('room')
  if (roomParam && IS_ONLINE_ENABLED) {
    const sanitizedRoom = roomParam.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (isValidRoomCodeInput(sanitizedRoom)) {
      return sanitizedRoom
    }
  }
  return null
}

export default function GameSetup({
  onStartGame,
  onStartOnlineGame,
  onSaveOnlineSession,
  restoreMessage,
}) {
  const initialDeepLinkRoom = getInitialDeepLinkRoom()
  const { t, language } = useTranslation()
  const isTr = language === 'tr'

  // Mode selection modal states
  const [activeModal, setActiveModal] = useState(() => (initialDeepLinkRoom ? 'online_modal' : null))
  const [boardSize, setBoardSize] = useState(3)
  const [gameMode, setGameMode] = useState('classic')
  const [opponentType, setOpponentType] = useState(() => (initialDeepLinkRoom ? 'online' : 'ai'))
  const [targetValue, setTargetValue] = useState(5)
  const [isInfinite, setIsInfinite] = useState(false)
  const [turnTimeLimit, setTurnTimeLimit] = useState(15)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  
  // Local PvP player names
  const [player1Name, setPlayer1Name] = useState(() => (isTr ? '1. Oyuncu' : 'Player 1'))
  const [player2Name, setPlayer2Name] = useState(() => (isTr ? '2. Oyuncu' : 'Player 2'))
  
  // Online states
  const [createPlayerName, setCreatePlayerName] = useState('')
  const [joinPlayerName, setJoinPlayerName] = useState('')
  const [joinRoomCode, setJoinRoomCode] = useState(() => initialDeepLinkRoom ?? '')
  const [onlineFlow, setOnlineFlow] = useState(() => (initialDeepLinkRoom ? 'join' : null))
  const [onlineLobby, setOnlineLobby] = useState(null)
  const [onlineError, setOnlineError] = useState('')
  const [onlineConnectionMessage, setOnlineConnectionMessage] = useState('')
  const [onlineLoadingAction, setOnlineLoadingAction] = useState(null)
  const [isRoomCodeCopied, setIsRoomCodeCopied] = useState(false)
  const [onlineBoostMode] = useState('random')
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  // Skin / Cosmetic state
  const [selectedSkin, setSelectedSkin] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('xo-arena-skin') || 'neon'
    }
    return 'neon'
  })

  function handleSelectSkin(skin) {
    registerUserGesture()
    playSound('click')
    setSelectedSkin(skin.id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('xo-arena-skin', skin.id)
      document.body.setAttribute('data-skin', skin.id)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedSkin = window.localStorage.getItem('xo-arena-skin') || 'neon'
    document.body.setAttribute('data-skin', savedSkin)
  }, [])

  const selectedBoard = boardOptions.find((board) => board.size === boardSize)
  const targetOptions = gameMode === 'classic' ? classicTargets : arenaTargets
  const targetLabel = gameMode === 'classic' ? t('setup.settingsModal.targetRound') : t('setup.settingsModal.targetScore')
  const isOnlineMode = opponentType === 'online'
  const isOnlineLoading = onlineLoadingAction !== null
  const canStartOnlineRoom = onlineLobby?.room.status === 'ready' && onlineLobby.symbol === 'X'

  const previewGameConfig = {
    boardSize,
    winLength: selectedBoard.winLength,
    gameMode,
    targetValue,
    isInfinite,
    opponentType,
    turnTimeLimit,
  }

  // ── Mode Card Click Handlers ──

  function handleSelectMode(type) {
    registerUserGesture()
    playSound('click')
    setOpponentType(type)

    if (type === 'online') {
      if (!IS_ONLINE_ENABLED) return
      setOnlineError('')
      setActiveModal('online_modal')
      setOnlineFlow(null)
    } else {
      setActiveModal('local_config')
    }
  }

  function closeModal() {
    registerUserGesture()
    playSound('click')
    setActiveModal(null)
    setOnlineFlow(null)
    setOnlineError('')
  }

  function resetOnlineLobby() {
    setOnlineFlow(null)
    setOnlineLobby(null)
    setOnlineError('')
    setOnlineConnectionMessage('')
    setIsRoomCodeCopied(false)
    setIsLeaveConfirmOpen(false)
    setJoinRoomCode('')
    clearOnlineSession()

    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  async function handleLeaveOnlineLobby() {
    registerUserGesture()
    playSound('click')

    if (onlineLobby?.room?.roomCode && onlineLobby?.playerId) {
      try {
        await leaveRoom(onlineLobby.room.roomCode, onlineLobby.playerId, onlineLobby.playerSecret)
      } catch {
        // Proceed with local cleanup even if request fails
      }
    }

    resetOnlineLobby()
    closeModal()
  }

  // FIX: Do not reset online flow when changing mode during create room form!
  function handleModeChange(nextMode) {
    registerUserGesture()
    playSound('click')
    setGameMode(nextMode)
    setTargetValue(nextMode === 'classic' ? 5 : 30)
    setIsInfinite(false)
    if (onlineLobby) {
      resetOnlineLobby()
    }
  }

  function handleStartGame() {
    registerUserGesture()
    playSound('click')
    const defaultHuman = isTr ? 'Oyuncu' : 'Player'
    const defaultP1 = isTr ? '1. Oyuncu' : 'Player 1'
    const defaultP2 = isTr ? '2. Oyuncu' : 'Player 2'
    const cleanP1 = player1Name.trim()
    const cleanP2 = player2Name.trim()

    onStartGame({
      boardSize,
      winLength: selectedBoard.winLength,
      gameMode,
      targetType: gameMode === 'classic' ? 'rounds' : 'points',
      targetValue: isInfinite ? null : targetValue,
      isInfinite,
      opponentType,
      turnTimeLimit,
      player1Name: opponentType === 'ai'
        ? defaultHuman
        : (!cleanP1 || cleanP1 === '1. Oyuncu' || cleanP1 === 'Player 1' ? defaultP1 : cleanP1),
      player2Name: opponentType === 'ai'
        ? 'Bot'
        : (!cleanP2 || cleanP2 === '2. Oyuncu' || cleanP2 === 'Player 2' ? defaultP2 : cleanP2),
    })
  }

  function handleConfigSubmit() {
    registerUserGesture()
    playSound('click')
    if (opponentType === 'human') {
      setActiveModal('player_names')
    } else {
      handleStartGame()
    }
  }

  function saveOnlineLobby(room, player, playerName, playerSecret) {
    const nextLobby = {
      room,
      playerId: player.id,
      playerSecret,
      symbol: player.symbol,
      playerName,
    }

    setOnlineLobby(nextLobby)
    setOnlineConnectionMessage('')
    setIsRoomCodeCopied(false)
    onSaveOnlineSession({
      roomCode: room.roomCode,
      playerId: player.id,
      playerSecret,
      symbol: player.symbol,
      playerName,
    })
  }

  async function handleCreateOnlineRoom() {
    registerUserGesture()
    playSound('click')
    const playerName = createPlayerName.trim()

    if (!playerName) {
      setOnlineError('Oyuncu adı boş olamaz.')
      return
    }

    setOnlineError('')
    setOnlineConnectionMessage('')
    setOnlineLoadingAction('create')

    try {
      const access = await requestRoomJson('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          playerName,
          gameMode,
          boardSize,
          winLength: selectedBoard.winLength,
          targetValue,
          turnTimeLimit,
          boostMode: gameMode === 'arena' ? onlineBoostMode : null,
        }),
      })
      const room = access.room
      const player = getCurrentOnlinePlayer(room, playerName, 'X')

      saveOnlineLobby(room, player, playerName, access.playerSecret)
      setJoinRoomCode(room.roomCode)
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleJoinOnlineRoom() {
    registerUserGesture()
    playSound('click')
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
    setOnlineConnectionMessage('')
    setOnlineLoadingAction('join')

    try {
      const access = await requestRoomJson(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerName }),
      })
      const room = access.room
      const player = getCurrentOnlinePlayer(room, playerName, 'O')

      saveOnlineLobby(room, player, playerName, access.playerSecret)
      setJoinRoomCode(room.roomCode)
    } catch (error) {
      setOnlineError(error.message)
    } finally {
      setOnlineLoadingAction(null)
    }
  }

  async function handleCopyRoomCode() {
    registerUserGesture()
    playSound('click')

    if (!onlineLobby?.room.roomCode || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(onlineLobby.room.roomCode)
    setIsRoomCodeCopied(true)
  }

  function handleOnlineFlowBack() {
    registerUserGesture()
    playSound('click')
    setOnlineFlow(null)
    setOnlineError('')
    setOnlineConnectionMessage('')
  }

  async function handleStartOnlineRoom() {
    registerUserGesture()
    playSound('click')

    if (!onlineLobby || onlineLobby.symbol !== 'X' || onlineLobby.room.status !== 'ready') {
      return
    }

    setOnlineError('')
    setOnlineConnectionMessage('')
    setOnlineLoadingAction('start')

    try {
      const room = await startRoom(
        onlineLobby.room.roomCode,
        onlineLobby.playerId,
        onlineLobby.playerSecret
      )

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
      // Security: skip polling when tab is hidden to prevent server hammering
      if (document.visibilityState === 'hidden') {
        return
      }

      try {
        const room = await requestRoomJson(`/api/rooms/${roomCode}`)

        if (!isPollingActive) {
          return
        }

        const hasOwner = room.players?.some((player) => player.symbol === 'X')

        if (!hasOwner || room.status === 'closed') {
          clearOnlineSession()
          setOnlineLobby(null)
          setOnlineConnectionMessage('')
          setOnlineError('Oda sahibi odadan ayrıldığı için lobi kapatıldı.')
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
            setOnlineConnectionMessage('')
            setOnlineError('Oda sahibi odadan ayrıldı veya oda kapatıldı.')
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
  }, [isOnlineMode, onlineLobby?.room?.code, onlineLobby?.room?.roomCode])

  useEffect(() => {
    if (onlineLobby?.room?.status !== 'playing') {
      return
    }

    const activeRoomCode = onlineLobby.room.code || onlineLobby.room.roomCode || onlineLobby.roomCode || ''

    onStartOnlineGame({
      roomCode: activeRoomCode,
      playerId: onlineLobby.playerId,
      playerSecret: onlineLobby.playerSecret,
      symbol: onlineLobby.symbol,
      playerName: onlineLobby.playerName,
      room: onlineLobby.room,
    })
  }, [onlineLobby, onStartOnlineGame])

  // ══════════════════════════════════════
  //  RENDER - VIRAL HUB PATTERN
  // ══════════════════════════════════════

  return (
    <main className="app-shell">
      <section className="game-card setup-card viral-hub-card">
        {/* Top Sound & Settings Action */}
        <div className="setup-quick-actions">
          <SoundToggle />
        </div>

        {restoreMessage && (
          <div className="online-message" role="status">
            {restoreMessage}
          </div>
        )}

        {/* ── Brand Hero Header ── */}
        <header className="game-header brand-header setup-brand-header">
          <h1>XO ARENA</h1>
          <p>{t('setup.slogan')}</p>
        </header>

        <SetupHeroBanner />

        {/* ── Viral Mode Action Cards Grid ── */}
        <div className="viral-mode-grid">
          <button
            type="button"
            className="viral-mode-card viral-mode-card--ai"
            onClick={() => handleSelectMode('ai')}
          >
            <div className="viral-card-icon">🤖</div>
            <div className="viral-card-content">
              <h3>{t('setup.modes.ai')}</h3>
              <p>{t('setup.modes.aiDesc')}</p>
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className="viral-mode-card viral-mode-card--pvp"
            onClick={() => handleSelectMode('human')}
          >
            <div className="viral-card-icon">👥</div>
            <div className="viral-card-content">
              <h3>{t('setup.modes.human')}</h3>
              <p>{t('setup.modes.humanDesc')}</p>
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className={`viral-mode-card viral-mode-card--online ${!IS_ONLINE_ENABLED ? 'is-disabled' : ''}`}
            onClick={() => handleSelectMode('online')}
            disabled={!IS_ONLINE_ENABLED}
          >
            <div className="viral-card-icon">🌐</div>
            <div className="viral-card-content">
              <h3>{t('setup.modes.online')}</h3>
              <p>{t('setup.modes.onlineDesc')}</p>
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className="viral-mode-card viral-mode-card--tournament is-disabled"
            disabled
          >
            <div className="viral-card-badge viral-card-badge--soon">{t('setup.modes.comingSoon')}</div>
            <div className="viral-card-icon">🏆</div>
            <div className="viral-card-content">
              <h3>{t('setup.modes.tournament')}</h3>
              <p>{t('setup.modes.tournamentDesc')}</p>
            </div>
          </button>
        </div>

        {/* ── Interactive Power Section ── */}
        <div className="setup-sim-section">
          <span className="setup-sim-label">
            <svg
              className="setup-sim-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="arenaPowerBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#ff8fc5" />
                  <stop offset="70%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="arenaPowerGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#c084fc" floodOpacity="0.85" />
                </filter>
              </defs>
              <path
                d="M13.5 1.5L3.5 13.5h7l-2 9 11-12h-7.5l2-9z"
                fill="url(#arenaPowerBoltGrad)"
                filter="url(#arenaPowerGlow)"
              />
            </svg>
            <span>{t('setup.arenaPowers')}</span>
          </span>
          <PowerSimulation />
        </div>

        {/* ── Prominent Footer Action ── */}
        <footer className="viral-footer-actions">
          <button
            type="button"
            className="viral-footer-btn viral-footer-btn--prominent"
            onClick={() => setIsHowToPlayOpen(true)}
          >
            <span>{t('setup.rulesButton')}</span>
          </button>
        </footer>
      </section>

      {/* ════════════════════════════════════════════════════════
          MODAL A: QUICK MATCH SETTINGS (Bot'a Karşı / Yan Yana)
         ════════════════════════════════════════════════════════ */}
      {activeModal === 'local_config' && (
        <div className="viral-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="viral-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="viral-modal-close" onClick={closeModal}>×</button>

            <div className="viral-modal-header">
              <span className="viral-modal-icon">
                {opponentType === 'ai' ? '🤖' : '👥'}
              </span>
              <h2>{opponentType === 'ai' ? t('setup.modes.ai') : t('setup.modes.human')}</h2>
              <p>{t('setup.settingsModal.subtitle')}</p>
            </div>

            <div className="setup-group">
              <span className="setup-label">{t('setup.settingsModal.boardSize')}</span>
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
              <span className="setup-label">{t('setup.settingsModal.gameMode')}</span>
              <div className="setup-options">
                <button
                  className={gameMode === 'classic' ? 'setup-option active' : 'setup-option'}
                  type="button"
                  onClick={() => handleModeChange('classic')}
                >
                  {t('setup.settingsModal.classic')}
                </button>
                <button
                  className={gameMode === 'arena' ? 'setup-option active' : 'setup-option'}
                  type="button"
                  onClick={() => handleModeChange('arena')}
                >
                  {t('setup.settingsModal.arena')}
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
                    }}
                  >
                    {gameMode === 'classic'
                      ? t('setup.settingsModal.roundsCount', { count: target })
                      : t('setup.settingsModal.pointsCount', { count: target })}
                  </button>
                ))}
                <button
                  className={isInfinite ? 'setup-option active infinite-option' : 'setup-option infinite-option'}
                  type="button"
                  onClick={() => setIsInfinite(true)}
                >
                  ∞
                </button>
              </div>
            </div>

            {/* ── Hamle Süresi ── */}
            <div className="setup-group">
              <span className="setup-label">{t('setup.settingsModal.turnTime')}</span>
              <div className="setup-options turn-time-options">
                {turnTimeOptions.map((opt) => {
                  const sublabel =
                    opt.value === 10
                      ? t('setup.settingsModal.timeFast')
                      : opt.value === 15
                        ? t('setup.settingsModal.timeStandard')
                        : opt.value === 20
                          ? t('setup.settingsModal.timeTactical')
                          : t('setup.settingsModal.timeInfinite')

                  return (
                    <button
                      key={opt.value}
                      className={turnTimeLimit === opt.value ? 'setup-option turn-time-option active' : 'setup-option turn-time-option'}
                      type="button"
                      onClick={() => {
                        registerUserGesture()
                        playSound('click')
                        setTurnTimeLimit(opt.value)
                      }}
                    >
                      <span className="turn-time-label">{opt.label}</span>
                      <span className="turn-time-sublabel">{sublabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Single-Row Non-Wrapping Skin / Theme Selector ── */}
            <div className="setup-group">
              <span className="setup-label">{t('setup.settingsModal.skinTheme')}</span>
              <div className="skin-options-row">
                {SKINS.map((skin) => {
                  const isActive = selectedSkin === skin.id

                  return (
                    <button
                      key={skin.id}
                      className={`setup-option skin-option-btn ${isActive ? 'active' : ''}`}
                      type="button"
                      onClick={() => handleSelectSkin(skin)}
                    >
                      <span className="skin-btn-content">
                        {skin.icon} {t(`skins.${skin.id}`) || skin.name}
                      </span>
                      {isActive && <span className="skin-check-badge">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={`setup-summary ${gameMode}`}>
              {gameMode === 'classic'
                ? t('setup.settingsModal.summaryClassic', {
                    target: isInfinite
                      ? t('setup.settingsModal.infiniteTargetRounds')
                      : t('setup.settingsModal.targetRoundsDesc', { count: targetValue }),
                    size: selectedBoard.label,
                    winLength: selectedBoard.winLength,
                  })
                : t('setup.settingsModal.summaryArena', {
                    target: isInfinite
                      ? t('setup.settingsModal.infiniteTargetPoints')
                      : t('setup.settingsModal.targetPointsDesc', { count: targetValue }),
                    size: selectedBoard.label,
                  })}
            </div>

            <div className="viral-modal-actions">
              <button type="button" className="start-game-button" onClick={handleConfigSubmit}>
                ▶ {t('common.play')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL A.2: LOCAL PVP PLAYER NAMES MINI MODAL
         ════════════════════════════════════════════════════════ */}
      {activeModal === 'player_names' && (
        <div className="viral-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="viral-modal-card viral-modal-card--compact"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="viral-modal-close" onClick={closeModal}>×</button>

            <div className="viral-modal-header">
              <span className="viral-modal-icon">👥</span>
              <h2>{t('setup.playerNamesModal.title')}</h2>
              <p>{t('setup.playerNamesModal.subtitle')}</p>
            </div>

            <div className="setup-group player-names-setup-group">
              <div className="setup-player-names-grid">
                <div className="setup-name-input-wrapper setup-name-input-wrapper--p1">
                  <span className="setup-name-badge setup-name-badge--p1">1</span>
                  <input
                    type="text"
                    className="setup-name-input"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(sanitizePlayerName(e.target.value))}
                    placeholder={`${t('setup.playerNamesModal.defaultP1')} (${isTr ? '1. Tur X' : 'Round 1 X'})`}
                    maxLength={MAX_NAME_LENGTH}
                    autoFocus
                  />
                </div>
                <div className="setup-name-input-wrapper setup-name-input-wrapper--p2">
                  <span className="setup-name-badge setup-name-badge--p2">2</span>
                  <input
                    type="text"
                    className="setup-name-input"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(sanitizePlayerName(e.target.value))}
                    placeholder={`${t('setup.playerNamesModal.defaultP2')} (${isTr ? '1. Tur O' : 'Round 1 O'})`}
                    maxLength={MAX_NAME_LENGTH}
                  />
                </div>
              </div>
              <small className="setup-rotation-hint">
                {isTr
                  ? '🔄 Her tur X ve O sırası değişir; oyuna her zaman X başlar.'
                  : '🔄 Roles swap every round; X always starts the game.'}
              </small>
            </div>

            <div className="viral-modal-actions">
              <button type="button" className="start-game-button" onClick={handleStartGame}>
                ▶ {t('setup.playerNamesModal.startMatch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL B: ONLINE ROOM MODAL (Çevrimiçi Oda)
         ════════════════════════════════════════════════════════ */}
      {activeModal === 'online_modal' && (
        <div className="viral-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="viral-modal-card viral-modal-card--online"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="viral-modal-close" onClick={closeModal}>×</button>

            <div className="viral-modal-header">
              <span className="viral-modal-icon">🌐</span>
              <h2>{t('setup.onlineModal.title')}</h2>
              <p>{t('setup.onlineModal.subtitle')}</p>
            </div>

            <div className="online-lobby-panel">
              {!onlineLobby && !onlineFlow && (
                <div className="online-choice-grid">
                  <button
                    type="button"
                    className="online-choice-card"
                    onClick={() => setOnlineFlow('create')}
                  >
                    <span className="online-choice-icon">🏠</span>
                    <span className="online-choice-title">{t('setup.onlineModal.createRoom')}</span>
                    <small>{isTr ? 'Maç kurallarını sen belirle' : 'Host and set custom rules'}</small>
                  </button>

                  <button
                    type="button"
                    className="online-choice-card"
                    onClick={() => setOnlineFlow('join')}
                  >
                    <span className="online-choice-icon">🔑</span>
                    <span className="online-choice-title">{t('setup.onlineModal.joinRoom')}</span>
                    <small>{isTr ? 'Arkadaşının kodunu gir' : "Enter friend's room code"}</small>
                  </button>
                </div>
              )}

              {/* ── CREATE ROOM FORM (HOST) ── */}
              {!onlineLobby && onlineFlow === 'create' && (
                <div className="online-mode-grid online-mode-grid--single">
                  <div className="online-flow-card">
                    <header className="online-flow-header online-flow-card-header">
                      <div>
                        <h2>{isTr ? 'Odanı kur' : 'Host a Room'}</h2>
                        <p>{isTr ? 'Oyuncu adını yaz ve maç ayarlarını yap.' : 'Enter your name and customize match rules.'}</p>
                      </div>
                      <button
                        type="button"
                        className="online-flow-close"
                        onClick={handleOnlineFlowBack}
                      >
                        ×
                      </button>
                    </header>

                    <div className="online-field">
                      <label htmlFor="create-player-name">{t('setup.onlineModal.yourName')}</label>
                      <input
                        id="create-player-name"
                        type="text"
                        value={createPlayerName}
                        onChange={(e) => setCreatePlayerName(sanitizePlayerName(e.target.value))}
                        placeholder={isTr ? 'Adını yaz' : 'Your name'}
                        maxLength={MAX_NAME_LENGTH}
                        disabled={isOnlineLoading}
                        autoComplete="off"
                      />
                    </div>

                    {/* Room Host Settings */}
                    <div className="setup-group">
                      <span className="setup-label">{t('setup.settingsModal.boardSize')}</span>
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
                      <span className="setup-label">{t('setup.settingsModal.gameMode')}</span>
                      <div className="setup-options">
                        <button
                          className={gameMode === 'classic' ? 'setup-option active' : 'setup-option'}
                          type="button"
                          onClick={() => handleModeChange('classic')}
                        >
                          {t('setup.settingsModal.classic')}
                        </button>
                        <button
                          className={gameMode === 'arena' ? 'setup-option active' : 'setup-option'}
                          type="button"
                          onClick={() => handleModeChange('arena')}
                        >
                          {t('setup.settingsModal.arena')}
                        </button>
                      </div>
                    </div>

                    {/* ── Hamle Süresi ── */}
                    <div className="setup-group">
                      <span className="setup-label">{t('setup.settingsModal.turnTime')}</span>
                      <div className="setup-options turn-time-options">
                        {turnTimeOptions.map((opt) => {
                          const sublabel =
                            opt.value === 10
                              ? t('setup.settingsModal.timeFast')
                              : opt.value === 15
                                ? t('setup.settingsModal.timeStandard')
                                : opt.value === 20
                                  ? t('setup.settingsModal.timeTactical')
                                  : t('setup.settingsModal.timeInfinite')

                          return (
                            <button
                              key={opt.value}
                              className={turnTimeLimit === opt.value ? 'setup-option turn-time-option active' : 'setup-option turn-time-option'}
                              type="button"
                              onClick={() => {
                                registerUserGesture()
                                playSound('click')
                                setTurnTimeLimit(opt.value)
                              }}
                            >
                              <span className="turn-time-label">{opt.label}</span>
                              <span className="turn-time-sublabel">{sublabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Theme Skin Setting for Host */}
                    <div className="setup-group">
                      <span className="setup-label">{t('setup.settingsModal.skinTheme')}</span>
                      <div className="skin-options-row">
                        {SKINS.map((skin) => {
                          const isActive = selectedSkin === skin.id

                          return (
                            <button
                              key={skin.id}
                              className={`setup-option skin-option-btn ${isActive ? 'active' : ''}`}
                              type="button"
                              onClick={() => handleSelectSkin(skin)}
                            >
                              <span className="skin-btn-content">
                                {skin.icon} {t(`skins.${skin.id}`) || skin.name}
                              </span>
                              {isActive && <span className="skin-check-badge">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="online-primary-action"
                      onClick={handleCreateOnlineRoom}
                      disabled={isOnlineLoading}
                    >
                      {onlineLoadingAction === 'create' ? t('common.loading') : (isTr ? '🏠 Oda Oluştur' : '🏠 Create Room')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── JOIN ROOM FORM (GUEST) ── */}
              {!onlineLobby && onlineFlow === 'join' && (
                <div className="online-mode-grid online-mode-grid--single">
                  <div className="online-flow-card">
                    <header className="online-flow-header online-flow-card-header">
                      <div>
                        <h2>{isTr ? 'Odaya katıl' : 'Join Room'}</h2>
                        <p>{isTr ? 'Adını ve oda kodunu girerek maça dahil ol.' : 'Enter your name and room code to join.'}</p>
                      </div>
                      <button
                        type="button"
                        className="online-flow-close"
                        onClick={handleOnlineFlowBack}
                      >
                        ×
                      </button>
                    </header>

                    <div className="online-field">
                      <label htmlFor="join-player-name">{t('setup.onlineModal.yourName')}</label>
                      <input
                        id="join-player-name"
                        type="text"
                        value={joinPlayerName}
                        onChange={(e) => setJoinPlayerName(sanitizePlayerName(e.target.value))}
                        placeholder={isTr ? 'Adını yaz' : 'Your name'}
                        maxLength={MAX_NAME_LENGTH}
                        disabled={isOnlineLoading}
                        autoComplete="off"
                      />
                    </div>

                    <div className="online-field">
                      <label htmlFor="join-room-code">{t('setup.onlineModal.roomCode')}</label>
                      <input
                        id="join-room-code"
                        type="text"
                        value={joinRoomCode}
                        onChange={(e) => {
                          // Security: only allow valid room code chars
                          const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                          setJoinRoomCode(cleaned)
                        }}
                        placeholder={isTr ? 'Kodu gir (ör: XA89)' : 'Enter code (e.g. XA89)'}
                        maxLength={8}
                        disabled={isOnlineLoading}
                        autoComplete="off"
                      />
                    </div>

                    {/* Theme Skin Setting for Guest */}
                    <div className="setup-group">
                      <span className="setup-label">{t('setup.settingsModal.skinTheme')}</span>
                      <div className="skin-options-row">
                        {SKINS.map((skin) => {
                          const isActive = selectedSkin === skin.id

                          return (
                            <button
                              key={skin.id}
                              className={`setup-option skin-option-btn ${isActive ? 'active' : ''}`}
                              type="button"
                              onClick={() => handleSelectSkin(skin)}
                            >
                              <span className="skin-btn-content">
                                {skin.icon} {t(`skins.${skin.id}`) || skin.name}
                              </span>
                              {isActive && <span className="skin-check-badge">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="online-secondary-action"
                      onClick={handleJoinOnlineRoom}
                      disabled={isOnlineLoading}
                    >
                      {onlineLoadingAction === 'join' ? t('common.loading') : (isTr ? '🔑 Odaya Katıl' : '🔑 Join Room')}
                    </button>
                  </div>
                </div>
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

              {/* ── LOBBY ACTIVE ROOM SUMMARY ── */}
              {onlineLobby && (
                <div
                  className={`online-room-summary ${canStartOnlineRoom ? 'online-room-summary--ready' : ''}`}
                  aria-live="polite"
                >
                  <div className="online-room-code online-room-code--large">
                    <span>{t('setup.onlineModal.roomCode')}</span>
                    <strong className="online-code-display">{onlineLobby.room.roomCode}</strong>

                    {/* Copy buttons only render for the Host (Oda Sahibi) */}
                    {onlineLobby.symbol === 'X' && (
                      <div className="online-copy-buttons-group">
                        <button
                          type="button"
                          className="online-copy-action"
                          onClick={handleCopyRoomCode}
                          disabled={isRoomCodeCopied}
                        >
                          {isRoomCodeCopied ? t('setup.onlineModal.copiedCode') : t('setup.onlineModal.copyCode')}
                        </button>
                        <button
                          type="button"
                          className="online-copy-action online-copy-action--whatsapp"
                          onClick={async () => {
                            registerUserGesture()
                            playSound('click')
                            const link = `${window.location.origin}${window.location.pathname}?room=${onlineLobby.room.roomCode}`
                            if (navigator.clipboard) {
                              await navigator.clipboard.writeText(link)
                              setIsRoomCodeCopied(true)
                            }
                          }}
                        >
                          {isTr ? '💬 WhatsApp Linki Kopyala' : '💬 Copy WhatsApp Link'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="online-room-details">
                    <div>
                      <span>{isTr ? 'Rolün' : 'Role'}</span>
                      <strong>{onlineLobby.symbol === 'X' ? (isTr ? 'Oda sahibi' : 'Host') : (isTr ? 'Misafir' : 'Guest')}</strong>
                    </div>
                    <div>
                      <span>{isTr ? 'Durum' : 'Status'}</span>
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

                  <div className="online-room-actions-group">
                    {canStartOnlineRoom && (
                      <button
                        type="button"
                        className="online-play-action"
                        onClick={handleStartOnlineRoom}
                        disabled={isOnlineLoading}
                      >
                        <span>{onlineLoadingAction === 'start' ? t('common.loading') : (isTr ? '▶ Oyunu Başlat' : '▶ Start Game')}</span>
                      </button>
                    )}

                    {isLeaveConfirmOpen ? (
                      <div className="online-leave-confirm-card">
                        <strong>{isTr ? 'Odayı kapatmak istediğinden emin misin?' : 'Are you sure you want to leave the room?'}</strong>
                        <div className="online-leave-confirm-actions">
                          <button
                            type="button"
                            className="online-leave-cancel-btn"
                            onClick={() => {
                              registerUserGesture()
                              playSound('click')
                              setIsLeaveConfirmOpen(false)
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            className="online-leave-confirm-btn"
                            onClick={handleLeaveOnlineLobby}
                          >
                            {isTr ? 'Evet, Ayrıl' : 'Yes, Leave'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="online-leave-action"
                        onClick={() => {
                          registerUserGesture()
                          playSound('click')
                          if (onlineLobby.symbol === 'X') {
                            setIsLeaveConfirmOpen(true)
                          } else {
                            handleLeaveOnlineLobby()
                          }
                        }}
                      >
                        <span>{onlineLobby.symbol === 'X' ? '🚪 Odayı Kapat / Ayrıl' : '🚪 Lobiden Ayrıl'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!onlineLobby && (
              <div className="viral-modal-actions">
                <button type="button" className="viral-btn-secondary" onClick={closeModal}>
                  {t('common.close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HOW TO PLAY MODAL ── */}
      {isHowToPlayOpen && (
        <HowToPlay
          gameConfig={previewGameConfig}
          gameMode={gameMode}
          arenaSettings={{
            powersEnabled: true,
            multipliersEnabled: true,
            boostMode: isOnlineMode ? onlineBoostMode : 'random',
          }}
          onClose={() => setIsHowToPlayOpen(false)}
        />
      )}
    </main>
  )
}
