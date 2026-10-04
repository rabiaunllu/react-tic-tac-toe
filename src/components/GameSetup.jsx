import { useEffect, useState, lazy, Suspense } from 'react'
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
import SoundToggle from './SoundToggle'
import { useTranslation } from '../i18n'
import { playSound, registerUserGesture } from '../game/soundManager'
import SetupHeroBanner from './SetupHeroBanner'
import { initCrazyGamesSdk, requestRewardedAd, getInviteLink, getInviteParam, updateRoom, leftRoom } from '../services/crazyGamesService'
import { isCampaignLevelUnlocked } from '../game/levels'
import {
  safeGetItem,
  safeSetItem,
  STORAGE_KEYS,
  sanitizeCampaignProgress,
  sanitizeDailyChallenge,
} from '../services/storageService'

function getDailyStreak() {
  try {
    const data = sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, {}))
    return data.streak || 0
  } catch {
    return 0
  }
}

const HowToPlay = lazy(() => import('./HowToPlay'))
const Campaign = lazy(() => import('./Campaign'))
const DailyChallenge = lazy(() => import('./DailyChallenge'))

const boardOptions = [
  { size: 3, label: '3x3', description: 'Klasik hızlı oyun', winLength: 3 },
  { size: 4, label: '4x4', description: 'Taktiksel arena (4 taş)', winLength: 4 },
  { size: 5, label: '5x5', description: 'Stratejik büyük tahta (4 taş)', winLength: 4 },
]

const classicTargets = [3, 5, 7, 9]
const arenaTargets = [15, 30, 50, 100]

const turnTimeOptions = [
  { value: 5, label: '5s', sublabel: 'yıldırım' },
  { value: 10, label: '10s', sublabel: 'hızlı' },
  { value: 15, label: '15s', sublabel: 'standart' },
  { value: 20, label: '20s', sublabel: 'rahat' },
  { value: 0, label: '∞', sublabel: 'sınırsız' },
]

