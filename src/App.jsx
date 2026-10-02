import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import GameSetup from './components/GameSetup'
import { ARENA_POWER_NAMES, createInitialPowerCounts, missionPowerIds, rewardedPowerIds } from './game/powers'
import RoundResultPreviewBar from './components/RoundResultPreviewBar'
import FloatingEmote from './components/FloatingEmote'
import QuickEmoteBar from './components/QuickEmoteBar'
import SoundToggle from './components/SoundToggle'
import OnlineGame from './components/OnlineGame'
import RoundResultModal from './components/RoundResultModal'
import IntroAnimation from './components/IntroAnimation'
import TutorialOverlay from './components/TutorialOverlay'

// PERFORMANCE OPTIMIZATION (Action 15): Decouple main thread entry from aiPlayer.js.
// AI calculations run in aiWorker.js. By loading aiPlayer dynamically on demand,
// we eliminate ~56KB of Minimax & Zobrist tables from the initial bundle.
let aiPlayerModulePromise = null
function getAiPlayerModule() {
  if (!aiPlayerModulePromise) {
    aiPlayerModulePromise = import('./game/aiPlayer')
  }
  return aiPlayerModulePromise
}
import { useTranslation } from './i18n'
import {
  initCrazyGamesSdk,
  gameplayStart,
  gameplayStop,
  requestMidgameAd,
  requestRewardedAd,
  triggerHappytime,
  loadingStart,
  loadingStop,
} from './services/crazyGamesService'
import { setAdMuted } from './game/soundManager'
import {
  calculateRoundScore,
  calculateWinner,
  createBoardMultipliers,
  createEmptyBoard,
  getWinningLine,
  isBoardFull,
} from './game/gameLogic'
import {
  drawMessages,
  getRandomMessage,
  loserMessages,
  translateLoserMessage,
  translateResultMessage,
  winnerMessages,
} from './game/messages'
import {
  clearLocalSession,
  clearOnlineSession,
  hasStoredLocalSession,
  hasStoredOnlineSession,
  readLocalSession,
  readOnlineSession,
  writeLocalSession,
  writeOnlineSession,
} from './sessionStorage'
import {
  IS_ONLINE_ENABLED,
  requestRoomJson,
} from './api/roomsApi'
import { playSound, registerUserGesture } from './game/soundManager'
import { addXP, loadProgress, saveProgress, unlockAchievement } from './game/progression'
import {
  extractMissionBoardSetup,
  evaluateMissionConstraints,
  evaluateMissionStars,
  unlockSkinReward,
  getLevelById,
  isCampaignLevelUnlocked,
} from './game/levels'
import {
  safeGetItem,
  safeSetItem,
  STORAGE_KEYS,
  sanitizeCampaignProgress,
  sanitizeDailyChallenge,
  syncAllWithCrazyGamesCloud,
} from './services/storageService'

const defaultBoardSize = 3

const initialScores = {
  X: 0,
  O: 0,
  p1: 0,
  p2: 0,
}

const initialArenaSettings = {
  powersEnabled: true,
  multipliersEnabled: true,
  boostMode: 'random',
}


function createInitialPlayerPowers(powerOptions = { gameMode: 'arena' }) {
  return {
    X: createInitialPowerCounts(powerOptions),
    O: createInitialPowerCounts(powerOptions),
  }
}

function createMissionPowers(config, gameMode, opponentType) {
  const defaults = createInitialPowerCounts({
    gameMode,
    opponentType,
    playContext: 'local',
  })
  const mission = config?.campaignLevel ?? config?.dailyChallenge
  const initialPowers = mission?.initialPowers
  const botPowers = mission?.botPowers ?? {}
  const missionDefaults = mission && initialPowers
    ? missionPowerIds.reduce((counts, powerId) => ({ ...counts, [powerId]: 0 }), {})
    : defaults

  return {
    X: { ...missionDefaults, ...(initialPowers ?? {}) },
    O: mission && initialPowers ? { ...missionDefaults, ...botPowers } : { ...defaults },
  }
}

function isDailyChallengeCompletedForDate(date) {
  if (!date) return false
  try {
    const progress = sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, {}))
    return Boolean(progress.history?.[date]?.completed || progress.lastCompleted === date)
  } catch (error) {
    console.error('Failed to verify daily challenge progress', error)
    return false
  }
}
function formatStarGoal(starDef, isTr, starIndex = 2, isPuzzle = false) {
  if (!starDef) return isTr ? 'Zafer' : 'Win'
  if (starDef.condition === 'win') {
    if (isPuzzle) {
      if (starIndex === 2) return isTr ? 'Taktik' : 'Tactics'
      return isTr ? 'Bulmaca' : 'Puzzle'
    }
    return isTr ? 'Zafer' : 'Win'
  }
  if (starDef.condition === 'win_in_moves' || starDef.condition === 'exact_moves') {
    if (starDef.value === 1) {
      return isTr ? 'Tek Hamle' : '1 Move'
    }
    return isTr ? `En Çok ${starDef.value} Hamle` : `Max ${starDef.value} Moves`
  }
  if (starDef.condition === 'score_above') {
    if (starIndex === 3 || (starDef.value ?? 0) >= 200) {
      return isTr ? '3x Çarpan' : '3x Multiplier'
    }
    return isTr ? '2x Çarpan' : '2x Multiplier'
  }
  if (starDef.condition === 'power_used') {
    const powerName = ARENA_POWER_NAMES[starDef.value] ?? starDef.value
    return isTr ? `${powerName} Gücü` : `${powerName} Power`
  }
  if (starDef.condition === 'no_powers') {
    return isTr ? 'Güçsüz' : 'No Powers'
  }
  return isTr ? 'Özel Hedef' : 'Objective'
}

function getMissionObjective(mission, isTr) {
  if (!mission) return ''
  const langKey = isTr ? 'tr' : 'en'
  const desc = mission.description?.[langKey]
  if (desc) return desc
  if (mission.constraints?.requirePower) {
    const powerName = ARENA_POWER_NAMES[mission.constraints.requirePower] ?? mission.constraints.requirePower
    return isTr ? `${powerName} gücünü mutlaka kullanarak kazan!` : `Win using the ${powerName} power!`
  }
  if (mission.constraints?.requireMultiplier) {
    return isTr ? 'Çarpanlı (2x/3x) karelerden birini kullanarak kazan!' : 'Win using multiplier cells on your line!'
  }
  if (mission.constraints?.exactMoves) {
    return isTr ? `Tam olarak ${mission.constraints.exactMoves} hamlede kazan!` : `Win in exactly ${mission.constraints.exactMoves} move!`
  }
  if (mission.constraints?.maxMoves) {
    return isTr ? `En fazla ${mission.constraints.maxMoves} hamle içinde kazan!` : `Win in ${mission.constraints.maxMoves} moves or fewer!`
  }
  if (mission.constraints?.noPowers) {
    return isTr ? 'Hiçbir güç kullanmadan saf zekayla kazan!' : 'Win without using any powers!'
  }
  return isTr ? 'Stratejini kur ve yapay zekayı alt et!' : 'Outsmart the AI to claim victory!'
}

export default function App() {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const [squares, setSquares] = useState(() => createEmptyBoard(defaultBoardSize))
  const [xIsNext, setXIsNext] = useState(true)
  const [gameMode, setGameMode] = useState('classic')
  const [scores, setScores] = useState(initialScores)
  const [arenaSettings, setArenaSettings] = useState(initialArenaSettings)
  const [pendingArenaSettings, setPendingArenaSettings] = useState(null)
  const [multipliers, setMultipliers] = useState({})
  const [playerPowers, setPlayerPowers] = useState(createInitialPlayerPowers)
  const [activePower, setActivePower] = useState(null)
  const [shieldedSquares, setShieldedSquares] = useState([])
  const [lockedSquares, setLockedSquares] = useState([])
  const [blockedSquares, setBlockedSquares] = useState([])
  const [currentMoves, setCurrentMoves] = useState(0)
  const [frozenSquares, setFrozenSquares] = useState([])
  const [frozenBy, setFrozenBy] = useState(null)
  const [boostedSquares, setBoostedSquares] = useState([])
  const [visibleBoostedSquares, setVisibleBoostedSquares] = useState([])
  const [traps, setTraps] = useState([])
  const [blackHoleEvent, setBlackHoleEvent] = useState(null)
  const [bombEvent, setBombEvent] = useState(null)
  const [vampireTransferEvent, setVampireTransferEvent] = useState(null)
  const [stolenSquares, setStolenSquares] = useState([])
  const [actionError, setActionError] = useState('')
  const [resultMessage, setResultMessage] = useState(null)
  const [loserMessage, setLoserMessage] = useState(null)
  const [gameConfig, setGameConfig] = useState(null)
  const [onlineGame, setOnlineGame] = useState(null)
  const [isSessionRestoreChecked, setIsSessionRestoreChecked] = useState(
    () => !hasStoredOnlineSession() && !hasStoredLocalSession()
  )
  const [setupRestoreMessage, setSetupRestoreMessage] = useState('')
  const [showSetupReturnConfirm, setShowSetupReturnConfirm] = useState(false)
  const [showScoreResetConfirm, setShowScoreResetConfirm] = useState(false)
  const [isRoundResultDismissed, setIsRoundResultDismissed] = useState(false)
  const [roundNumber, setRoundNumber] = useState(1)
  const [humanWinStreak, setHumanWinStreak] = useState(0)
  const [missionResult, setMissionResult] = useState(null)
  const [consecutiveDraws, setConsecutiveDraws] = useState(0)
  const [floatingEmotes, setFloatingEmotes] = useState([])
  const botHurrySentRef = useRef(false)
  const missionCompletionRef = useRef(null)
  const missionInitialPowersRef = useRef(null)
  const missionInitialFilledCountRef = useRef(0)
  const missionTotalTurnsRef = useRef(0)
  const missionFailureRef = useRef(null)
  const [rewardedPowerClaimed, setRewardedPowerClaimed] = useState(false)
  const [isRewarding, setIsRewarding] = useState(false)
  const [rewardedPowerMessage, setRewardedPowerMessage] = useState('')
  const [isRewardedPowerPickerOpen, setIsRewardedPowerPickerOpen] = useState(false)
  const [hasUsedPowerThisTurn, setHasUsedPowerThisTurn] = useState(false)
  const [timeoutWinner, setTimeoutWinner] = useState(null)
  const [turnTimeLeft, setTurnTimeLeft] = useState(15)
  const turnDeadlineRef = useRef(null)
  const lastTurnKeyRef = useRef('')
  const lastTickSecondRef = useRef(15)
  const isSessionRestoredRef = useRef(false)
  const isMoveProcessingRef = useRef(false)
  const pausedRemainingMsRef = useRef(null)

  // Intro animation state — show only on first visit (no stored session, no gameConfig)
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.localStorage.getItem('xo-intro-seen') &&
           !hasStoredOnlineSession() &&
           !hasStoredLocalSession()
  })

  // In-game tutorial state
  const [tutorialStep, setTutorialStep] = useState(0)  // 0 = not active, 1-4 = active steps
  const [isTutorialActive, setIsTutorialActive] = useState(false)

  const activeTimeoutsRef = useRef(new Set())

  const safeSetTimeout = useCallback((fn, delay) => {
    const timerId = window.setTimeout(() => {
      activeTimeoutsRef.current.delete(timerId)
      fn()
    }, delay)
    activeTimeoutsRef.current.add(timerId)
    return timerId
  }, [])

  const clearSafeTimeout = useCallback((timerId) => {
    if (timerId) {
      window.clearTimeout(timerId)
      activeTimeoutsRef.current.delete(timerId)
    }
  }, [])

  const clearAllTimeouts = useCallback(() => {
    activeTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
    activeTimeoutsRef.current.clear()
  }, [])

  useEffect(() => {
    let isSubscribed = true
    const initApp = async () => {
      try {
        await initCrazyGamesSdk()
        if (!isSubscribed) return
        await loadingStart()
        await syncAllWithCrazyGamesCloud()
      } catch (err) {
        console.warn('[App] Initialization notice:', err)
      } finally {
        await loadingStop()
      }
    }
    void initApp()
    return () => {
      isSubscribed = false
    }
  }, [])

  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [clearAllTimeouts])

  const boardSize = gameConfig?.boardSize ?? defaultBoardSize
  const winLength = gameConfig?.winLength ?? 3
  const opponentType = gameConfig?.opponentType ?? 'human'
  const powerOptions = {
    gameMode,
    opponentType,
    playContext: 'local',
  }
  const activeMission = gameConfig?.campaignLevel ?? gameConfig?.dailyChallenge
  const missionExtraPowerIds = activeMission
    ? missionPowerIds.filter((powerId) => (
      (activeMission.initialPowers?.[powerId] ?? 0) > 0 ||
      activeMission.constraints?.requirePower === powerId
    ))
    : []
  const winner = calculateWinner(squares, boardSize, winLength)
  const winningLine = getWinningLine(squares, boardSize, winLength)
  const multipliersEnabled = gameMode === 'arena' && (
    arenaSettings.multipliersEnabled ||
    Boolean(activeMission?.constraints?.requireMultiplier) ||
    Boolean((activeMission?.initialPowers?.vampire ?? 0) > 0)
  )
  const powersEnabled = gameMode === 'arena' &&
    arenaSettings.powersEnabled &&
    !gameConfig?.campaignLevel?.constraints?.noPowers &&
    !gameConfig?.dailyChallenge?.constraints?.noPowers
  const isDraw = !winner && isBoardFull(squares, blockedSquares)
  const currentPlayer = xIsNext ? 'X' : 'O'

  // Oyuncu İsimleri ve Sırayla X/O Olma (Rotasyon) Mekaniği
  const defaultHuman = isTr ? 'Oyuncu' : 'Player'
  const defaultP1 = isTr ? '1. Oyuncu' : 'Player 1'
  const defaultP2 = isTr ? '2. Oyuncu' : 'Player 2'
  const p1Raw = gameConfig?.player1Name?.trim()
  const p2Raw = gameConfig?.player2Name?.trim()

  const player1Name = opponentType === 'ai'
    ? defaultHuman
    : (!p1Raw || p1Raw === '1. Oyuncu' || p1Raw === 'Player 1' || p1Raw === 'Oyuncu' || p1Raw === 'Player' ? defaultP1 : p1Raw)
  const player2Name = opponentType === 'ai'
    ? 'Bot'
    : (!p2Raw || p2Raw === '2. Oyuncu' || p2Raw === 'Player 2' ? defaultP2 : p2Raw)

  // Yan Yana (human vs human) modunda:
  // 1, 3, 5... (Tek) turlarda: 1. Oyuncu = X (başlar), 2. Oyuncu = O
  // 2, 4, 6... (Çift) turlarda: 2. Oyuncu = X (başlar), 1. Oyuncu = O
  // Bot modunda: firstMove seçimine göre ('alternating', 'human', 'ai')
  const isP1X = opponentType === 'human'
    ? (roundNumber % 2 === 1)
    : gameConfig?.firstMove === 'ai'
      ? false
      : gameConfig?.firstMove === 'human'
        ? true
        : (roundNumber % 2 === 1)
  const p1Symbol = isP1X ? 'X' : 'O'
  const p2Symbol = isP1X ? 'O' : 'X'
  const aiSymbol = p2Symbol       // Bot her zaman Oyuncu 2
  const humanSymbol = p1Symbol    // İnsan her zaman Oyuncu 1
  const xPlayerName = isP1X ? player1Name : player2Name
  const oPlayerName = isP1X ? player2Name : player1Name

  const p1Score = scores.p1 ?? scores.X ?? 0
  const p2Score = scores.p2 ?? scores.O ?? 0

  const effectiveWinner = winner || timeoutWinner
  const winnerPlayerName = effectiveWinner === 'X' ? xPlayerName : effectiveWinner === 'O' ? oPlayerName : null

  const matchWinner =
    gameConfig && !gameConfig.isInfinite
      ? p1Score >= gameConfig.targetValue
        ? player1Name
        : p2Score >= gameConfig.targetValue
          ? player2Name
          : null
      : null

  const displayedResultMessage = translateResultMessage(resultMessage, language)
  const displayedLoserMessage = translateLoserMessage(loserMessage, language)
  const isAiTurn = Boolean(
    gameConfig &&
    (gameMode === 'classic' || gameMode === 'arena') &&
    opponentType === 'ai' &&
    currentPlayer === aiSymbol &&
    !effectiveWinner &&
    !matchWinner &&
    !isDraw
  )
  const turnTimeLimit = gameConfig?.turnTimeLimit ?? 0
  const difficultyOverride = gameConfig?.difficultyOverride ?? null
  const aiPersonality = gameConfig?.aiPersonality || gameConfig?.campaignLevel?.aiPersonality || gameConfig?.dailyChallenge?.aiPersonality || null
  const isAiThinking = isAiTurn
  const effectiveLockedSquares = useMemo(
    () => [...lockedSquares, ...blockedSquares],
    [lockedSquares, blockedSquares]
  )
  const hasGameStarted =
    squares.some(Boolean) ||
    shieldedSquares.length > 0 ||
    effectiveLockedSquares.length > 0 ||
    boostedSquares.length > 0 ||
    traps.length > 0
  const boostTargets = squares
    .map((square, index) =>
      square || boostedSquares.includes(index) || effectiveLockedSquares.includes(index)
        ? null
        : index
    )
    .filter((index) => index !== null)
  const hasBoostTarget = boostTargets.length > 0
  const opponentPlayer = currentPlayer === 'X' ? 'O' : 'X'
  const vampireSources = squares
    .map((square, index) => square === opponentPlayer && multipliers[index] && !stolenSquares.includes(index) ? index : null)
    .filter((index) => index !== null)
  const vampireTargets = squares
    .map((square, index) => square === currentPlayer && !multipliers[index] ? index : null)
    .filter((index) => index !== null)

  const boardShakeClass = bombEvent
    ? 'board-shake-bomb'
    : blackHoleEvent
      ? 'board-shake-blackhole'
      : vampireTransferEvent
        ? 'board-shake-vampire'
        : ''

  const arenaPowerTargets = {
    bomb: squares.flatMap((square, index) =>
      square && !shieldedSquares.includes(index) ? [index] : []
    ),
    shield: squares.flatMap((square, index) =>
      square === currentPlayer && !shieldedSquares.includes(index) ? [index] : []
    ),
    boost: squares.flatMap((square, index) =>
      !square && !boostedSquares.includes(index) && !effectiveLockedSquares.includes(index) ? [index] : []
    ),
    trap: squares.flatMap((square, index) =>
      !square && !effectiveLockedSquares.includes(index) && !traps.some((trap) => trap.index === index && trap.owner === currentPlayer) ? [index] : []
    ),
    freeze: squares.flatMap((square, index) =>
      !square && !effectiveLockedSquares.includes(index) && !frozenSquares.includes(index) ? [index] : []
    ),
    vampire: vampireSources.length > 0 && vampireTargets.length > 0 ? vampireSources : [],
  }
  const activePowerTargets = powersEnabled && activePower ? arenaPowerTargets[activePower] ?? [] : null
  const isArena = gameMode === 'arena'
  const isMissionMode = Boolean(gameConfig?.campaignLevel || gameConfig?.dailyChallenge)
  // Hediye kutusu reklam izleme sadece VS Bot modunda (Arena + güçler aktifken) geçerlidir
  const isRewardedPowerAvailable = Boolean(
    gameConfig &&
    opponentType === 'ai' &&
    gameMode === 'arena' &&
    powersEnabled &&
    !isMissionMode
  )
  const scoreLabel = isArena
    ? (t('common.point') || (isTr ? 'Puan' : 'Points'))
    : (t('common.score') || (isTr ? 'Skor' : 'Score'))
  const modeChip = gameConfig?.campaignLevel
    ? (isTr ? 'BULMACA' : 'PUZZLE')
    : gameConfig?.dailyChallenge
      ? (isTr ? 'GÖREV' : 'MISSION')
      : isArena
        ? (t('setup.settingsModal.arena') || 'Arena').toUpperCase()
        : (t('setup.settingsModal.classic') || 'Classic').toUpperCase()
  const targetChip = gameConfig
    ? isMissionMode
      ? (isTr ? 'TEK TUR' : 'SINGLE ROUND')
      : gameConfig.isInfinite
        ? (t('common.infinite') || '∞')
        : !isArena
          ? `${gameConfig.targetValue} ${(t('common.round') || (isTr ? 'TUR' : 'ROUNDS')).toUpperCase()}`
          : `${gameConfig.targetValue} ${(t('common.point') || (isTr ? 'PUAN' : 'POINTS')).toUpperCase()}`
    : (t('common.newMatch') || (isTr ? 'YENİ MAÇ' : 'NEW MATCH'))
  const lineChip = `${winLength} ${isTr ? 'TAŞ' : 'IN-A-ROW'}`

  const isGameOver = Boolean(effectiveWinner || matchWinner || isDraw)

  const p1GameOverStatus = useMemo(() => {
    if (!isGameOver) return undefined
    if (isMissionMode) {
      if (effectiveWinner === humanSymbol || matchWinner === player1Name) {
        return isTr ? '🏆 Görev Başarılı' : '🏆 Mission Passed'
      }
      if (effectiveWinner === aiSymbol || matchWinner === player2Name) {
        return isTr ? '✕ Başarısız' : '✕ Failed'
      }
      if (isDraw) {
        return isTr ? '🤝 Berabere' : '🤝 Draw'
      }
    }
    if (matchWinner) {
      return matchWinner === player1Name
        ? (isTr ? '🏆 Maçı Kazandı' : '🏆 Match Winner')
        : (isTr ? 'Maç Bitti' : 'Match Ended')
    }
    if (effectiveWinner) {
      return effectiveWinner === p1Symbol
        ? (isTr ? '🎉 Turu Kazandı' : '🎉 Round Winner')
        : (isTr ? 'Tur Bitti' : 'Round Ended')
    }
    if (isDraw) {
      return isTr ? '🤝 Berabere' : '🤝 Draw'
    }
    return undefined
  }, [isGameOver, isMissionMode, effectiveWinner, humanSymbol, matchWinner, player1Name, aiSymbol, player2Name, isDraw, isTr, p1Symbol])

  const p2GameOverStatus = useMemo(() => {
    if (!isGameOver) return undefined
    if (isMissionMode) {
      if (effectiveWinner === aiSymbol || matchWinner === player2Name) {
        return isTr ? '🤖 Bot Kazandı' : '🤖 Bot Won'
      }
      if (effectiveWinner === humanSymbol || matchWinner === player1Name) {
        return isTr ? 'Maç Bitti' : 'Match Ended'
      }
      if (isDraw) {
        return isTr ? '🤝 Berabere' : '🤝 Draw'
      }
    }
    if (matchWinner) {
      return matchWinner === player2Name
        ? (isTr ? '🏆 Maçı Kazandı' : '🏆 Match Winner')
        : (isTr ? 'Maç Bitti' : 'Match Ended')
    }
    if (effectiveWinner) {
      return effectiveWinner === p2Symbol
        ? (isTr ? '🎉 Turu Kazandı' : '🎉 Round Winner')
        : (isTr ? 'Tur Bitti' : 'Round Ended')
    }
    if (isDraw) {
      return isTr ? '🤝 Berabere' : '🤝 Draw'
    }
    return undefined
  }, [isGameOver, isMissionMode, effectiveWinner, aiSymbol, matchWinner, player2Name, humanSymbol, player1Name, isDraw, isTr, p2Symbol])

  // ── Quick Emote Callbacks ──────────────────────────────────────────────────
  const handleSendEmote = useCallback((emoteId) => {
    const newEmote = {
      id: Date.now() + Math.random(),
      emoteId,
      senderSymbol: humanSymbol,
      position: isP1X ? 'left' : 'right',
    }
    setFloatingEmotes(prev => [...prev, newEmote])
    playSound('emote')
  }, [humanSymbol, isP1X])

  const handleEmoteComplete = useCallback((emoteInstanceId) => {
    setFloatingEmotes(prev => prev.filter(e => e.id !== emoteInstanceId))
  }, [])

  const triggerBotEmote = useCallback((context) => {
    if (opponentType !== 'ai') return
    const chances = { bot_won: 0.30, human_won: 0.25, draw: 0.20, random_move: 0.05 }
    if (Math.random() > (chances[context] || 0.05)) return

    const emoteMap = {
      bot_won: ['gg', 'wellplayed'],
      human_won: ['noway', 'nice'],
      draw: ['wellplayed'],
      random_move: ['gg', 'nice', 'wellplayed', 'noway', 'hurry', 'sleep'],
    }
    const pool = emoteMap[context] || emoteMap.random_move
    const emoteId = pool[Math.floor(Math.random() * pool.length)]

    safeSetTimeout(() => {
      setFloatingEmotes(prev => [...prev, {
        id: Date.now() + Math.random(),
        emoteId,
        senderSymbol: aiSymbol,
        position: isP1X ? 'right' : 'left',
      }])
      playSound('emote')
    }, 800 + Math.random() * 1700)
  }, [opponentType, aiSymbol, isP1X, safeSetTimeout])

    const finishRound = useCallback(
    (nextSquares, nextBoostedSquares = boostedSquares) => {
      const nextWinningLine = getWinningLine(nextSquares, boardSize, winLength)

      if (nextWinningLine) {
        const nextWinner = nextSquares[nextWinningLine[0]]
        const nextRoundScore = calculateRoundScore(
          nextWinningLine,
          multipliers,
          multipliersEnabled,
          nextBoostedSquares
        )

        // Yan Yana modda bu turda kazanan sembol (X veya O) hangi oyuncuya aitse onun puanına ekle
        const winningPlayerKey = (nextWinner === 'X' ? isP1X : !isP1X) ? 'p1' : 'p2'

        setScores((currentScores) => ({
          ...currentScores,
          [nextWinner]: (currentScores[nextWinner] ?? 0) + nextRoundScore,
          [winningPlayerKey]:
            (currentScores[winningPlayerKey] ??
              (winningPlayerKey === 'p1' ? (currentScores.X ?? 0) : (currentScores.O ?? 0))) +
            nextRoundScore,
        }))

        const mission = gameConfig?.campaignLevel ?? gameConfig?.dailyChallenge
        if (mission && nextWinner === humanSymbol && missionCompletionRef.current !== mission.id) {
          const moves = missionTotalTurnsRef.current
          const initialHumanPowers = missionInitialPowersRef.current?.[humanSymbol] ?? {}
          const currentHumanPowers = playerPowers[humanSymbol] ?? {}
          const usedPowerIds = Object.keys(initialHumanPowers).filter(
            (powerId) => (currentHumanPowers[powerId] ?? 0) < (initialHumanPowers[powerId] ?? 0)
          )
          let missionRoundScore = nextRoundScore
          if (mission.stars?.two?.condition === 'score_above' || mission.stars?.three?.condition === 'score_above') {
            const has3x = nextWinningLine.some((idx) => (multipliers?.[idx] ?? 1) >= 3 || nextBoostedSquares.includes(idx))
            const has2x = nextWinningLine.some((idx) => (multipliers?.[idx] ?? 1) >= 2)
            const target3 = mission.stars?.three?.value ?? 200
            const target2 = mission.stars?.two?.value ?? 100

            if (has3x) {
              missionRoundScore = target3
            } else if (has2x) {
              missionRoundScore = target2
            } else {
              missionRoundScore = Math.floor(target2 / 2)
            }
          }

          const constraintResult = evaluateMissionConstraints(mission, {
            moves,
            roundScore: missionRoundScore,
            usedPowerIds,
            winningLine: nextWinningLine,
            multipliers,
            boostedSquares: nextBoostedSquares,
          })
          const missionFailed = !constraintResult.success
          missionFailureRef.current = constraintResult.failures[0] || null

          if (gameConfig.campaignLevel) {
            const stars = evaluateMissionStars(mission, {
              moves,
              roundScore: missionRoundScore,
              usedPowerIds,
            })
            setMissionResult({
              id: mission.id,
              completed: !missionFailed,
              stars: !missionFailed ? stars : 0,
              failure: missionFailureRef.current,
            })
            if (!missionFailed) {
              const saved = sanitizeCampaignProgress(safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} }))
              const previous = saved.completedLevels?.[mission.id]?.stars ?? 0
              saved.completedLevels = {
                ...(saved.completedLevels ?? {}),
                [mission.id]: { stars: Math.max(previous, stars), completedAt: Date.now() },
              }
              safeSetItem(STORAGE_KEYS.CAMPAIGN, saved)

              // Sync progression.js
              try {
                const prog = loadProgress()
                prog.campaignStars = { ...(prog.campaignStars || {}), [mission.id]: Math.max(previous, stars) }
                saveProgress(prog)
              } catch (e) {
                console.error('Failed to sync progression campaign stars', e)
              }

              // Unlock skin reward if applicable
              if (mission.reward?.type === 'skin') {
                unlockSkinReward(mission.reward.value)
              }

              // Check and unlock campaign achievements
              const completedCount = Object.keys(saved.completedLevels).length
              const threeStarCount = Object.values(saved.completedLevels).filter((lvl) => lvl.stars === 3).length
              if (completedCount >= 5) unlockAchievement('campaign_5')
              if (completedCount >= 15) unlockAchievement('campaign_15')
              if (completedCount >= 30) unlockAchievement('campaign_30')
              if (threeStarCount >= 10) unlockAchievement('all_stars')

              // Anti-exploit: Award full mission XP on first win or star upgrade only
              const awardedXP = previous === 0
                ? 25 + (stars === 3 ? 15 : 0)
                : (previous < 3 && stars === 3 ? 15 : 2) // Standard minimal match reward on replay (prevents infinite farm exploit)
              if (awardedXP > 0) {
                addXP(awardedXP, 'campaign')
              }
              triggerHappytime()
              missionCompletionRef.current = mission.id
            }
          } else {
            setMissionResult({
              id: mission.id,
              completed: !missionFailed,
              stars: !missionFailed ? 1 : 0,
              failure: missionFailureRef.current,
            })
            const today = mission.date
            try {
              const daily = sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, { streak: 0, history: {} }))
              const alreadyCompleted = Boolean(daily.history?.[today]?.completed || daily.lastCompleted === today)
              const isPractice = Boolean(mission.isPractice || alreadyCompleted)
              if (!isPractice && !missionFailed) {
                const yesterday = new Date(`${today}T00:00:00`)
                yesterday.setDate(yesterday.getDate() - 1)
                const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
                daily.streak = daily.history?.[yesterdayKey]?.completed ? (daily.streak ?? 0) + 1 : 1
                daily.lastCompleted = today
                daily.history = {
                  ...(daily.history ?? {}),
                  [today]: { completed: true, completedAt: Date.now() },
                }
                safeSetItem(STORAGE_KEYS.DAILY, daily)
                addXP(mission.reward?.value ?? 500, 'daily_challenge')
                triggerHappytime()
                missionCompletionRef.current = mission.id
              }
              if (alreadyCompleted || isPractice) {
                missionCompletionRef.current = mission.id
              }
            } catch (storageErr) {
              console.error('Failed to update daily challenge storage', storageErr)
              missionCompletionRef.current = mission.id
            }
          }
          if (missionFailed) {
            const failMsg = missionFailureRef.current
              ? (isTr ? missionFailureRef.current.messageTr : missionFailureRef.current.messageEn)
              : (isTr ? 'Görev koşulu tamamlanmadı. Bu galibiyet görevi bitirmedi.' : 'Mission condition failed. This win does not complete the challenge.')
            setActionError(failMsg)
          }
        }
        let isStreakVictory = false
        if (opponentType === 'ai' && (gameMode === 'classic' || gameMode === 'arena')) {
          setHumanWinStreak((currentStreak) => {
            if (nextWinner === humanSymbol) {
              // Ani zorluk sıçramalarını (whiplash / rubber-banding) engelle:
              // Oyuncu yenilgi serisindeyken (-2, -3) tek galibiyetle anında +1 şampiyon seviyesine fırlatma.
              // Kademeli olarak nötr seviyeye (0) getirerek maç dengesini ve akıcılığını koru.
              if (currentStreak < -1) return -1
              if (currentStreak === -1) return 0
              const newStreak = Math.min(currentStreak + 1, 3)
              // Trigger CrazyGames confetti on any human win
              triggerHappytime()
              if (newStreak >= 3) {
                isStreakVictory = true
              }
              return newStreak
            }

            if (nextWinner === aiSymbol) {
              // Oyuncu galibiyet serisindeyken 1 kez yenildiğinde ani sert düşüşü engelle
              if (currentStreak > 1) return 1
              if (currentStreak === 1) return 0
              return Math.max(currentStreak - 1, -3)
            }

            return currentStreak
          })
          setConsecutiveDraws(0)
          if (nextWinner === aiSymbol) {
            triggerBotEmote('bot_won')
          } else if (nextWinner === humanSymbol) {
            triggerBotEmote('human_won')
          }
        }
        setResultMessage(getRandomMessage(winnerMessages, language))
        setLoserMessage(getRandomMessage(loserMessages, language))
        playSound(isStreakVictory ? 'streak' : 'win')
        gameplayStop()
        return
      }

      if (isBoardFull(nextSquares, blockedSquares)) {
        if (opponentType === 'ai' && (gameMode === 'classic' || gameMode === 'arena')) {
          setConsecutiveDraws((prev) => prev + 1)
          triggerBotEmote('draw')
        }
        setResultMessage(getRandomMessage(drawMessages, language))
        setLoserMessage(null)
        playSound('draw')
        gameplayStop()
      }
    },
    [boardSize, winLength, multipliers, multipliersEnabled, boostedSquares, blockedSquares, opponentType, gameMode, isP1X, humanSymbol, aiSymbol, language, triggerBotEmote, gameConfig, playerPowers, isTr]
  )

  const handleTimeOut = useCallback(
    (timedOutPlayer) => {
      if (
        winner ||
        matchWinner ||
        isDraw ||
        timeoutWinner ||
        resultMessage ||
        isRewarding ||
        isRewardedPowerPickerOpen
      ) {
        return
      }

      setConsecutiveDraws(0)
      setMissionResult(null)
      setShowSetupReturnConfirm(false)
      setShowScoreResetConfirm(false)
      turnDeadlineRef.current = null
      pausedRemainingMsRef.current = null

      const winningSymbol = timedOutPlayer === 'X' ? 'O' : 'X'
      const timeoutScore = gameMode === 'arena' ? 5 : 1
      const winningPlayerKey = (winningSymbol === 'X' ? isP1X : !isP1X) ? 'p1' : 'p2'
      const timedOutPlayerName = timedOutPlayer === 'X' ? xPlayerName : oPlayerName
      const winnerName = winningSymbol === 'X' ? xPlayerName : oPlayerName

      setTimeoutWinner(winningSymbol)

      setScores((currentScores) => ({
        ...currentScores,
        [winningSymbol]: (currentScores[winningSymbol] ?? 0) + timeoutScore,
        [winningPlayerKey]:
          (currentScores[winningPlayerKey] ??
            (winningPlayerKey === 'p1' ? (currentScores.X ?? 0) : (currentScores.O ?? 0))) +
          timeoutScore,
      }))

      if (opponentType === 'ai') {
        if (winningSymbol === aiSymbol) {
          triggerBotEmote('bot_won')
        } else if (winningSymbol === humanSymbol) {
          triggerBotEmote('human_won')
        }
      }

      const timeoutTitle = t('events.timeoutNotification', { player: timedOutPlayerName }) ||
        (isTr ? `${timedOutPlayerName} Süresi Bitti!` : `${timedOutPlayerName}'s time ran out!`)
      const timeoutSub = t('events.timeoutWinnerBanner', { winner: winnerName }) ||
        (isTr ? `Turu ${winnerName} kazandı.` : `Round won by ${winnerName}.`)

      setResultMessage(['⏰', timeoutTitle, timeoutSub, { type: 'timeout', timedOutPlayerName, winnerName }])
      setLoserMessage(null)
      playSound('win')
      gameplayStop()
    },
    [
      winner,
      matchWinner,
      isDraw,
      timeoutWinner,
      resultMessage,
      gameMode,
      isP1X,
      xPlayerName,
      oPlayerName,
      opponentType,
      aiSymbol,
      humanSymbol,
      triggerBotEmote,
      t,
      isTr,
      isRewarding,
      isRewardedPowerPickerOpen,
    ]
  )

  // Turn timer countdown effect (Mutlak zaman damgası ile sayfa yenileme hilesi engellendi)
  useEffect(() => {
    if (
      turnTimeLimit <= 0 ||
      effectiveWinner ||
      matchWinner ||
      isDraw ||
      resultMessage
    ) {
      turnDeadlineRef.current = null
      pausedRemainingMsRef.current = null
      return
    }

    const isTimerPaused = Boolean(isRewarding || isRewardedPowerPickerOpen)

    if (isTimerPaused) {
      // Reklam izlenirken veya hediye kutusu seçimi açıkken süre durdurulur ve kalan süre korunur
      if (pausedRemainingMsRef.current === null && turnDeadlineRef.current) {
        pausedRemainingMsRef.current = Math.max(0, turnDeadlineRef.current - Date.now())
      }
      return
    }

    const movesCount = squares.filter(Boolean).length
    const currentTurnKey = `${roundNumber}-${currentPlayer}-${movesCount}`

    if (currentTurnKey !== lastTurnKeyRef.current) {
      lastTurnKeyRef.current = currentTurnKey
      botHurrySentRef.current = false
      pausedRemainingMsRef.current = null

      if (isSessionRestoredRef.current) {
        // Yalnızca localStorage'dan oturum ilk yüklendiğinde mevcut kalan süreyi koru
        isSessionRestoredRef.current = false
        if (turnDeadlineRef.current && turnDeadlineRef.current <= Date.now()) {
          handleTimeOut(currentPlayer)
          return
        }
        if (!turnDeadlineRef.current || turnDeadlineRef.current <= Date.now()) {
          turnDeadlineRef.current = Date.now() + turnTimeLimit * 1000
        }
      } else {
        // Her oyuncunun her hamlede kendi bağımsız süresi sıfırlanır
        turnDeadlineRef.current = Date.now() + turnTimeLimit * 1000
      }
    }

    // Reklam veya hediye kutusu kapandığında (unpaused), durdurulmuş kalan süreyi ileriye taşıyarak devam ettir
    if (pausedRemainingMsRef.current !== null) {
      const restoredRemaining = Math.max(
        pausedRemainingMsRef.current,
        Math.min(3000, turnTimeLimit * 1000)
      )
      turnDeadlineRef.current = Date.now() + restoredRemaining
      pausedRemainingMsRef.current = null
    }

    if (!turnDeadlineRef.current) {
      turnDeadlineRef.current = Date.now() + turnTimeLimit * 1000
    }

    const activeDeadline = turnDeadlineRef.current
    const initialRemaining = Math.max(0, (activeDeadline - Date.now()) / 1000)

    if (initialRemaining <= 0) {
      handleTimeOut(currentPlayer)
      return
    }

    lastTickSecondRef.current = Math.ceil(initialRemaining)

    // Asynchronously update initial turnTimeLeft to avoid setState directly in effect
    const initialTimerId = setTimeout(() => {
      setTurnTimeLeft(initialRemaining)
    }, 0)

    const interval = setInterval(() => {
      const remainingSec = (activeDeadline - Date.now()) / 1000
      const clampedRemaining = Math.max(0, Math.ceil(remainingSec))
      const currentWhole = clampedRemaining

      if (clampedRemaining <= 5 && clampedRemaining > 0 && currentWhole !== lastTickSecondRef.current) {
        lastTickSecondRef.current = currentWhole
        playSound('click')
      }

      // Bot "Acele et!" tepkisi: İnsan 7+ saniye düşünürse %20 ihtimalle bot emote gönderir
      if (
        opponentType === 'ai' &&
        currentPlayer === humanSymbol &&
        !botHurrySentRef.current &&
        turnTimeLimit >= 10 &&
        clampedRemaining <= turnTimeLimit - 7 &&
        clampedRemaining > 3
      ) {
        botHurrySentRef.current = true
        if (Math.random() < 0.20) {
          const timeoutEmoteId = Math.random() < 0.5 ? 'hurry' : 'sleep'
          setFloatingEmotes((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              emoteId: timeoutEmoteId,
              senderSymbol: aiSymbol,
              position: isP1X ? 'right' : 'left',
            },
          ])
          playSound('emote')
        }
      }

      setTurnTimeLeft(clampedRemaining)

      if (clampedRemaining <= 0) {
        clearInterval(interval)
        handleTimeOut(currentPlayer)
      }
    }, 1000)

    return () => {
      clearTimeout(initialTimerId)
      clearInterval(interval)
    }
  }, [
    turnTimeLimit,
    roundNumber,
    currentPlayer,
    squares,
    effectiveWinner,
    matchWinner,
    isDraw,
    resultMessage,
    opponentType,
    aiSymbol,
    humanSymbol,
    isP1X,
    handleTimeOut,
    isRewarding,
    isRewardedPowerPickerOpen,
  ])

  function spendPlayerPower(player, powerId) {
    setPlayerPowers((currentPowers) => {
      const currentVal = currentPowers[player]?.[powerId] ?? 0
      if (currentVal <= 0) return currentPowers
      return {
        ...currentPowers,
        [player]: {
          ...currentPowers[player],
          [powerId]: Math.max(0, currentVal - 1),
        },
      }
    })
  }

  function resetGame(nextSettings = arenaSettings, nextGameMode = gameMode) {
    clearAllTimeouts()
    setTimeoutWinner(null)
    turnDeadlineRef.current = null
    pausedRemainingMsRef.current = null
    lastTurnKeyRef.current = ''
    missionTotalTurnsRef.current = 0
    setCurrentMoves(0)
    setTurnTimeLeft(turnTimeLimit)
    const shouldUseMultipliers =
      nextGameMode === 'arena' && nextSettings.multipliersEnabled

    setSquares(createEmptyBoard(boardSize))
    setXIsNext(true)
    setMultipliers(shouldUseMultipliers ? createBoardMultipliers(boardSize) : {})
    setActivePower(null)
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setTraps([])
    setStolenSquares([])
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
    setPlayerPowers((currentPowers) => {
      const mission = gameConfig?.campaignLevel ?? gameConfig?.dailyChallenge
      if (mission) {
        return createMissionPowers(gameConfig, nextGameMode, opponentType)
      }
      const nextPowers = createInitialPlayerPowers({ gameMode: nextGameMode, opponentType })
      rewardedPowerIds.forEach((powerId) => {
        const retainedRewardCount = currentPowers[humanSymbol]?.[powerId] ?? currentPowers.X?.[powerId] ?? 0
        if (retainedRewardCount > 0) {
          nextPowers[humanSymbol][powerId] = retainedRewardCount
        }
      })

      return nextPowers
    })
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setHasUsedPowerThisTurn(false)
  }

  function handleRewardedPowerClaim(powerId) {
    if (!isRewardedPowerAvailable || rewardedPowerClaimed || isRewarding) {
      return
    }

    // Reklam izlenirken oyuncunun süresinden gitmemesi için kalan süreyi dondur
    if (turnDeadlineRef.current) {
      pausedRemainingMsRef.current = Math.max(0, turnDeadlineRef.current - Date.now())
    }

    setIsRewarding(true)
    setIsRewardedPowerPickerOpen(false)
    setRewardedPowerMessage(isTr ? 'Reklam izleniyor...' : 'Loading reward video...')
    gameplayStop()

    requestRewardedAd({
      onAdStarted: () => {
        setAdMuted(true)
      },
      onAdFinished: () => {
        setAdMuted(false)
        setPlayerPowers((currentPowers) => ({
          ...currentPowers,
          [humanSymbol]: {
            ...currentPowers[humanSymbol],
            [powerId]: (currentPowers[humanSymbol]?.[powerId] ?? 0) + 1,
          },
        }))
        setRewardedPowerClaimed(true)
        setIsRewarding(false)
        setRewardedPowerMessage(
          isTr
            ? `${powerId === 'freeze' ? 'Freeze' : 'Vampir'} gücü eklendi.`
            : `${powerId === 'freeze' ? 'Freeze' : 'Vampire'} power added.`
        )
        playSound('power')
        gameplayStart()
      },
      onAdError: () => {
        setAdMuted(false)
        setIsRewarding(false)
        setRewardedPowerMessage('')
        gameplayStart()
      },
    })
  }

  function handleSelectHumanPower(powerId) {
    if (winner || matchWinner || isDraw || hasUsedPowerThisTurn || isAiTurn || isRewarding) {
      return
    }

    setActionError('')

    if (powerId === 'vampire') {
      if (vampireSources.length === 0 || vampireTargets.length === 0) {
        setActionError(
          isTr
            ? 'Vampir için uygun çarpanlı rakip taşı ve çarpansız kendi taşın gerekli.'
            : 'Vampire requires an opponent mark with a multiplier and an unboosted mark of your own.'
        )
        setActivePower(null)
        return
      }
      handleVampirePower()
      return
    }

    setActivePower((current) => (current === powerId ? null : powerId))
  }

  function revealBoostedSquare(index) {
    if (!boostedSquares.includes(index) || visibleBoostedSquares.includes(index)) {
      return
    }

    setVisibleBoostedSquares((currentVisibleBoostedSquares) => [
      ...currentVisibleBoostedSquares,
      index,
    ])
  }

  function handleArenaSettingsChange(nextSettings) {
    const settingsChanged =
      nextSettings.powersEnabled !== arenaSettings.powersEnabled ||
      nextSettings.multipliersEnabled !== arenaSettings.multipliersEnabled ||
      nextSettings.boostMode !== arenaSettings.boostMode

    if (!settingsChanged) {
      return
    }

    if (hasGameStarted) {
      setPendingArenaSettings(nextSettings)
      return
    }

    setArenaSettings(nextSettings)
    resetGame(nextSettings)
  }

  function handleConfirmArenaSettingsChange() {
    if (!pendingArenaSettings) {
      return
    }

    setArenaSettings(pendingArenaSettings)
    resetGame(pendingArenaSettings)
    setPendingArenaSettings(null)
  }

  function handleCancelArenaSettingsChange() {
    setPendingArenaSettings(null)
  }

  function handleBombPower(index) {
    if (hasUsedPowerThisTurn) {
      return
    }

    const targetValue = squares[index]

    if (!targetValue || shieldedSquares.includes(index)) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = null

    setSquares(nextSquares)
    setShieldedSquares((currentShieldedSquares) =>
      currentShieldedSquares.filter((squareIndex) => squareIndex !== index)
    )
    setBoostedSquares((currentBoostedSquares) =>
      currentBoostedSquares.filter((squareIndex) => squareIndex !== index)
    )
    setVisibleBoostedSquares((currentVisibleBoostedSquares) =>
      currentVisibleBoostedSquares.filter((squareIndex) => squareIndex !== index)
    )
    setStolenSquares((currentStolen) =>
      currentStolen.filter((squareIndex) => squareIndex !== index)
    )
    setLockedSquares([index])
    if (frozenSquares.length > 0 && frozenBy !== currentPlayer) {
      setFrozenSquares([])
      setFrozenBy(null)
    }
    spendPlayerPower(currentPlayer, 'bomb')
    playSound('bomb')
    setActivePower(null)
    setBombEvent({ index, id: Date.now() })
    safeSetTimeout(() => {
      setBombEvent(null)
    }, 650)
    setXIsNext(!xIsNext)
  }

  function handleShieldPower(index) {
    if (hasUsedPowerThisTurn) {
      return
    }

    const targetValue = squares[index]

    if (
      targetValue !== currentPlayer ||
      shieldedSquares.includes(index) ||
      lockedSquares.includes(index)
    ) {
      return
    }

    setShieldedSquares((currentShieldedSquares) => [
      ...currentShieldedSquares,
      index,
    ])

    spendPlayerPower(currentPlayer, 'shield')
    playSound('shield')
    setLockedSquares([])
    setActivePower(null)
    setHasUsedPowerThisTurn(true)
  }
  function handleTrapPower(index) {
    if (hasUsedPowerThisTurn) {
      return
    }

    if (
      squares[index] ||
      lockedSquares.includes(index) ||
      traps.some((trap) => trap.index === index && trap.owner === currentPlayer)
    ) {
      return
    }

    setTraps((currentTraps) => [
      ...currentTraps,
      {
        index,
        owner: currentPlayer,
      },
    ])

    spendPlayerPower(currentPlayer, 'trap')
    playSound('blackhole')
    setLockedSquares([])
    if (frozenSquares.length > 0 && frozenBy !== currentPlayer) {
      setFrozenSquares([])
      setFrozenBy(null)
    }
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleFreezePower(index) {
    if (hasUsedPowerThisTurn) {
      return
    }

    if (squares[index] || lockedSquares.includes(index) || frozenSquares.includes(index)) {
      return
    }

    setFrozenSquares([index])
    setFrozenBy(currentPlayer)
    spendPlayerPower(currentPlayer, 'freeze')
    playSound('freezeActivate')
    setActivePower(null)
    setHasUsedPowerThisTurn(true)
  }

  function handleVampirePower() {
    if (hasUsedPowerThisTurn || (playerPowers[currentPlayer]?.vampire ?? 0) <= 0) {
      setActivePower(null)
      return
    }

    const sourceIndex = vampireSources[0]
    const targetIndex = vampireTargets[0]

    if (sourceIndex === undefined || targetIndex === undefined) {
      setActionError(
        isTr
          ? 'Vampir için uygun çarpanlı rakip taşı ve çarpansız kendi taşın gerekli.'
          : 'Vampire requires an opponent mark with a multiplier and an unboosted mark of your own.'
      )
      setActivePower(null)
      return
    }

    const transferredMultiplier = multipliers[sourceIndex]
    spendPlayerPower(currentPlayer, 'vampire')
    playSound('vampireDrain')
    setActivePower(null)
    setHasUsedPowerThisTurn(true)
    setRewardedPowerMessage(
      isTr
        ? `Vampir ${transferredMultiplier}x çarpanı çekiyor...`
        : `Vampire draining ${transferredMultiplier}x multiplier...`
    )

    setVampireTransferEvent({
      sourceIndex,
      targetIndex,
      multiplier: transferredMultiplier,
      id: Date.now(),
    })

    safeSetTimeout(() => {
      setMultipliers((currentMultipliers) => {
        const nextMultipliers = { ...currentMultipliers, [targetIndex]: transferredMultiplier }
        delete nextMultipliers[sourceIndex]
        return nextMultipliers
      })
      setStolenSquares((currentStolen) => [
        ...currentStolen.filter((squareIndex) => squareIndex !== sourceIndex),
        targetIndex,
      ])
      setRewardedPowerMessage(`Vampir ${transferredMultiplier}x çarpanı kendi taşına aktardı!`)
      safeSetTimeout(() => {
        setVampireTransferEvent(null)
      }, 350)
    }, 650)
  }

  function handleBoostPower(index, isVisible = true) {
    if ((playerPowers[currentPlayer]?.boost ?? 0) <= 0 || squares[index] || boostedSquares.includes(index) || lockedSquares.includes(index)) {
      return
    }

    setBoostedSquares((currentBoostedSquares) => [
      ...currentBoostedSquares,
      index,
    ])
    if (isVisible) {
      setVisibleBoostedSquares((currentVisibleBoostedSquares) => [
        ...currentVisibleBoostedSquares,
        index,
      ])
    }
    spendPlayerPower(currentPlayer, 'boost')
    playSound('power')
    setLockedSquares([])
    setActivePower(null)
  }

  function handleRandomBoostPower() {
    if (winner || matchWinner || isDraw || !hasBoostTarget || (playerPowers[currentPlayer]?.boost ?? 0) <= 0) {
      return
    }

    const targetIndex = boostTargets[Math.floor(Math.random() * boostTargets.length)]
    handleBoostPower(targetIndex, false)
  }

  const handleSquareClick = useCallback((index) => {
    registerUserGesture()
    if (winner || matchWinner || isDraw || isAiTurn || isMoveProcessingRef.current || isRewarding) {
      return
    }

    if (powersEnabled && activePower) {
      setActionError('')

      if ((playerPowers[currentPlayer]?.[activePower] ?? 0) <= 0) {
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

      if (activePower === 'bomb') {
        handleBombPower(index)
        return
      }

      if (!hasUsedPowerThisTurn && activePower === 'shield') {
        handleShieldPower(index)
        return
      }

      if (!hasUsedPowerThisTurn && activePower === 'trap') {
        handleTrapPower(index)
        return
      }

      if (!hasUsedPowerThisTurn && activePower === 'freeze') {
        handleFreezePower(index)
        return
      }

      if (activePower === 'boost') {
        handleBoostPower(index)
        return
      }

      if (!hasUsedPowerThisTurn && activePower === 'vampire') {
        handleVampirePower()
        return
      }

      return
    }

    setActionError('')

    if (squares[index] || effectiveLockedSquares.includes(index) || frozenSquares.includes(index)) {
      return
    }

    // Synchronous atomic lock: prevent rapid double-clicks and macro auto-clicker exploits
    isMoveProcessingRef.current = true
    safeSetTimeout(() => {
      isMoveProcessingRef.current = false
    }, 100)

    const triggeredTrap = traps.find(
      (trap) => trap.index === index && trap.owner !== currentPlayer
    )

    if (triggeredTrap) {
      setBlackHoleEvent({
        index,
        player: currentPlayer,
        id: Date.now(),
      })
      setTraps((currentTraps) =>
        currentTraps.filter((trap) => trap.index !== index)
      )
      setLockedSquares([])
      if (frozenSquares.length > 0) {
        if (frozenBy === currentPlayer) {
          setFrozenBy(null)
        } else {
          setFrozenSquares([])
          setFrozenBy(null)
        }
      }
      setActivePower(null)
      setXIsNext(!xIsNext)
      playSound('blackhole')
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = currentPlayer

    missionTotalTurnsRef.current += 1
    setCurrentMoves(missionTotalTurnsRef.current)

    setSquares(nextSquares)
    revealBoostedSquare(index)
    playSound('move')
    finishRound(nextSquares)
    setLockedSquares([])
    if (frozenSquares.length > 0) {
      if (frozenBy === currentPlayer) {
        setFrozenBy(null)
      } else {
        setFrozenSquares([])
        setFrozenBy(null)
      }
    }
    setHasUsedPowerThisTurn(false)
    setXIsNext(!xIsNext)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    winner,
    matchWinner,
    isDraw,
    powersEnabled,
    activePower,
    playerPowers,
    currentPlayer,
    activePowerTargets,
    hasUsedPowerThisTurn,
    squares,
    lockedSquares,
    frozenSquares,
    frozenBy,
    traps,
    xIsNext,
    finishRound,
    revealBoostedSquare,
    isRewarding,
  ])

  const restoreLocalGameSession = useCallback((session) => {
    setOnlineGame(null)
    setGameConfig(session.gameConfig)
    setGameMode(session.gameMode)
    setScores(session.scores)
    setArenaSettings(initialArenaSettings) // Her zaman default: güçler + çarpanlar açık
    setPendingArenaSettings(null)
    setMultipliers(session.multipliers ?? {})
    setPlayerPowers(session.playerPowers)
    setActivePower(session.activePower ?? null)
    setShieldedSquares(session.shieldedSquares)
    setLockedSquares(session.lockedSquares)
    setFrozenSquares(session.frozenSquares ?? [])
    setFrozenBy(session.frozenBy ?? null)
    setStolenSquares(session.stolenSquares ?? [])
    setBoostedSquares(session.boostedSquares)
    setVisibleBoostedSquares(session.visibleBoostedSquares)
    setTraps(session.traps)
    setBlackHoleEvent(session.blackHoleEvent ?? null)
    setResultMessage(session.resultMessage ?? null)
    setLoserMessage(session.loserMessage ?? null)
    setSquares(session.squares)
    setXIsNext(session.xIsNext)
    setRoundNumber(session.roundNumber)
    setHumanWinStreak(session.humanWinStreak ?? 0)
    setConsecutiveDraws(session.consecutiveDraws ?? 0)
    setRewardedPowerClaimed(session.rewardedPowerClaimed ?? false)
    setIsRewarding(false)
    setRewardedPowerMessage(session.rewardedPowerMessage ?? '')
    setIsRewardedPowerPickerOpen(false)
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    turnDeadlineRef.current = session.turnDeadline ?? null
    isSessionRestoredRef.current = Boolean(session.turnDeadline)
    lastTurnKeyRef.current = ''
  }, [])

  useEffect(() => {
    let isMounted = true

    async function restoreInitialSession() {
      const hadOnlineSession = hasStoredOnlineSession()
      const onlineSession = readOnlineSession()

      if (hadOnlineSession && IS_ONLINE_ENABLED) {
        if (!onlineSession) {
          clearOnlineSession()
          if (isMounted) {
            setSetupRestoreMessage('')
            setIsSessionRestoreChecked(true)
          }
          return
        }

        try {
          const room = await requestRoomJson(`/api/rooms/${onlineSession.roomCode}`)

          if (!isMounted) {
            return
          }

          setGameConfig(null)
          setOnlineGame({
            roomCode: room.roomCode,
            playerId: onlineSession.playerId,
            playerSecret: onlineSession.playerSecret,
            symbol: onlineSession.symbol,
            playerName: onlineSession.playerName,
            room,
          })
          setSetupRestoreMessage('')
          setIsSessionRestoreChecked(true)
        } catch {
          clearOnlineSession()
          if (isMounted) {
            setSetupRestoreMessage('')
            setIsSessionRestoreChecked(true)
          }
        }
        return
      }

      const hadLocalSession = hasStoredLocalSession()
      const localSession = readLocalSession()

      if (hadLocalSession && !localSession) {
        if (isMounted) {
          setSetupRestoreMessage('Kayıtlı oyun yüklenemedi, yeni oyun başlatabilirsin.')
          setIsSessionRestoreChecked(true)
        }
        return
      }

      if (localSession) {
        if (isMounted) {
          // Bir turun veya maçın bittiği (kazanan, berabere veya sonuç ekranı) durumları asla geri yükleme;
          // kullanıcının eski konfeti / galibiyet ekranında takılı kalmasını engellemek için oturumu temizle.
          const isRoundCompleted =
            Boolean(localSession.matchWinner) ||
            Boolean(localSession.isMatchCompleted) ||
            Boolean(localSession.isRoundResultOpen) ||
            Boolean(localSession.resultMessage) ||
            (Array.isArray(localSession.squares) &&
              (Boolean(getWinningLine(localSession.squares, localSession.gameConfig?.boardSize || 3, localSession.gameConfig?.winLength || 3)) ||
                isBoardFull(localSession.squares, localSession.blockedSquares || [])))

          const isMission = Boolean(localSession.gameConfig?.campaignLevel || localSession.gameConfig?.dailyChallenge)

          if (isRoundCompleted || isMission) {
            clearLocalSession()
            setSetupRestoreMessage('')
          } else {
            restoreLocalGameSession(localSession)
            setSetupRestoreMessage('')
          }
        }
      }

      if (isMounted) {
        setIsSessionRestoreChecked(true)
      }
    }

    restoreInitialSession()

    return () => {
      isMounted = false
    }
  }, [restoreLocalGameSession])

  const aiWorkerRef = useRef(null)
  const latestAiHandlerRef = useRef({})

  // Singleton AI Worker Initialization (Mounted once for the component lifecycle)
  useEffect(() => {
    const worker = new Worker(
      new URL('./game/aiWorker.js', import.meta.url),
      { type: 'module' }
    )
    aiWorkerRef.current = worker

    worker.onmessage = (event) => {
      latestAiHandlerRef.current.onMessage?.(event.data)
    }

    worker.onerror = (error) => {
      latestAiHandlerRef.current.onError?.(error)
    }

    return () => {
      worker.terminate()
      aiWorkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const isAiSupportedMode = gameMode === 'classic' || gameMode === 'arena'
    const isAiTurnActive =
      gameConfig &&
      isAiSupportedMode &&
      opponentType === 'ai' &&
      currentPlayer === aiSymbol &&
      !effectiveWinner &&
      !matchWinner &&
      !isDraw

    if (!isAiTurnActive) {
      return
    }

    const spendAiPower = (powerId) => {
      setPlayerPowers((currentPowers) => ({
        ...currentPowers,
        [aiSymbol]: {
          ...currentPowers[aiSymbol],
          [powerId]: currentPowers[aiSymbol][powerId] - 1,
        },
      }))
    }

    let hasAiMoved = false
    let emergencyTimeoutId = null

    const placeAiStone = (index, nextBoostedSquares = boostedSquares) => {
      if (hasAiMoved) return
      if (squares[index] || effectiveLockedSquares.includes(index) || frozenSquares.includes(index)) {
        return
      }
      hasAiMoved = true
      if (emergencyTimeoutId) {
        clearSafeTimeout(emergencyTimeoutId)
      }

      const triggeredTrap = traps.find(
        (trap) => trap.index === index && trap.owner !== aiSymbol
      )

      if (triggeredTrap) {
        setBlackHoleEvent({
          index,
          player: aiSymbol,
          id: Date.now(),
        })
        setTraps((currentTraps) =>
          currentTraps.filter((trap) => trap.index !== index)
        )
        setLockedSquares([])
        if (frozenSquares.length > 0) {
          if (frozenBy === aiSymbol) {
            setFrozenBy(null)
          } else {
            setFrozenSquares([])
            setFrozenBy(null)
          }
        }
        setActivePower(null)
        setXIsNext(aiSymbol === 'X' ? false : true)
        playSound('blackhole')
        return
      }

      const nextSquares = squares.slice()
      nextSquares[index] = aiSymbol

      setSquares(nextSquares)
      if (
        nextBoostedSquares.includes(index) &&
        !visibleBoostedSquares.includes(index)
      ) {
        setVisibleBoostedSquares((currentVisibleBoostedSquares) => [
          ...currentVisibleBoostedSquares,
          index,
        ])
      }
      playSound('move')
      finishRound(nextSquares, nextBoostedSquares)
      if (!getWinningLine(nextSquares, boardSize, winLength) && !isBoardFull(nextSquares, blockedSquares)) {
        triggerBotEmote('random_move')
      }
      setLockedSquares([])
      if (frozenSquares.length > 0) {
        if (frozenBy === aiSymbol) {
          setFrozenBy(null)
        } else {
          setFrozenSquares([])
          setFrozenBy(null)
        }
      }
      setXIsNext(aiSymbol === 'X' ? false : true)
    }

    latestAiHandlerRef.current.onMessage = (data) => {
      const { type: msgType } = data

      if (msgType === 'ARENA_POWER_ACTION_RESULT') {
        const aiPowerAction = data.action

        if (aiPowerAction?.type === 'move') {
          placeAiStone(aiPowerAction.index)
          return
        }

        if (aiPowerAction?.type === 'bomb') {
          if (hasAiMoved) return
          hasAiMoved = true
          if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
          const nextSquares = squares.slice()
          nextSquares[aiPowerAction.index] = null

          setSquares(nextSquares)
          setShieldedSquares((currentShieldedSquares) =>
            currentShieldedSquares.filter((squareIndex) => squareIndex !== aiPowerAction.index)
          )
          setBoostedSquares((currentBoostedSquares) =>
            currentBoostedSquares.filter((squareIndex) => squareIndex !== aiPowerAction.index)
          )
          setVisibleBoostedSquares((currentVisibleBoostedSquares) =>
            currentVisibleBoostedSquares.filter((squareIndex) => squareIndex !== aiPowerAction.index)
          )
          setLockedSquares([aiPowerAction.index])
          if (frozenSquares.length > 0 && frozenBy !== aiSymbol) {
            setFrozenSquares([])
            setFrozenBy(null)
          }
          spendAiPower('bomb')
          playSound('bomb')
          setActivePower(null)
          setBombEvent({ index: aiPowerAction.index, id: Date.now() })
          safeSetTimeout(() => {
            setBombEvent(null)
          }, 650)
          setXIsNext(aiSymbol === 'X' ? false : true)
          return
        }

        if (aiPowerAction?.type === 'shield') {
          const nextShieldedSquares = [
            ...shieldedSquares,
            aiPowerAction.index,
          ]
          setShieldedSquares(nextShieldedSquares)
          spendAiPower('shield')
          playSound('shield')
          setLockedSquares([])
          setActivePower(null)

          // Arena search evaluates shield + placement as one turn.  Preserve its
          // planned follow-up instead of asking the lightweight classic chooser
          // for an unrelated move after the shield has been spent.
          const followUp = aiPowerAction.followUpMove
          if (followUp !== null && followUp !== undefined) {
            placeAiStone(followUp)
          } else {
            getAiPlayerModule().then(({ getAdaptiveAiMove }) => {
              const aiMove = getAdaptiveAiMove({
                squares,
                boardSize,
                winLength,
                humanWinStreak,
                roundNumber,
                consecutiveDraws,
                blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
                multipliers:
                  gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
                aiPlayer: aiSymbol,
                humanPlayer: humanSymbol,
                gameMode,
                difficultyOverride,
                aiPersonality,
              })
              if (aiMove !== null && aiMove !== undefined) {
                placeAiStone(aiMove)
              } else {
                hasAiMoved = true
                if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
                setXIsNext(aiSymbol === 'X' ? false : true)
              }
            }).catch(() => {
              if (hasAiMoved) return
              const emptySquares = squares
                .map((sq, idx) => (sq === null && !effectiveLockedSquares.includes(idx) && !frozenSquares.includes(idx) ? idx : null))
                .filter((idx) => idx !== null)
              if (emptySquares.length > 0) {
                placeAiStone(emptySquares[Math.floor(Math.random() * emptySquares.length)])
              } else {
                hasAiMoved = true
                if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
                setXIsNext(aiSymbol === 'X' ? false : true)
              }
            })
          }
          return
        }

        if (aiPowerAction?.type === 'trap') {
          if (hasAiMoved) return
          hasAiMoved = true
          if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
          setTraps((currentTraps) => [
            ...currentTraps,
            {
              index: aiPowerAction.index,
              owner: aiSymbol,
            },
          ])
          spendAiPower('trap')
          playSound('blackhole')
          setLockedSquares([])
          if (frozenSquares.length > 0 && frozenBy !== aiSymbol) {
            setFrozenSquares([])
            setFrozenBy(null)
          }
          setActivePower(null)
          setXIsNext(aiSymbol === 'X' ? false : true)
          return
        }

        if (aiPowerAction?.type === 'boost') {
          const nextBoostedSquares = [...boostedSquares, aiPowerAction.index]
          setBoostedSquares(nextBoostedSquares)
          setVisibleBoostedSquares((currentVisibleBoostedSquares) => [
            ...currentVisibleBoostedSquares,
            aiPowerAction.index,
          ])
          spendAiPower('boost')
          playSound('power')
          setLockedSquares([])
          setActivePower(null)
          placeAiStone(aiPowerAction.index, nextBoostedSquares)
          return
        }

        if (aiPowerAction?.type === 'freeze') {
          setFrozenSquares([aiPowerAction.index])
          setFrozenBy(aiSymbol)
          spendAiPower('freeze')
          playSound('freezeActivate')
          setLockedSquares([])
          setActivePower(null)
          placeAiStone(aiPowerAction.moveIndex)
          return
        }

        if (aiPowerAction?.type === 'vampire') {
          const sourceIndex = aiPowerAction.index
          const transferredMultiplier = multipliers[sourceIndex]
          if (transferredMultiplier) {
            const targetIndex = aiPowerAction.moveIndex
            spendAiPower('vampire')
            playSound('vampireDrain')
            setActivePower(null)

            setVampireTransferEvent({
              sourceIndex,
              targetIndex,
              multiplier: transferredMultiplier,
              id: Date.now(),
            })

            safeSetTimeout(() => {
              setMultipliers((currentMultipliers) => {
                const nextMultipliers = { ...currentMultipliers, [targetIndex]: transferredMultiplier }
                delete nextMultipliers[sourceIndex]
                return nextMultipliers
              })
              setStolenSquares((currentStolen) => [
                ...currentStolen.filter((squareIndex) => squareIndex !== sourceIndex),
                targetIndex,
              ])
              safeSetTimeout(() => {
                setVampireTransferEvent(null)
              }, 350)
            }, 650)

            placeAiStone(targetIndex)
            return
          }
          // Vampire had no valid multiplier source — fall through to normal move
        }

        // Fallback: null action durumunda normal hamle iste
        aiWorkerRef.current?.postMessage({
          type: 'ADAPTIVE_MOVE',
          payload: {
            squares,
            boardSize,
            winLength,
            humanWinStreak,
            roundNumber,
            consecutiveDraws,
            blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
            multipliers:
              gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
            difficultyOverride,
            aiPersonality,
          },
        })
        return
      }

      if (msgType === 'ADAPTIVE_MOVE_RESULT') {
        const aiMove = data.move
        if (aiMove !== null && aiMove !== undefined) {
          placeAiStone(aiMove)
        } else {
          if (!getWinningLine(squares, boardSize, winLength)) {
            finishRound(squares)
          }
        }
        return
      }
    }

    latestAiHandlerRef.current.onError = () => {
      getAiPlayerModule().then(({ getAdaptiveAiMove, getArenaAiPowerAction }) => {
        try {
          if (gameMode === 'arena' && powersEnabled) {
            const aiPowerAction = getArenaAiPowerAction({
              squares, boardSize, winLength, humanWinStreak, roundNumber, consecutiveDraws,
              playerPowers: playerPowers[aiSymbol], humanPowers: playerPowers[humanSymbol],
              shieldedSquares, boostedSquares,
              blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
              aiTrapIndexes: traps.filter((trap) => trap.owner === aiSymbol).map((trap) => trap.index),
              multipliers,
              aiPlayer: aiSymbol,
              humanPlayer: humanSymbol,
              gameMode,
              difficultyOverride,
              aiPersonality,
            })
            if (aiPowerAction?.type === 'move') {
              placeAiStone(aiPowerAction.index)
              return
            }
            if (aiPowerAction?.type === 'boost') {
              const nextBoostedSquares = [...boostedSquares, aiPowerAction.index]
              setBoostedSquares(nextBoostedSquares)
              spendAiPower('boost')
              playSound('power')
              placeAiStone(aiPowerAction.index, nextBoostedSquares)
              return
            }
            if (aiPowerAction?.type === 'shield') {
              setShieldedSquares((current) => [...current, aiPowerAction.index])
              spendAiPower('shield')
              playSound('power')
              const aiMove = aiPowerAction.followUpMove ?? getAdaptiveAiMove({
                squares, boardSize, winLength, humanWinStreak, roundNumber, consecutiveDraws,
                blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
                multipliers: gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
                aiPlayer: aiSymbol,
                humanPlayer: humanSymbol,
                gameMode,
                difficultyOverride,
                aiPersonality,
              })
              if (aiMove !== null && aiMove !== undefined) placeAiStone(aiMove)
              return
            }
            if (aiPowerAction?.type === 'bomb') {
              if (hasAiMoved) return
              hasAiMoved = true
              if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
              const nextSquares = squares.slice()
              nextSquares[aiPowerAction.index] = null
              setSquares(nextSquares)
              setLockedSquares([aiPowerAction.index])
              spendAiPower('bomb')
              playSound('bomb')
              setXIsNext(aiSymbol === 'X' ? false : true)
              return
            }
            if (aiPowerAction?.type === 'trap') {
              if (hasAiMoved) return
              hasAiMoved = true
              if (emergencyTimeoutId) clearSafeTimeout(emergencyTimeoutId)
              setTraps((currentTraps) => [
                ...currentTraps, { index: aiPowerAction.index, owner: aiSymbol },
              ])
              spendAiPower('trap')
              playSound('blackhole')
              setXIsNext(aiSymbol === 'X' ? false : true)
              return
            }
            if (aiPowerAction?.type === 'freeze') {
              setFrozenSquares([aiPowerAction.index])
              setFrozenBy(aiSymbol)
              spendAiPower('freeze')
              playSound('power')
              placeAiStone(aiPowerAction.moveIndex)
              return
            }
            if (aiPowerAction?.type === 'vampire') {
              const sourceIndex = aiPowerAction.index
              if (multipliers[sourceIndex]) {
                spendAiPower('vampire')
                playSound('power')
                placeAiStone(aiPowerAction.moveIndex)
                return
              }
            }
          }
          const fallbackMove = getAdaptiveAiMove({
            squares, boardSize, winLength, humanWinStreak, roundNumber, consecutiveDraws,
            blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
            multipliers: gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
            difficultyOverride,
            aiPersonality,
          })
          if (fallbackMove !== null) placeAiStone(fallbackMove)
        } catch {
          if (hasAiMoved) return
          const emptySquares = squares
            .map((sq, idx) => (sq === null && !effectiveLockedSquares.includes(idx) && !frozenSquares.includes(idx) ? idx : null))
            .filter((idx) => idx !== null)
          if (emptySquares.length > 0) {
            placeAiStone(emptySquares[Math.floor(Math.random() * emptySquares.length)])
          }
        }
      }).catch(() => {
        if (hasAiMoved) return
        const emptySquares = squares
          .map((sq, idx) => (sq === null && !effectiveLockedSquares.includes(idx) && !frozenSquares.includes(idx) ? idx : null))
          .filter((idx) => idx !== null)
        if (emptySquares.length > 0) {
          placeAiStone(emptySquares[Math.floor(Math.random() * emptySquares.length)])
        }
      })
    }

    const postAiTask = () => {
      if (gameMode === 'arena' && powersEnabled) {
        aiWorkerRef.current?.postMessage({
          type: 'ARENA_POWER_ACTION',
          payload: {
            squares,
            boardSize,
            winLength,
            humanWinStreak,
            roundNumber,
            consecutiveDraws,
            playerPowers: playerPowers[aiSymbol],
            humanPowers: playerPowers[humanSymbol],
            shieldedSquares,
            boostedSquares,
            blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
            aiTrapIndexes: traps
              .filter((trap) => trap.owner === aiSymbol)
              .map((trap) => trap.index),
            multipliers,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
            difficultyOverride,
            aiPersonality,
          },
        })
      } else {
        aiWorkerRef.current?.postMessage({
          type: 'ADAPTIVE_MOVE',
          payload: {
            squares,
            boardSize,
            winLength,
            humanWinStreak,
            roundNumber,
            consecutiveDraws,
            blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
            multipliers:
              gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
            difficultyOverride,
            aiPersonality,
          },
        })
      }
    }

    let activeVisibilityHandler = null

    // Hamle süresi sınırı varsa (özellikle 5s Yıldırım modunda), botun süreden kaybetmesini önlemek için
    // süre dolmadan önce acil durum hamlesi tetiklenir (5s modunda 3.8s'de).
    const emergencyDelay = turnTimeLimit > 0 ? Math.max(1200, (turnTimeLimit * 1000) - 1200) : 0
    if (turnTimeLimit > 0) {
      emergencyTimeoutId = safeSetTimeout(() => {
        if (hasAiMoved) return

        const availableIndexes = squares
          .map((sq, idx) => (sq || effectiveLockedSquares.includes(idx) || frozenSquares.includes(idx) ? null : idx))
          .filter((idx) => idx !== null)

        if (availableIndexes.length > 0) {
          getAiPlayerModule().then(({ getAdaptiveAiMove }) => {
            if (hasAiMoved) return
            let emergencyMove
            try {
              emergencyMove = getAdaptiveAiMove({
                squares,
                boardSize,
                winLength,
                humanWinStreak,
                roundNumber,
                consecutiveDraws,
                blockedIndexes: [...effectiveLockedSquares, ...frozenSquares],
                multipliers: gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
                aiPlayer: aiSymbol,
                humanPlayer: humanSymbol,
                gameMode,
              })
            } catch {
              emergencyMove = null
            }

            if (emergencyMove === null || emergencyMove === undefined || !availableIndexes.includes(emergencyMove)) {
              emergencyMove = availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
            }

            placeAiStone(emergencyMove)
          }).catch(() => {
            if (hasAiMoved) return
            const emergencyMove = availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
            placeAiStone(emergencyMove)
          })
        } else {
          hasAiMoved = true
          setXIsNext(aiSymbol === 'X' ? false : true)
        }
      }, emergencyDelay)
    }

    // 400ms gecikmeyi worker mesajından önce uygula (5s Yıldırım modunda refleks için 200ms)
    const aiThinkDelay = turnTimeLimit === 5 ? 200 : 400
    const delayId = safeSetTimeout(() => {
      if (document.visibilityState === 'hidden') {
        activeVisibilityHandler = () => {
          if (document.visibilityState !== 'hidden') {
            document.removeEventListener('visibilitychange', activeVisibilityHandler)
            activeVisibilityHandler = null
            postAiTask()
          }
        }
        document.addEventListener('visibilitychange', activeVisibilityHandler)
        return
      }
      postAiTask()
    }, aiThinkDelay)

    return () => {
      latestAiHandlerRef.current = {}
      clearSafeTimeout(delayId)
      if (emergencyTimeoutId) {
        clearSafeTimeout(emergencyTimeoutId)
      }
      if (activeVisibilityHandler) {
        document.removeEventListener('visibilitychange', activeVisibilityHandler)
        activeVisibilityHandler = null
      }
    }
  }, [
    gameConfig,
    difficultyOverride,
    gameMode,
    opponentType,
    xIsNext,
    effectiveWinner,
    matchWinner,
    isDraw,
    squares,
    boardSize,
    winLength,
    humanWinStreak,
    consecutiveDraws,
    effectiveLockedSquares,
    blockedSquares,
    frozenSquares,
    frozenBy,
    powersEnabled,
    playerPowers,
    shieldedSquares,
    boostedSquares,
    multipliers,
    multipliersEnabled,
    visibleBoostedSquares,
    traps,
    finishRound,
    roundNumber,
    currentPlayer,
    aiSymbol,
    humanSymbol,
    safeSetTimeout,
    clearSafeTimeout,
    triggerBotEmote,
    turnTimeLimit,
    aiPersonality,
  ])

  useEffect(() => {
    if (!blackHoleEvent) {
      return
    }

    const timeoutId = safeSetTimeout(() => {
      setBlackHoleEvent(null)
    }, 1100)

    return () => clearSafeTimeout(timeoutId)
  }, [blackHoleEvent, safeSetTimeout, clearSafeTimeout])

  useEffect(() => {
    if (!gameConfig || onlineGame) {
      return
    }

    const isMission = Boolean(gameConfig?.campaignLevel || gameConfig?.dailyChallenge)
    if (isMission) {
      // Bulmaca veya günlük görev durumları asla localStorage'a kaydedilmez;
      // bulmacalar her zaman baştan temiz tahta ve taze süreyle başlamalıdır.
      clearLocalSession()
      return
    }

    // Tur bittiğinde veya maç kazanıldığında (konfeti / sonuç ekranı açıkken)
    // kazanılmış tahtayı localStorage'a kaydetme; oturumu temizle.
    if (matchWinner || effectiveWinner || isDraw || Boolean(winner)) {
      clearLocalSession()
      return
    }

    const localSession = {
      gameConfig,
      gameMode,
      opponentType,
      playerSymbol: 'X',
      squares,
      xIsNext,
      scores,
      arenaSettings,
      multipliers,
      playerPowers,
      activePower,
      shieldedSquares,
      lockedSquares,
      stolenSquares,
      boostedSquares,
      visibleBoostedSquares,
      traps,
      blackHoleEvent,
      resultMessage,
      loserMessage,
      roundNumber,
      isRoundResultOpen: Boolean((effectiveWinner || isDraw) && !showSetupReturnConfirm),
      matchWinner,
      isMatchCompleted: Boolean(matchWinner),
      humanWinStreak,
      consecutiveDraws,
      turnDeadline:
        pausedRemainingMsRef.current !== null
          ? Date.now() + pausedRemainingMsRef.current
          : turnDeadlineRef.current,
      ...(gameMode === 'arena' && opponentType === 'ai'
        ? { frozenSquares, frozenBy, rewardedPowerClaimed, rewardedPowerMessage }
        : {}),
    }

    writeLocalSession(localSession)
  }, [
    gameConfig,
    onlineGame,
    gameMode,
    opponentType,
    squares,
    xIsNext,
    scores,
    arenaSettings,
    multipliers,
    playerPowers,
    activePower,
    shieldedSquares,
    lockedSquares,
    frozenSquares,
    frozenBy,
    stolenSquares,
    boostedSquares,
    visibleBoostedSquares,
    traps,
    blackHoleEvent,
    resultMessage,
    loserMessage,
    roundNumber,
    winner,
    effectiveWinner,
    isDraw,
    showSetupReturnConfirm,
    matchWinner,
    humanWinStreak,
    consecutiveDraws,
    rewardedPowerClaimed,
    rewardedPowerMessage,
  ])

  function handleSaveOnlineSession(session) {
    writeOnlineSession(session)
  }

  function proceedToNextRound() {
    gameplayStart()
    const nextRound = roundNumber + 1
    missionTotalTurnsRef.current = 0
    setCurrentMoves(0)
    // Oyuna HER TURDA DAİMA X başlar; Yan Yana modda oyuncular sırayla X ve O olurlar
    resetGame(arenaSettings, gameMode)
    setActionError('')
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
    setRoundNumber(nextRound)
    setIsRoundResultDismissed(false)
  }

  function handleNextRound() {
    registerUserGesture()
    playSound('click')
    // Asla oyun esnasında çıkmaz; sadece her 3 turda bir (3, 6, 9...) tur bitiminde gösterilir.
    // Yeni tur, süre sayacı ve bot hamlesi SADECE reklam tamamen bittiğinde başlar!
    if (roundNumber % 3 === 0) {
      requestMidgameAd({
        onAdStarted: () => setAdMuted(true),
        onAdFinished: () => {
          setAdMuted(false)
          proceedToNextRound()
        },
        onAdError: () => {
          setAdMuted(false)
          proceedToNextRound()
        },
      })
    } else {
      proceedToNextRound()
    }
  }

  function proceedToNewMatch() {
    clearLocalSession()
    gameplayStart()
    setTimeoutWinner(null)
    turnDeadlineRef.current = null
    pausedRemainingMsRef.current = null
    lastTurnKeyRef.current = ''
    setTurnTimeLeft(turnTimeLimit)
    const mission = gameConfig?.campaignLevel ?? gameConfig?.dailyChallenge
    const setup = extractMissionBoardSetup(mission?.initialBoard, boardSize)
    setSquares(setup.squares)
    setBlockedSquares(setup.blockedSquares)
    setShieldedSquares(setup.shieldedSquares)
    missionTotalTurnsRef.current = 0
    missionFailureRef.current = null
    setCurrentMoves(0)
    setXIsNext(true)
    setRoundNumber(1)
    setScores(initialScores)
    setMultipliers({
      ...(multipliersEnabled ? createBoardMultipliers(boardSize) : {}),
      ...(setup.multipliers || {}),
    })
    setPlayerPowers(
      mission
        ? createMissionPowers(gameConfig, gameMode, opponentType)
        : createInitialPlayerPowers({ gameMode, opponentType })
    )
    setTraps(setup.traps || [])
    setStolenSquares([])
    setActionError('')
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
    setActivePower(null)
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setHumanWinStreak(0)
    if (!isDraw) {
      setConsecutiveDraws(0)
    }
    setMissionResult(null)
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
  }

  function handleNewMatch() {
    registerUserGesture()
    playSound('click')
    if (gameConfig?.dailyChallenge && !gameConfig.dailyChallenge.isPractice && isDailyChallengeCompletedForDate(gameConfig.dailyChallenge.date)) {
      handleResultMenu()
      return
    }
    // Maç bittiğinde en az 3 tur oynandıysa reklam göster; yeni maç reklam bitince başlar
    if (roundNumber >= 3) {
      requestMidgameAd({
        onAdStarted: () => setAdMuted(true),
        onAdFinished: () => {
          setAdMuted(false)
          proceedToNewMatch()
        },
        onAdError: () => {
          setAdMuted(false)
          proceedToNewMatch()
        },
      })
    } else {
      proceedToNewMatch()
    }
  }

  function handleResetScores() {
    registerUserGesture()
    playSound('click')
    setScores(initialScores)
  }

  function handleResultMenu() {
    gameplayStop()
    setTimeoutWinner(null)
    turnDeadlineRef.current = null
    pausedRemainingMsRef.current = null
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    setGameConfig(null)
    setSquares(createEmptyBoard(3))
    setScores(initialScores)
    setBlockedSquares([])
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    missionTotalTurnsRef.current = 0
    missionFailureRef.current = null
    setCurrentMoves(0)
    setTraps([])
    setStolenSquares([])
    setActionError('')
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
    setActivePower(null)
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setHumanWinStreak(0)
    setConsecutiveDraws(0)
    setMissionResult(null)
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
    clearLocalSession()
  }

  function handleRequestScoreReset() {
    registerUserGesture()
    playSound('click')
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(true)
  }

  function handleCancelScoreReset() {
    registerUserGesture()
    playSound('click')
    setShowScoreResetConfirm(false)
  }

  function handleConfirmScoreReset() {
    registerUserGesture()
    playSound('click')
    if (gameConfig?.campaignLevel || gameConfig?.dailyChallenge) {
      proceedToNewMatch()
    } else {
      handleResetScores()
    }
    setShowScoreResetConfirm(false)
  }

  function handleStartGame(config) {
    clearLocalSession()
    if (config.campaignLevel) {
      const savedCampaign = sanitizeCampaignProgress(safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} }))
      if (!isCampaignLevelUnlocked(config.campaignLevel.id, savedCampaign)) {
        console.warn(`[Security] Attempted to start locked campaign level ${config.campaignLevel.id}`)
        return
      }
    }
    if (config.dailyChallenge && isDailyChallengeCompletedForDate(config.dailyChallenge.date)) {
      config.dailyChallenge.isPractice = true
    }
    gameplayStart()
    setOnlineGame(null)
    setSetupRestoreMessage('')
    setGameConfig(config)
    setTimeoutWinner(null)
    setTurnTimeLeft(config.turnTimeLimit ?? 0)
    setGameMode(config.gameMode)
    const mission = config.campaignLevel ?? config.dailyChallenge
    const setup = extractMissionBoardSetup(mission?.initialBoard, config.boardSize)
    setSquares(setup.squares)
    setBlockedSquares(setup.blockedSquares)
    setShieldedSquares(setup.shieldedSquares)
    missionTotalTurnsRef.current = 0
    missionFailureRef.current = null
    setCurrentMoves(0)
    const shouldUseMultipliers =
      config.gameMode === 'arena' && (
        arenaSettings.multipliersEnabled ||
        Boolean(mission?.constraints?.requireMultiplier) ||
        Boolean((mission?.initialPowers?.vampire ?? 0) > 0)
      )
    setMultipliers({
      ...(shouldUseMultipliers ? createBoardMultipliers(config.boardSize) : {}),
      ...(setup.multipliers || {}),
    })
    setScores(initialScores)
    setXIsNext(true)
    setRoundNumber(1)
    const initialMissionPowers = createMissionPowers(config, config.gameMode, config.opponentType ?? 'human')
    setPlayerPowers(initialMissionPowers)
    missionInitialPowersRef.current = initialMissionPowers
    missionInitialFilledCountRef.current = setup.squares.filter(Boolean).length
    missionCompletionRef.current = null
    setActivePower(null)
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    setStolenSquares([])
    setActionError('')
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setTraps(setup.traps || [])
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    setHumanWinStreak(0)
    setConsecutiveDraws(0)
    setMissionResult(null)
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
  }

  function handleNextCampaignLevel() {
    if (!gameConfig?.campaignLevel) return
    const nextLevelId = gameConfig.campaignLevel.id + 1
    const nextLevel = getLevelById(nextLevelId)
    if (!nextLevel) return
    handleStartGame({
      boardSize: nextLevel.boardSize,
      winLength: nextLevel.winLength,
      opponentType: 'ai',
      gameMode: 'arena',
      targetValue: 1,
      isInfinite: false,
      turnTimeLimit: nextLevel.timeLimit || 15,
      firstMove: 'human',
      player1Name: isTr ? 'Oyuncu' : 'Player',
      player2Name: 'Bot',
      campaignLevel: nextLevel,
      difficultyOverride: nextLevel.difficulty || 'medium',
    })
  }

  function handleStartOnlineGame(nextOnlineGame) {
    gameplayStart()
    setGameConfig(null)
    setOnlineGame(nextOnlineGame)
    handleSaveOnlineSession({
      roomCode: nextOnlineGame.roomCode,
      playerId: nextOnlineGame.playerId,
      playerSecret: nextOnlineGame.playerSecret,
      symbol: nextOnlineGame.symbol,
      playerName: nextOnlineGame.playerName,
    })
    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  function handleOnlineMenu() {
    gameplayStop()
    setOnlineGame(null)
    setGameConfig(null)
    clearOnlineSession()
    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  if (onlineGame) {
    return <OnlineGame initialOnlineGame={onlineGame} onMenu={handleOnlineMenu} />
  }

  if (!isSessionRestoreChecked) {
    return (
      <main className="app-shell">
        <section className="game-card setup-card">
          <header className="game-header brand-header setup-brand-header">
            <h1>XO TACTIX</h1>
            <p>{isTr ? 'Kayıt kontrol ediliyor...' : 'Checking saved session...'}</p>
          </header>
        </section>
      </main>
    )
  }

  // ── Quick Play: Start Arena 3x3 AI game with 1 click ──────────────────────
  function handleQuickPlay() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('xo-intro-seen', 'true')
    }
    setShowIntro(false)

    // Start tutorial for first-time players
    const tutorialDone = typeof window !== 'undefined' && window.localStorage.getItem('xo-tutorial-complete')
    if (!tutorialDone) {
      setIsTutorialActive(true)
      setTutorialStep(1)
    }

    handleStartGame({
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
  }

  function handleIntroCustomize() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('xo-intro-seen', 'true')
    }
    setShowIntro(false)
  }

  function handleTutorialNext() {
    setTutorialStep((prev) => Math.min(prev + 1, 4))
  }

  function handleTutorialSkip() {
    setIsTutorialActive(false)
    setTutorialStep(0)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('xo-tutorial-complete', 'true')
    }
  }

  if (!gameConfig) {
    // Show intro animation for first-time visitors
    if (showIntro) {
      return (
        <IntroAnimation
          onQuickPlay={handleQuickPlay}
          onCustomize={handleIntroCustomize}
          language={language}
        />
      )
    }

    return (
      <GameSetup
        onStartGame={handleStartGame}
        onStartOnlineGame={handleStartOnlineGame}
        onSaveOnlineSession={handleSaveOnlineSession}
        restoreMessage={setupRestoreMessage}
      />
    )
  }

  return (
    <main className="app-shell">
      <section className="game-card">
        <header className="game-header brand-header">
          <h1>XO TACTIX</h1>
          {!isMissionMode && (
            <p>{t('setup.slogan') || (isTr ? 'Taşını koy. Gücünü kullan. Rövanşı al.' : 'Place your mark. Unleash powers. Claim revenge.')}</p>
          )}
          <div className="match-chip-row" aria-label={t('common.matchInfo') || (isTr ? 'Maç bilgileri' : 'Match details')}>
            {!isMissionMode && <span className={`match-chip ${gameMode}`}>{modeChip}</span>}
            {!isMissionMode && <span className="match-chip">{targetChip}</span>}
            <span className="match-chip">{boardSize}x{boardSize}</span>
            <span className="match-chip">{lineChip}</span>
          </div>
          {(gameConfig.campaignLevel || gameConfig.dailyChallenge) && (
            <div
              className={`mission-hud ${gameConfig.campaignLevel ? 'mission-hud--campaign' : 'mission-hud--daily'}`}
              role="status"
            >
              <div className="mission-hud__top">
                <div className="mission-hud__identity">
                  <span className="mission-hud__badge-pill">
                    {gameConfig.campaignLevel
                      ? `🧩 ${isTr ? 'BÖLÜM' : 'LEVEL'} ${gameConfig.campaignLevel.id}`
                      : `⚡ ${isTr ? 'GÜNÜN GÖREVİ' : 'DAILY MISSION'}`}
                  </span>
                  <span className="mission-hud__title">
                    {gameConfig.campaignLevel
                      ? (gameConfig.campaignLevel.title?.[language] || activeMission?.title?.tr || '')
                      : (activeMission?.title?.[language] || activeMission?.title?.tr || (isTr ? 'Günün Görevi' : 'Daily Mission'))}
                  </span>
                </div>

                <div className="mission-hud__stats">
                  <span className="mission-hud__moves-pill" style={{ color: activeMission?.constraints?.maxMoves && currentMoves > activeMission.constraints.maxMoves ? '#ef4444' : undefined }}>
                    ⏱️ {isTr ? 'Hamle' : 'Move'}: <strong>{currentMoves}{activeMission?.constraints?.maxMoves ? `/${activeMission.constraints.maxMoves}` : ''}</strong>
                  </span>
                  {gameConfig.campaignLevel?.stars && (
                    <span className="mission-hud__stars" title={isTr ? 'Canlı Yıldız Durumu' : 'Live Star Status'}>
                      {currentMoves <= (gameConfig.campaignLevel.stars?.three?.value ?? Infinity) ? '★★★' : currentMoves <= (gameConfig.campaignLevel.stars?.two?.value ?? Infinity) ? '★★☆' : '★☆☆'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mission-hud__target-box">
                <span className="mission-hud__target-icon">🎯</span>
                <span className="mission-hud__target-label">{isTr ? 'HEDEF' : 'GOAL'}:</span>
                <span className="mission-hud__target-text">{getMissionObjective(activeMission, isTr)}</span>
              </div>

              {gameConfig.campaignLevel?.stars ? (
                <div className="mission-hud__stars-row">
                  <span className="mission-hud__stars-label">⭐ {isTr ? 'Yıldızlar' : 'Stars'}:</span>
                  <div className="mission-hud__star-pills">
                    <span className="mission-hud__star-pill">
                      ★1 {formatStarGoal(gameConfig.campaignLevel.stars.one, isTr, 1, gameConfig.campaignLevel.type === 'puzzle')}
                    </span>
                    {gameConfig.campaignLevel.stars.two && (
                      <span className="mission-hud__star-pill">
                        ★2 {formatStarGoal(gameConfig.campaignLevel.stars.two, isTr, 2, gameConfig.campaignLevel.type === 'puzzle')}
                      </span>
                    )}
                    {gameConfig.campaignLevel.stars.three && (
                      <span className="mission-hud__star-pill">
                        ★3 {formatStarGoal(gameConfig.campaignLevel.stars.three, isTr, 3, gameConfig.campaignLevel.type === 'puzzle')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mission-hud__stars-row">
                  <span className="mission-hud__stars-label">⭐ {isTr ? 'Ödül' : 'Reward'}:</span>
                  <div className="mission-hud__star-pills">
                    <span className="mission-hud__star-pill mission-hud__star-pill--gold">
                      🏆 +{gameConfig.dailyChallenge?.reward?.value ?? 500} TP
                    </span>
                    <span className="mission-hud__star-pill mission-hud__star-pill--streak">
                      🔥 {isTr ? 'Seri Koruması' : 'Streak Shield'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="game-actions">
          <button
            className="setup-back-button"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              setShowScoreResetConfirm(false)
              setShowSetupReturnConfirm(true)
            }}
          >
            {t('common.mainMenu')}
          </button>
          <button className="score-reset-button" onClick={handleRequestScoreReset}>
            {t('common.restart')}
          </button>
          <SoundToggle>
            {gameMode === 'arena' && (
              <ArenaSettings
                settings={arenaSettings}
                pendingSettings={pendingArenaSettings}
                onSettingsChange={handleArenaSettingsChange}
                onConfirmSettingsChange={handleConfirmArenaSettingsChange}
                onCancelSettingsChange={handleCancelArenaSettingsChange}
              />
            )}
          </SoundToggle>
        </div>

        {showSetupReturnConfirm && (
          <div className="setup-return-confirm" role="alertdialog" aria-modal="true">
            <strong>{t('modals.confirmMenuTitle')}</strong>
            <p>{t('modals.confirmMenuDesc')}</p>

            <div className="setup-return-actions">
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  setShowSetupReturnConfirm(false)
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  handleResultMenu()
                }}
              >
                {t('modals.confirmMenuAction')}
              </button>
            </div>
          </div>
        )}

        {showScoreResetConfirm && (
          <div className="setup-return-confirm" role="alertdialog" aria-modal="true">
            <strong>{t('modals.confirmRestartTitle')}</strong>
            <p>{t('modals.confirmRestartDesc')}</p>

            <div className="setup-return-actions">
              <button type="button" onClick={handleCancelScoreReset}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={handleConfirmScoreReset}
              >
                {t('modals.confirmRestartAction')}
              </button>
            </div>
          </div>
        )}

        <GameStatus
          winner={winnerPlayerName}
          isDraw={isDraw}
          xIsNext={xIsNext}
          resultMessage={displayedResultMessage}
          loserMessage={displayedLoserMessage}
          matchWinner={matchWinner}
          isAiThinking={isAiThinking}
        />

        {actionError && (
          <div className="online-message online-message--error" role="alert">
            {actionError}
          </div>
        )}

        {blackHoleEvent && (
          <div className="black-hole-message" role="status" aria-live="assertive">
            {isTr ? `KARA DELİK! ${blackHoleEvent.player} taşı yutuldu!` : `BLACK HOLE! ${blackHoleEvent.player}'s mark was swallowed!`}
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

        <div className="arena-board-stack">
          <PowerPanel
            currentPlayer={p1Symbol}
            playerName={player1Name}
            score={p1Score}
            scoreLabel={scoreLabel}
            showScore={!isMissionMode}
            powerOptions={powerOptions}
            extraPowerIds={
              [...new Set([
                ...missionExtraPowerIds,
                ...(isRewardedPowerAvailable
                  ? rewardedPowerIds.filter((powerId) => (playerPowers[p1Symbol]?.[powerId] ?? 0) > 0)
                  : []),
              ])]
            }
            rewardedPack={
              isRewardedPowerAvailable
                ? {
                    claimed: rewardedPowerClaimed,
                    disabled: rewardedPowerClaimed || Boolean(effectiveWinner) || Boolean(matchWinner),
                    isRewarding,
                    isPickerOpen: isRewardedPowerPickerOpen,
                    message: isRewarding ? rewardedPowerMessage : '',
                    powerIds: rewardedPowerIds,
                    onToggle: () => setIsRewardedPowerPickerOpen((current) => !current),
                    onClaim: handleRewardedPowerClaim,
                  }
                : null
            }
            isActivePlayer={currentPlayer === p1Symbol && !effectiveWinner && !matchWinner && !isDraw}
            canInteract={(!isAiTurn || opponentType === 'human') && currentPlayer === p1Symbol && !effectiveWinner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled}
            modeLabel={isMissionMode ? null : undefined}
            statusText={p1GameOverStatus}
            powerCounts={playerPowers[p1Symbol]}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            hasUsedPowerThisTurn={hasUsedPowerThisTurn && currentPlayer === p1Symbol}
            onSelectPower={handleSelectHumanPower}
            onUseRandomBoost={handleRandomBoostPower}
            timeLimit={turnTimeLimit}
            timeLeft={turnTimeLeft}
            isWarning={turnTimeLeft <= 5}
          />

          <Board
            boardSize={boardSize}
            squares={squares}
            multipliers={multipliers}
            winningLine={winningLine}
            shieldedSquares={shieldedSquares}
            lockedSquares={effectiveLockedSquares}
            frozenSquares={frozenSquares}
            visibleBoostedSquares={visibleBoostedSquares}
            powerTargetIndexes={activePowerTargets}
            powerTargetLabel={ARENA_POWER_NAMES[activePower]}
            onSquareClick={handleSquareClick}
            traps={traps}
            currentPlayer={currentPlayer}
            topPlayerSymbol={p1Symbol}
            bottomPlayerSymbol={p2Symbol}
            visibleTrapOwner={opponentType === 'ai' ? humanSymbol : currentPlayer}
            blackHoleEventIndex={blackHoleEvent?.index}
            bombEventIndex={bombEvent?.index}
            vampireTransferEvent={vampireTransferEvent}
            shakeClass={boardShakeClass}
            activePower={activePower}
            isAiThinking={isAiThinking}
          />

          <PowerPanel
            currentPlayer={p2Symbol}
            playerName={player2Name}
            score={p2Score}
            scoreLabel={scoreLabel}
            showScore={!isMissionMode}
            powerOptions={powerOptions}
            extraPowerIds={missionExtraPowerIds}
            isActivePlayer={currentPlayer === p2Symbol && !effectiveWinner && !matchWinner && !isDraw}
            canInteract={opponentType !== 'ai' && !isAiTurn && currentPlayer === p2Symbol && !effectiveWinner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled}
            modeLabel={isMissionMode ? null : undefined}
            statusText={p2GameOverStatus}
            powerCounts={playerPowers[p2Symbol]}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            hasUsedPowerThisTurn={hasUsedPowerThisTurn && currentPlayer === p2Symbol}
            onSelectPower={handleSelectHumanPower}
            onUseRandomBoost={handleRandomBoostPower}
            timeLimit={turnTimeLimit}
            timeLeft={turnTimeLeft}
            isWarning={turnTimeLeft <= 5}
          />

          {(effectiveWinner || isDraw) && isRoundResultDismissed && (
            <RoundResultPreviewBar
              onNextRound={
                gameConfig?.campaignLevel &&
                missionResult?.completed &&
                Boolean(getLevelById(gameConfig.campaignLevel.id + 1))
                  ? handleNextCampaignLevel
                  : matchWinner
                    ? handleNewMatch
                    : handleNextRound
              }
              nextRoundLabel={
                gameConfig?.campaignLevel &&
                missionResult?.completed &&
                Boolean(getLevelById(gameConfig.campaignLevel.id + 1))
                  ? (isTr ? 'Sonraki Seviye ➔' : 'Next Level ➔')
                  : matchWinner
                    ? (t('common.newMatchViral') || (isTr ? 'Yeni Maç' : 'New Match'))
                    : t('game.nextRound')
              }
              statusMessage={
                matchWinner
                  ? (matchWinner === player1Name || effectiveWinner === humanSymbol
                      ? (isTr ? '🏆 Galibiyet!' : '🏆 Victory!')
                      : (isTr ? `🤖 ${matchWinner} Kazandı` : `🤖 ${matchWinner} Won`))
                  : isDraw
                    ? (isTr ? '🤝 Tur Berabere' : '🤝 Round Draw')
                    : (isTr ? `${roundNumber}. Tur Tamamlandı` : `Round ${roundNumber} Complete`)
              }
            />
          )}

          {gameConfig && opponentType === 'ai' && !matchWinner && (
            <QuickEmoteBar
              onSendEmote={handleSendEmote}
              disabled={Boolean(matchWinner)}
            />
          )}
        </div>


      </section>

      {(effectiveWinner || isDraw) &&
        !showSetupReturnConfirm &&
        !isRoundResultDismissed && (
        <RoundResultModal
          roundNumber={roundNumber}
          winner={winnerPlayerName}
          winningSymbol={effectiveWinner}
          mySymbol={humanSymbol}
          isDraw={isDraw}
          matchWinner={matchWinner}
          scores={{ p1: p1Score, p2: p2Score }}
          player1Name={player1Name}
          player2Name={player2Name}
          scoreLabel={scoreLabel}
          resultMessage={displayedResultMessage}
          loserMessage={displayedLoserMessage}
          onNextRound={handleNextRound}
          onNewMatch={handleNewMatch}
          onMenu={handleResultMenu}
          onClose={() => setIsRoundResultDismissed(true)}
          gameMode={gameMode}
          boardSize={boardSize}
          winStreak={humanWinStreak}
          opponentType={opponentType}
          campaignLevel={gameConfig?.campaignLevel}
          dailyChallenge={gameConfig?.dailyChallenge}
          dailyReward={gameConfig?.dailyChallenge?.reward?.value ?? 500}
          missionStars={missionResult?.stars ?? 0}
          missionCompleted={Boolean(
            (gameConfig?.campaignLevel || gameConfig?.dailyChallenge) &&
            missionResult &&
            missionResult.id === (gameConfig?.campaignLevel?.id ?? gameConfig?.dailyChallenge?.id) &&
            missionResult.completed
          )}
          missionAttempted={Boolean(
            (gameConfig?.campaignLevel || gameConfig?.dailyChallenge) &&
            missionResult &&
            missionResult.id === (gameConfig?.campaignLevel?.id ?? gameConfig?.dailyChallenge?.id)
          )}
          onNextLevel={handleNextCampaignLevel}
          hasNextLevel={Boolean(gameConfig?.campaignLevel && getLevelById(gameConfig.campaignLevel.id + 1))}
          missionFailure={missionResult?.failure}
          moves={currentMoves}
        />
      )}

      {isTutorialActive && tutorialStep > 0 && tutorialStep <= 4 && (
        <TutorialOverlay
          step={tutorialStep}
          onNextStep={handleTutorialNext}
          onSkip={handleTutorialSkip}
          language={language}
        />
      )}

    </main>
  )
}