const SKINS = [
  { id: 'neon', name: 'Siber Neon', icon: '⚡', isFree: true },
  { id: 'gold', name: 'Altın Efsane', icon: '🌟', isFree: false },
  { id: 'emerald', name: 'Zümrüt Retro', icon: '🌲', isFree: false },
  { id: 'cosmic', name: 'Kozmik Mor', icon: '🔮', isFree: false },
  { id: 'ice', name: 'Buz Kristali', icon: '❄️', isFree: false },
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
  const sdkRoom = getInviteParam('room')
  const params = new URLSearchParams(window.location.search)
  const roomParam = sdkRoom || params.get('room')
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
  const [gameMode, setGameMode] = useState('arena')
  const [opponentType, setOpponentType] = useState(() => (initialDeepLinkRoom ? 'online' : 'ai'))
  const [targetValue, setTargetValue] = useState(30)
  const [isInfinite, setIsInfinite] = useState(false)
  const [turnTimeLimit, setTurnTimeLimit] = useState(15)
  const [firstMove, setFirstMove] = useState('alternating')
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
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
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share)
  const [onlineBoostMode] = useState('random')
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  useEffect(() => {
    if (!onlineLobby?.room?.roomCode) return
    updateRoom({
      roomId: onlineLobby.room.roomCode,
      isJoinable: onlineLobby.room.status === 'waiting',
      inviteParams: { room: onlineLobby.room.roomCode },
    })
    return () => {
      leftRoom()
    }
  }, [onlineLobby?.room?.roomCode, onlineLobby?.room?.status])

  useEffect(() => {
    let isSubscribed = true
    const checkInviteParam = async () => {
      await initCrazyGamesSdk()
      if (!isSubscribed) return
      const room = getInviteParam('room')
      if (room && isValidRoomCodeInput(room.toUpperCase())) {
        const sanitized = room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
        setJoinRoomCode(sanitized)
        setOnlineFlow('join')
        setActiveModal('online_modal')
      }
    }
    void checkInviteParam()
    return () => {
      isSubscribed = false
    }
  }, [])

  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now())

  const [dailyStreak, setDailyStreak] = useState(getDailyStreak)

  // Skin / Cosmetic state
  const [selectedSkin, setSelectedSkin] = useState(() => {
    return safeGetItem(STORAGE_KEYS.ACTIVE_SKIN, 'neon')
  })

  const [unlockedSkins, setUnlockedSkins] = useState(() => {
    const saved = safeGetItem(STORAGE_KEYS.SKINS, null)
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      return saved
    }
    if (Array.isArray(saved)) {
      const map = { neon: true }
      const initialNow = Date.now()
      saved.forEach((id) => {
        map[id] = initialNow + TWENTY_FOUR_HOURS_MS
      })
      return map
    }
    return { neon: true }
  })

  // Multi-tab real-time synchronization
  useEffect(() => {
    const handleStorage = () => {
      setDailyStreak(getDailyStreak())
      const savedSkins = safeGetItem(STORAGE_KEYS.SKINS, { neon: true })
      setUnlockedSkins(savedSkins)
      const currentSkin = safeGetItem(STORAGE_KEYS.ACTIVE_SKIN, 'neon')
      setSelectedSkin(currentSkin)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [pendingUnlockSkin, setPendingUnlockSkin] = useState(null)
  const [isUnlockingSkin, setIsUnlockingSkin] = useState(false)
  const [skinUnlockNotice, setSkinUnlockNotice] = useState('')

  function isSkinUnlocked(skinId) {
    const skinObj = SKINS.find((s) => s.id === skinId)
    if (skinObj?.isFree) return true
    const expiresAt = unlockedSkins[skinId]
    if (!expiresAt) return false
    if (expiresAt === true) return true
    return expiresAt > nowTimestamp
  }

  function getSkinRemainingHours(skinId) {
    const expiresAt = unlockedSkins[skinId]
    if (!expiresAt || typeof expiresAt !== 'number') return null
    const diffMs = expiresAt - nowTimestamp
    if (diffMs <= 0) return null
    return Math.ceil(diffMs / (1000 * 60 * 60))
  }

  const activeSkinId = isSkinUnlocked(selectedSkin) ? selectedSkin : 'neon'

  function handleSelectSkin(skin) {
    registerUserGesture()
    playSound('click')
    setSelectedSkin(skin.id)
    safeSetItem(STORAGE_KEYS.ACTIVE_SKIN, skin.id)
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-skin', skin.id)
    }
  }

  function handleSkinClick(skin) {
    registerUserGesture()
    playSound('click')
    if (isSkinUnlocked(skin.id)) {
      handleSelectSkin(skin)
    } else {
      setSkinUnlockNotice('')
      setPendingUnlockSkin(skin)
    }
  }

  function handleConfirmSkinUnlock() {
    if (!pendingUnlockSkin || isUnlockingSkin) return
    registerUserGesture()
    playSound('click')
    setIsUnlockingSkin(true)
    setSkinUnlockNotice(t('skinUnlock.watching'))

    requestRewardedAd({
      onAdStarted: () => {
        // Video playing
      },
      onAdFinished: () => {
        setIsUnlockingSkin(false)
        const currentNow = Date.now()
        setNowTimestamp(currentNow)
        const expiresAt = currentNow + TWENTY_FOUR_HOURS_MS
        const newUnlocked = {
          ...unlockedSkins,
          [pendingUnlockSkin.id]: expiresAt,
        }
        setUnlockedSkins(newUnlocked)
        safeSetItem(STORAGE_KEYS.SKINS, newUnlocked)
        handleSelectSkin(pendingUnlockSkin)
        playSound('power')
        setSkinUnlockNotice(t('skinUnlock.success'))
        setTimeout(() => {
          setPendingUnlockSkin(null)
          setSkinUnlockNotice('')
        }, 1100)
      },
      onAdError: () => {
        setIsUnlockingSkin(false)
        setSkinUnlockNotice('')
      },
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.body.setAttribute('data-skin', activeSkinId)
  }, [activeSkinId])

  function renderSkinOptionsRow() {
    return (
      <div className="skin-options-row">
        {SKINS.map((skin) => {
          const isActive = activeSkinId === skin.id
          const isUnlocked = isSkinUnlocked(skin.id)
          const remainingHours = !skin.isFree && isUnlocked ? getSkinRemainingHours(skin.id) : null

          return (
            <button
              key={skin.id}
              className={`setup-option skin-option-btn ${isActive ? 'active' : ''} ${!isUnlocked ? 'skin-option-btn--locked' : ''}`}
              type="button"
              onClick={() => handleSkinClick(skin)}
              title={
                isUnlocked
                  ? skin.isFree
                    ? (t(`skins.${skin.id}`) || skin.name)
                    : `${t(`skins.${skin.id}`) || skin.name} (${t('skinUnlock.hoursRemaining', { hours: remainingHours || 24 })})`
                  : `${t(`skins.${skin.id}`) || skin.name} (${t('skinUnlock.locked')})`
              }
            >
              <span className="skin-btn-content">
                {skin.icon} {t(`skins.${skin.id}`) || skin.name}
              </span>
              {isActive && <span className="skin-check-badge">✓</span>}
              {!isUnlocked && (
                <span className="skin-lock-badge" aria-label={t('skinUnlock.locked')}>
                  🔒
                </span>
              )}
              {!skin.isFree && isUnlocked && (
                <span className="skin-pass-badge" title={t('skinUnlock.hoursRemaining', { hours: remainingHours || 24 })}>
                  ⏱️
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedSkin = window.localStorage.getItem('xo-arena-skin') || 'neon'
    document.body.setAttribute('data-skin', savedSkin)

    // URL Deep Link temizliği: Link ile gelindiğinde oda kodu state'e aktarılır,
    // ancak adres çubuğundaki "?room=..." hemen temizlenir. Böylece kullanıcı
    // oyun bittikten veya ayrıldıktan sonra sayfayı yenilediğinde (F5) modal tekrar açılmaz.
    if (window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
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

  useEffect(() => {
    if (!activeModal) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModal])

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
      firstMove: opponentType === 'ai' ? firstMove : 'alternating',
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
    setIsLinkCopied(false)
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
      setOnlineError(t('setup.onlineModal.errorEmptyName'))
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
      setOnlineError(t('setup.onlineModal.errorEmptyName'))
      return
    }

    if (!roomCode) {
      setOnlineError(t('setup.onlineModal.errorEmptyCode'))
      return
    }

    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      setOnlineError(t('setup.onlineModal.errorInvalidCode') || 'Geçerli bir 6 haneli oda kodu girin.')
      return
    }

    setOnlineError('')
    setOnlineConnectionMessage('')
    setOnlineLoadingAction('join')

    try {
      const safeCode = encodeURIComponent(roomCode)
      const access = await requestRoomJson(`/api/rooms/${safeCode}/join`, {
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

    try {
      await navigator.clipboard.writeText(onlineLobby.room.roomCode)
      setIsRoomCodeCopied(true)
      setTimeout(() => setIsRoomCodeCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  async function handleCopyInviteLink() {
    registerUserGesture()
    playSound('click')
    const roomCode = onlineLobby?.room?.roomCode
    if (!roomCode || !navigator.clipboard) return

    const safeRoomCode = encodeURIComponent(String(roomCode).trim())
    const link = getInviteLink({ room: safeRoomCode }) || `${window.location.origin}${window.location.pathname}?room=${safeRoomCode}`

    try {
      await navigator.clipboard.writeText(link)
      setIsLinkCopied(true)
      setTimeout(() => setIsLinkCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  async function handleShareOther() {
    registerUserGesture()
    playSound('click')
    const roomCode = onlineLobby?.room?.roomCode
    if (!roomCode) return

    const safeRoomCode = encodeURIComponent(String(roomCode).trim())
    const link = getInviteLink({ room: safeRoomCode }) || `${window.location.origin}${window.location.pathname}?room=${safeRoomCode}`
    const challengeText = isTr
      ? `⚔️ XO Tactix'te seninle kapışmak istiyorum! Odaya katılmak için tıkla:\n${link}\n\nOda Kodu: ${roomCode}`
      : `⚔️ I challenge you to an XO Tactix duel! Click to join:\n${link}\n\nRoom Code: ${roomCode}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: isTr ? 'XO Tactix Düellosu' : 'XO Tactix Challenge',
          text: challengeText,
          url: link,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    await handleCopyInviteLink()
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
        const safeCode = encodeURIComponent(String(roomCode ?? '').trim())
        const room = await requestRoomJson(`/api/rooms/${safeCode}`)

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
          <h1>XO TACTIX</h1>
          <p>{t('setup.slogan')}</p>
        </header>

        <SetupHeroBanner />

        {/* ── Quick Play: 1-Click Arena Game (CG Requirement: Max 1 click to gameplay) ── */}
        <button
          type="button"
          className="quick-play-button"
          onClick={() => {
            registerUserGesture()
            playSound('click')
            onStartGame({
              boardSize: 3,
              winLength: 3,
              opponentType: 'ai',
              gameMode: 'arena',
              targetValue: 15,
              isInfinite: false,
              turnTimeLimit: 15,
              firstMove: 'alternating',
              player1Name: isTr ? 'Oyuncu' : 'Player',
              player2Name: 'Bot',
              difficultyOverride: 'medium',
            })
          }}
        >
          <span className="quick-play-icon">⚡</span>
          <span className="quick-play-text">{isTr ? 'Hızlı Oyna' : 'Quick Play'}</span>
          <span className="quick-play-desc">{isTr ? 'Arena 3x3 • Bot • Güçler Aktif' : 'Arena 3x3 • Bot • Powers On'}</span>
        </button>

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
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className={`viral-mode-card viral-mode-card--online ${!IS_ONLINE_ENABLED ? 'is-disabled' : ''}`}
            onClick={() => handleSelectMode('online')}
            disabled={!IS_ONLINE_ENABLED}
          >
            {!IS_ONLINE_ENABLED && (
              <div className="viral-card-badge viral-card-badge--soon">
                {isTr ? 'YAKINDA' : 'SOON'}
              </div>
            )}
            <div className="viral-card-icon">🌐</div>
            <div className="viral-card-content">
              <h3>{t('setup.modes.online')}</h3>
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className="viral-mode-card viral-mode-card--campaign"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              setActiveModal('campaign_modal')
            }}
          >
            <div className="viral-card-icon">🧩</div>
            <div className="viral-card-content">
              <h3>{isTr ? 'Bulmaca Seferi' : 'Puzzle Quest'}</h3>
            </div>
            <div className="viral-card-arrow">→</div>
          </button>

          <button
            type="button"
            className="viral-mode-card viral-mode-card--daily"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              setActiveModal('daily_modal')
            }}
          >
            <div className="viral-card-icon">📅</div>
            <div className="viral-card-content">
              <h3>{isTr ? 'Günlük Görev' : 'Daily Challenge'}</h3>
            </div>
            <div className="viral-card-actions-right">
              {dailyStreak > 0 && (
                <span className="daily-streak-badge">
                  🔥 {dailyStreak}
                </span>
              )}
              <span className="viral-card-arrow">→</span>
            </div>
          </button>

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

          <div className="setup-legal-links">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
              {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
            </a>
            <span className="legal-dot">•</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">
              {isTr ? 'Kullanım Koşulları' : 'Terms of Service'}
            </a>
          </div>
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
            <button
              type="button"
              className="viral-modal-close"
              onClick={closeModal}
              aria-label={t('common.close') || 'Kapat'}
            >
              ×
            </button>

            <div className="viral-modal-header">
              <span className="viral-modal-icon">
                {opponentType === 'ai' ? '🤖' : '👥'}
              </span>
              <h2>{opponentType === 'ai' ? t('setup.modes.ai') : t('setup.modes.human')}</h2>
              <p>{opponentType === 'ai' ? t('setup.modes.aiDesc') : t('setup.modes.humanDesc')}</p>
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

            <button
              type="button"
              className="advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>{showAdvanced ? (isTr ? 'Gelişmiş Ayarları Gizle' : 'Hide Advanced') : (isTr ? 'Gelişmiş Ayarlar' : 'Advanced Settings')}</span>
              <span className="advanced-toggle-arrow">{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <>
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
                        opt.value === 5
                          ? t('setup.settingsModal.timeBullet')
                          : opt.value === 10
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

                {/* ── İlk Hamle Seçimi (Sadece Bot Modunda) ── */}
                {opponentType === 'ai' && (
                  <div className="setup-group">
                    <span className="setup-label">{t('setup.settingsModal.firstMove')}</span>
                    <div className="setup-options">
                      <button
                        className={firstMove === 'alternating' ? 'setup-option active' : 'setup-option'}
                        type="button"
                        onClick={() => {
                          registerUserGesture()
                          playSound('click')
                          setFirstMove('alternating')
                        }}
                      >
                        {t('setup.settingsModal.firstMoveAlternating')}
                      </button>
                      <button
                        className={firstMove === 'human' ? 'setup-option active' : 'setup-option'}
                        type="button"
                        onClick={() => {
                          registerUserGesture()
                          playSound('click')
                          setFirstMove('human')
                        }}
                      >
                        {t('setup.settingsModal.firstMovePlayer')}
                      </button>
                      <button
                        className={firstMove === 'ai' ? 'setup-option active' : 'setup-option'}
                        type="button"
                        onClick={() => {
                          registerUserGesture()
                          playSound('click')
                          setFirstMove('ai')
                        }}
                      >
                        {t('setup.settingsModal.firstMoveBot')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Single-Row Non-Wrapping Skin / Theme Selector ── */}
            <div className="setup-group">
              <span className="setup-label">{t('setup.settingsModal.skinTheme')}</span>
              {renderSkinOptionsRow()}
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
            <button
              type="button"
              className="viral-modal-close"
              onClick={closeModal}
              aria-label={t('common.close') || 'Kapat'}
            >
              ×
            </button>

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
            <button
              type="button"
              className="viral-modal-close"
              onClick={closeModal}
              aria-label={t('common.close') || 'Kapat'}
            >
              ×
            </button>

            <div className="viral-modal-header">
              <span className="viral-modal-icon">🌐</span>
              <h2>{t('setup.onlineModal.title')}</h2>
              <p>{t('setup.modes.onlineDesc')}</p>
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
                            opt.value === 5
                              ? t('setup.settingsModal.timeBullet')
                              : opt.value === 10
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
                      {renderSkinOptionsRow()}
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
                      {renderSkinOptionsRow()}
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
                    <button
                      type="button"
                      className="online-lobby-code-chip"
                      onClick={handleCopyRoomCode}
                      title={t('setup.onlineModal.clickToCopy')}
                    >
                      <strong className="online-code-display">{onlineLobby.room.roomCode}</strong>
                      <span className={`online-code-badge ${isRoomCodeCopied ? 'online-code-badge--copied' : ''}`}>
                        {isRoomCodeCopied ? t('setup.onlineModal.copiedCode') : `📋 ${t('setup.onlineModal.copyCode')}`}
                      </span>
                    </button>

                    {/* Viral Share Actions for Host */}
                    {onlineLobby.symbol === 'X' && (
                      <div className="online-copy-buttons-group">
                        <button
                          type="button"
                          className={`online-copy-action online-copy-action--invite ${isLinkCopied ? 'online-copy-action--copied' : ''}`}
                          onClick={handleCopyInviteLink}
                        >
                          <span>
                            {isLinkCopied
                              ? t('setup.onlineModal.copiedLink')
                              : `🔗 ${t('setup.onlineModal.copyLink')}`}
                          </span>
                        </button>
                        {canNativeShare && (
                          <button
                            type="button"
                            className="online-copy-action online-copy-action--share"
                            onClick={handleShareOther}
                          >
                            <span>📤 {t('setup.onlineModal.shareOther')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="online-room-details">
                    <div>
                      <span>{t('setup.onlineModal.roleLabel')}</span>
                      <strong>{onlineLobby.symbol === 'X' ? t('setup.onlineModal.roleHost') : t('setup.onlineModal.roleGuest')}</strong>
                    </div>
                    <div>
                      <span>{t('setup.onlineModal.statusLabel')}</span>
                      <strong>{getRoomStatusText(onlineLobby.room.status, isTr)}</strong>
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
                        <span>{onlineLoadingAction === 'start' ? t('common.loading') : t('setup.onlineModal.startOnline')}</span>
                      </button>
                    )}

                    {isLeaveConfirmOpen ? (
                      <div className="online-leave-confirm-card">
                        <strong>{onlineLobby.symbol === 'X' ? t('setup.onlineModal.confirmCloseTitle') : t('setup.onlineModal.confirmLeaveTitle')}</strong>
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
                            {t('setup.onlineModal.confirmLeaveAction')}
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
                        <span>{onlineLobby.symbol === 'X' ? t('setup.onlineModal.closeRoom') : t('setup.onlineModal.leaveLobby')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HOW TO PLAY MODAL ── */}
      {isHowToPlayOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* ── REWARDED AD THEME UNLOCK MODAL ── */}
      {pendingUnlockSkin && (
        <div
          className="viral-modal-overlay skin-unlock-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isUnlockingSkin) setPendingUnlockSkin(null)
          }}
        >
          <div
            className="viral-modal-card skin-unlock-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="skin-unlock-header">
              <span className="skin-unlock-icon">{pendingUnlockSkin.icon}</span>
              <h3 className="skin-unlock-title">{t('skinUnlock.title')}</h3>
              <p className="skin-unlock-subtitle">{t('skinUnlock.subtitle')}</p>
            </div>

            <div className="skin-unlock-body">
              <div className="skin-preview-card" data-skin={pendingUnlockSkin.id}>
                <span className="skin-preview-name">
                  {t(`skins.${pendingUnlockSkin.id}`) || pendingUnlockSkin.name}
                </span>
                <span className="skin-preview-badge">{t('skinUnlock.exclusiveBadge')}</span>
              </div>
              <p className="skin-unlock-prompt">
                {t('skinUnlock.prompt', {
                  skinName: t(`skins.${pendingUnlockSkin.id}`) || pendingUnlockSkin.name,
                })}
              </p>
              {skinUnlockNotice && (
                <p className="skin-unlock-notice" role="status">
                  {skinUnlockNotice}
                </p>
              )}
            </div>

            <div className="skin-unlock-actions">
              <button
                type="button"
                className="skin-unlock-watch-btn"
                onClick={handleConfirmSkinUnlock}
                disabled={isUnlockingSkin}
              >
                {isUnlockingSkin ? '⏳ ...' : t('skinUnlock.watchBtn')}
              </button>
              <button
                type="button"
                className="skin-unlock-cancel-btn"
                onClick={() => setPendingUnlockSkin(null)}
                disabled={isUnlockingSkin}
              >
                {t('skinUnlock.cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeModal === 'campaign_modal' && (
        <Suspense
          fallback={
            <div className="loading-fallback-overlay" role="status" aria-live="polite">
              <div className="loading-fallback-spinner" />
              <span>{isTr ? 'Bulmaca Seferi Yükleniyor...' : 'Loading Puzzle Quest...'}</span>
            </div>
          }
        >
          <Campaign
            onPlayLevel={(levelConfig) => {
              if (!levelConfig || !levelConfig.id) return
              const savedCampaign = sanitizeCampaignProgress(safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} }))
              if (!isCampaignLevelUnlocked(levelConfig.id, savedCampaign)) {
                console.warn(`[Security] Level ${levelConfig.id} is locked. Play request rejected.`)
                return
              }
              setActiveModal(null)
              onStartGame({
                boardSize: levelConfig.boardSize,
                winLength: levelConfig.winLength,
                opponentType: 'ai',
                gameMode: 'arena',
                targetValue: 1,
                isInfinite: false,
                turnTimeLimit: levelConfig.timeLimit || 15,
                firstMove: 'human',
                player1Name: isTr ? 'Oyuncu' : 'Player',
                player2Name: 'Bot',
                campaignLevel: levelConfig,
                difficultyOverride: levelConfig.difficulty || 'medium',
              })
            }}
            onBack={() => setActiveModal(null)}
            language={language}
          />
        </Suspense>
      )}

      {activeModal === 'daily_modal' && (
        <Suspense
          fallback={
            <div className="loading-fallback-overlay" role="status" aria-live="polite">
              <div className="loading-fallback-spinner" />
              <span>{isTr ? 'Günün Görevi Yükleniyor...' : 'Loading Daily Challenge...'}</span>
            </div>
          }
        >
          <DailyChallenge
            onPlayChallenge={(challengeConfig) => {
              setActiveModal(null)
              onStartGame({
                boardSize: challengeConfig.boardSize || 3,
                winLength: challengeConfig.winLength || 3,
                opponentType: 'ai',
                gameMode: challengeConfig.gameMode || 'arena',
                targetValue: 1,
                isInfinite: false,
                turnTimeLimit: challengeConfig.timeLimit || 15,
                firstMove: 'human',
                player1Name: isTr ? 'Oyuncu' : 'Player',
                player2Name: 'Bot',
                dailyChallenge: challengeConfig,
                difficultyOverride: challengeConfig.difficulty || 'hard',
              })
            }}
            onBack={() => setActiveModal(null)}
            language={language}
          />
        </Suspense>
      )}

    </main>
  )
}
