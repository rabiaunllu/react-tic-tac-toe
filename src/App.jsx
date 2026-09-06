import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdaptiveAiMove, getArenaAiPowerAction } from './game/aiPlayer'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import GameSetup from './components/GameSetup'
import { ARENA_POWER_NAMES, createInitialPowerCounts, rewardedPowerIds } from './game/powers'
import OnlineGame from './components/OnlineGame'
import RoundResultModal from './components/RoundResultModal'
import RoundResultPreviewBar from './components/RoundResultPreviewBar'
import FloatingEmote from './components/FloatingEmote'
import QuickEmoteBar from './components/QuickEmoteBar'
import SoundToggle from './components/SoundToggle'
import { useTranslation } from './i18n'
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
  const [consecutiveDraws, setConsecutiveDraws] = useState(0)
  const [floatingEmotes, setFloatingEmotes] = useState([])
  const botHurrySentRef = useRef(false)
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
  const winner = calculateWinner(squares, boardSize, winLength)
  const winningLine = getWinningLine(squares, boardSize, winLength)
  const multipliersEnabled = gameMode === 'arena' && arenaSettings.multipliersEnabled
  const powersEnabled = gameMode === 'arena' && arenaSettings.powersEnabled
  const roundScore = calculateRoundScore(
    winningLine,
    multipliers,
    multipliersEnabled,
    boostedSquares
  )
  const isDraw = !winner && isBoardFull(squares)
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
  const isAiThinking = isAiTurn
  const hasGameStarted =
    squares.some(Boolean) ||
    shieldedSquares.length > 0 ||
    lockedSquares.length > 0 ||
    boostedSquares.length > 0 ||
    traps.length > 0
  const boostTargets = squares
    .map((square, index) =>
      square || boostedSquares.includes(index) || lockedSquares.includes(index)
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
      !square && !boostedSquares.includes(index) && !lockedSquares.includes(index) ? [index] : []
    ),
    trap: squares.flatMap((square, index) =>
      !square && !lockedSquares.includes(index) && !traps.some((trap) => trap.index === index && trap.owner === currentPlayer) ? [index] : []
    ),
    freeze: squares.flatMap((square, index) =>
      !square && !lockedSquares.includes(index) && !frozenSquares.includes(index) ? [index] : []
    ),
    vampire: vampireSources.length > 0 && vampireTargets.length > 0 ? vampireSources : [],
  }
  const activePowerTargets = powersEnabled && activePower ? arenaPowerTargets[activePower] ?? [] : null
  // Reklam altyapısı ileride aktif edilecek — şimdilik UI'dan gizli
  const isRewardedPowerAvailable = false
  const scoreLabel = 'Puan'
  const modeChip = gameMode === 'arena' ? 'ARENA' : 'KLASİK'
  const targetChip = gameConfig
    ? gameConfig.isInfinite
      ? 'SONSUZ'
      : gameConfig.gameMode === 'classic'
        ? `${gameConfig.targetValue} TUR`
        : `${gameConfig.targetValue} PUAN`
    : 'YENİ MAÇ'
  const lineChip = `${winLength} TAŞ`

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
      random_move: ['gg', 'nice', 'wellplayed', 'noway', 'hurry'],
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
        if (opponentType === 'ai' && (gameMode === 'classic' || gameMode === 'arena')) {
          setHumanWinStreak((currentStreak) => {
            if (nextWinner === humanSymbol) {
              return Math.min(currentStreak + 1, 3)
            }

            if (nextWinner === aiSymbol) {
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
        playSound('win')
        return
      }

      if (isBoardFull(nextSquares)) {
        if (opponentType === 'ai' && (gameMode === 'classic' || gameMode === 'arena')) {
          setConsecutiveDraws((prev) => prev + 1)
          triggerBotEmote('draw')
        }
        setResultMessage(getRandomMessage(drawMessages, language))
        setLoserMessage(null)
        playSound('draw')
      }
    },
    [boardSize, winLength, multipliers, multipliersEnabled, boostedSquares, opponentType, gameMode, isP1X, humanSymbol, aiSymbol, language, triggerBotEmote]
  )

  const handleTimeOut = useCallback(
    (timedOutPlayer) => {
      if (winner || matchWinner || isDraw || timeoutWinner || resultMessage) return

      setConsecutiveDraws(0)
      setShowSetupReturnConfirm(false)
      setShowScoreResetConfirm(false)
      turnDeadlineRef.current = null

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

      setResultMessage(['⏰', `${timedOutPlayerName} Süresi Bitti!`, `Turu ${winnerName} kazandı.`])
      setLoserMessage(null)
      playSound('win')
    },
    [winner, matchWinner, isDraw, timeoutWinner, resultMessage, gameMode, isP1X, xPlayerName, oPlayerName, opponentType, aiSymbol, humanSymbol, triggerBotEmote]
  )

  // Turn timer countdown effect (Mutlak zaman damgası ile sayfa yenileme hilesi engellendi)
  useEffect(() => {
    if (
      turnTimeLimit <= 0 ||
      effectiveWinner ||
      matchWinner ||
      isDraw ||
      resultMessage ||
      (opponentType === 'ai' && currentPlayer === aiSymbol)
    ) {
      turnDeadlineRef.current = null
      return
    }

    const movesCount = squares.filter(Boolean).length
    const currentTurnKey = `${roundNumber}-${currentPlayer}-${movesCount}`

    if (currentTurnKey !== lastTurnKeyRef.current) {
      lastTurnKeyRef.current = currentTurnKey
      botHurrySentRef.current = false

      const hasValidRestoredDeadline =
        turnDeadlineRef.current && turnDeadlineRef.current > Date.now()

      if (!hasValidRestoredDeadline) {
        if (turnDeadlineRef.current && turnDeadlineRef.current <= Date.now()) {
          handleTimeOut(currentPlayer)
          return
        }
        turnDeadlineRef.current = Date.now() + turnTimeLimit * 1000
      }
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
      const clampedRemaining = Math.max(0, remainingSec)
      const currentWhole = Math.ceil(clampedRemaining)

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
          setFloatingEmotes((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              emoteId: 'hurry',
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
    }, 100)

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
  ])

  function spendPlayerPower(player, powerId) {
    setPlayerPowers((currentPowers) => ({
      ...currentPowers,
      [player]: {
        ...currentPowers[player],
        [powerId]: currentPowers[player][powerId] - 1,
      },
    }))
  }

  function resetGame(nextSettings = arenaSettings, nextGameMode = gameMode) {
    clearAllTimeouts()
    setTimeoutWinner(null)
    turnDeadlineRef.current = null
    lastTurnKeyRef.current = ''
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

    setIsRewarding(true)
    setIsRewardedPowerPickerOpen(false)
    setRewardedPowerMessage('Reklam izleniyor...')
    safeSetTimeout(() => {
      setPlayerPowers((currentPowers) => ({
        ...currentPowers,
        [humanSymbol]: {
          ...currentPowers[humanSymbol],
          [powerId]: (currentPowers[humanSymbol]?.[powerId] ?? 0) + 1,
        },
      }))
      setRewardedPowerClaimed(true)
      setIsRewarding(false)
      setRewardedPowerMessage(`${powerId === 'freeze' ? 'Freeze' : 'Vampir'} gücü eklendi.`)
      playSound('power')
    }, 2000)
  }

  function handleSelectHumanPower(powerId) {
    if (winner || matchWinner || isDraw || hasUsedPowerThisTurn || isAiTurn) {
      return
    }

    setActionError('')

    if (powerId === 'vampire') {
      if (vampireSources.length === 0 || vampireTargets.length === 0) {
        setActionError('Vampir için uygun çarpanlı rakip taşı ve çarpansız kendi taşın gerekli.')
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
    playSound('power')
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
    playSound('power')
    setActivePower(null)
    setHasUsedPowerThisTurn(true)
  }

  function handleVampirePower() {
    if (hasUsedPowerThisTurn) {
      return
    }

    const sourceIndex = vampireSources[0]
    const targetIndex = vampireTargets[0]

    if (sourceIndex === undefined || targetIndex === undefined) {
      setActionError('Vampir için uygun çarpanlı rakip taşı ve çarpansız kendi taşın gerekli.')
      setActivePower(null)
      return
    }

    const transferredMultiplier = multipliers[sourceIndex]
    spendPlayerPower(currentPlayer, 'vampire')
    playSound('power')
    setActivePower(null)
    setHasUsedPowerThisTurn(true)
    setRewardedPowerMessage(`Vampir ${transferredMultiplier}x çarpanı çekiyor...`)

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
    if (squares[index] || boostedSquares.includes(index) || lockedSquares.includes(index)) {
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
    if (winner || matchWinner || isDraw || !hasBoostTarget) {
      return
    }

    const targetIndex = boostTargets[Math.floor(Math.random() * boostTargets.length)]
    handleBoostPower(targetIndex, false)
  }

  const handleSquareClick = useCallback((index) => {
    registerUserGesture()
    if (winner || matchWinner || isDraw || isAiTurn) {
      return
    }

    if (powersEnabled && activePower) {
      setActionError('')

      if ((playerPowers[currentPlayer]?.[activePower] ?? 0) <= 0) {
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

    if (squares[index] || lockedSquares.includes(index) || frozenSquares.includes(index)) {
      return
    }

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
          if (localSession.matchWinner || localSession.isMatchCompleted) {
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

    const placeAiStone = (index, nextBoostedSquares = boostedSquares) => {
      if (squares[index] || lockedSquares.includes(index) || frozenSquares.includes(index)) {
        return
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
      if (!getWinningLine(nextSquares, boardSize, winLength) && !isBoardFull(nextSquares)) {
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
          playSound('power')
          setLockedSquares([])
          setActivePower(null)

          // Arena search evaluates shield + placement as one turn.  Preserve its
          // planned follow-up instead of asking the lightweight classic chooser
          // for an unrelated move after the shield has been spent.
          const aiMove = aiPowerAction.followUpMove ?? getAdaptiveAiMove({
            squares,
            boardSize,
            winLength,
            humanWinStreak,
            roundNumber,
            consecutiveDraws,
            blockedIndexes: [...lockedSquares, ...frozenSquares],
            multipliers:
              gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
          })
          if (aiMove !== null && aiMove !== undefined) {
            placeAiStone(aiMove)
          } else {
            setXIsNext(aiSymbol === 'X' ? false : true)
          }
          return
        }

        if (aiPowerAction?.type === 'trap') {
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
          playSound('power')
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
            playSound('power')
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
            blockedIndexes: [...lockedSquares, ...frozenSquares],
            multipliers:
              gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
          },
        })
        return
      }

      if (msgType === 'ADAPTIVE_MOVE_RESULT') {
        const aiMove = data.move
        if (aiMove !== null && aiMove !== undefined) {
          placeAiStone(aiMove)
        }
        return
      }
    }

    latestAiHandlerRef.current.onError = () => {
      try {
        if (gameMode === 'arena' && powersEnabled) {
          const aiPowerAction = getArenaAiPowerAction({
            squares, boardSize, winLength, humanWinStreak, roundNumber, consecutiveDraws,
            playerPowers: playerPowers[aiSymbol], humanPowers: playerPowers[humanSymbol],
            shieldedSquares, boostedSquares,
            blockedIndexes: [...lockedSquares, ...frozenSquares],
            aiTrapIndexes: traps.filter((trap) => trap.owner === aiSymbol).map((trap) => trap.index),
            multipliers,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
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
              blockedIndexes: [...lockedSquares, ...frozenSquares],
              multipliers: gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
              aiPlayer: aiSymbol,
              humanPlayer: humanSymbol,
            })
            if (aiMove !== null && aiMove !== undefined) placeAiStone(aiMove)
            return
          }
          if (aiPowerAction?.type === 'bomb') {
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
          blockedIndexes: [...lockedSquares, ...frozenSquares],
          multipliers: gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
          aiPlayer: aiSymbol,
          humanPlayer: humanSymbol,
          gameMode,
        })
        if (fallbackMove !== null) placeAiStone(fallbackMove)
      } catch {
        // Sessizce geç
      }
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
            blockedIndexes: [...lockedSquares, ...frozenSquares],
            aiTrapIndexes: traps
              .filter((trap) => trap.owner === aiSymbol)
              .map((trap) => trap.index),
            multipliers,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
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
            blockedIndexes: [...lockedSquares, ...frozenSquares],
            multipliers:
              gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
            aiPlayer: aiSymbol,
            humanPlayer: humanSymbol,
            gameMode,
          },
        })
      }
    }

    let activeVisibilityHandler = null

    // 400ms gecikmeyi worker mesajından önce uygula
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
    }, 400)

    return () => {
      latestAiHandlerRef.current = {}
      clearSafeTimeout(delayId)
      if (activeVisibilityHandler) {
        document.removeEventListener('visibilitychange', activeVisibilityHandler)
        activeVisibilityHandler = null
      }
    }
  }, [
    gameConfig,
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
    lockedSquares,
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

    if (matchWinner) {
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
      turnDeadline: turnDeadlineRef.current,
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

  function handleNextRound() {
    registerUserGesture()
    playSound('click')
    const nextRound = roundNumber + 1
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

  function handleNewMatch() {
    registerUserGesture()
    playSound('click')
    setTimeoutWinner(null)
    turnDeadlineRef.current = null
    lastTurnKeyRef.current = ''
    setTurnTimeLeft(turnTimeLimit)
    setSquares(createEmptyBoard(boardSize))
    setXIsNext(true)
    setRoundNumber(1)
    setScores(initialScores)
    setMultipliers(multipliersEnabled ? createBoardMultipliers(boardSize) : {})
    setPlayerPowers(createInitialPlayerPowers({ gameMode, opponentType }))
    setTraps([])
    setStolenSquares([])
    setActionError('')
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
    setActivePower(null)
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setHumanWinStreak(0)
    setConsecutiveDraws(0)
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
  }

  function handleResetScores() {
    registerUserGesture()
    playSound('click')
    setScores(initialScores)
  }

  function handleResultMenu() {
    setTimeoutWinner(null)
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    setGameConfig(null)
    setTraps([])
    setStolenSquares([])
    setActionError('')
    setBlackHoleEvent(null)
    setBombEvent(null)
    setVampireTransferEvent(null)
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
    handleResetScores()
    setShowScoreResetConfirm(false)
  }

  function handleStartGame(config) {
    setOnlineGame(null)
    setSetupRestoreMessage('')
    setGameConfig(config)
    setTimeoutWinner(null)
    setTurnTimeLeft(config.turnTimeLimit ?? 0)
    setGameMode(config.gameMode)
    setSquares(createEmptyBoard(config.boardSize))
    setMultipliers(
      config.gameMode === 'arena' && arenaSettings.multipliersEnabled
        ? createBoardMultipliers(config.boardSize)
        : {}
    )
    setScores(initialScores)
    setXIsNext(true)
    setRoundNumber(1)
    setPlayerPowers(
  createInitialPlayerPowers({
    gameMode: config.gameMode,
    opponentType: config.opponentType ?? 'human',
    playContext: 'local',
  })
)
    setActivePower(null)
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setFrozenBy(null)
    setStolenSquares([])
    setActionError('')
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setTraps([])
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
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
  }

  function handleStartOnlineGame(nextOnlineGame) {
    setGameConfig(null)
    setOnlineGame(nextOnlineGame)
    handleSaveOnlineSession({
      roomCode: nextOnlineGame.roomCode,
      playerId: nextOnlineGame.playerId,
      playerSecret: nextOnlineGame.playerSecret,
      symbol: nextOnlineGame.symbol,
      playerName: nextOnlineGame.playerName,
    })
  }

  function handleOnlineMenu() {
    setOnlineGame(null)
    setGameConfig(null)
    clearOnlineSession()
  }

  if (onlineGame) {
    return <OnlineGame initialOnlineGame={onlineGame} onMenu={handleOnlineMenu} />
  }

  if (!isSessionRestoreChecked) {
    return (
      <main className="app-shell">
        <section className="game-card setup-card">
          <header className="game-header brand-header setup-brand-header">
            <h1>XO ARENA</h1>
            <p>Kayıt kontrol ediliyor...</p>
          </header>
        </section>
      </main>
    )
  }

  if (!gameConfig) {
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
          <h1>XO ARENA</h1>
          <p>Taşını koy. Gücünü kullan. Rövanşı al.</p>
          <div className="match-chip-row" aria-label="Maç bilgileri">
            <span className={`match-chip ${gameMode}`}>{modeChip}</span>
            <span className="match-chip">{targetChip}</span>
            <span className="match-chip">{boardSize}x{boardSize}</span>
            <span className="match-chip">{lineChip}</span>
          </div>
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
            Ana Menü
          </button>
          <button className="score-reset-button" onClick={handleRequestScoreReset}>
            Yeniden Başlat
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
            <strong>Ana Menüye dönülsün mü?</strong>
            <p>Mevcut maç sonlandırılacak ve ana menüye dönülecektir.</p>

            <div className="setup-return-actions">
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  setShowSetupReturnConfirm(false)
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
                  setShowSetupReturnConfirm(false)
                  setGameConfig(null)
                  clearLocalSession()
                }}
              >
                Menüye Dön
              </button>
            </div>
          </div>
        )}

        {showScoreResetConfirm && (
          <div className="setup-return-confirm" role="alertdialog" aria-modal="true">
            <strong>Maç yeniden başlatılsın mı?</strong>
            <p>Tüm skorlar ve tahta sıfırlanıp yeni bir maç başlatılacak.</p>

            <div className="setup-return-actions">
              <button type="button" onClick={handleCancelScoreReset}>
                Vazgeç
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={handleConfirmScoreReset}
              >
                Yeniden Başlat
              </button>
            </div>
          </div>
        )}

        <GameStatus
          winner={winnerPlayerName}
          isDraw={isDraw}
          xIsNext={xIsNext}
          roundScore={roundScore}
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
            KARA DELİK! {blackHoleEvent.player} taşı yutuldu!
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
            powerOptions={powerOptions}
            extraPowerIds={
              isRewardedPowerAvailable
                ? rewardedPowerIds.filter((powerId) => (playerPowers[p1Symbol]?.[powerId] ?? 0) > 0)
                : []
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
            isPowersEnabled={powersEnabled && !matchWinner}
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
            lockedSquares={lockedSquares}
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
            powerOptions={powerOptions}
            isActivePlayer={currentPlayer === p2Symbol && !effectiveWinner && !matchWinner && !isDraw}
            canInteract={opponentType !== 'ai' && !isAiTurn && currentPlayer === p2Symbol && !effectiveWinner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled && !matchWinner}
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

          {(effectiveWinner || isDraw) && !matchWinner && isRoundResultDismissed && (
            <RoundResultPreviewBar
              onNextRound={handleNextRound}
              nextRoundLabel={t('game.nextRound')}
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
        (!isRoundResultDismissed || Boolean(matchWinner)) && (
        <RoundResultModal
          roundNumber={roundNumber}
          winner={winnerPlayerName}
          winningSymbol={effectiveWinner}
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
          onClose={matchWinner ? undefined : () => setIsRoundResultDismissed(true)}
          gameMode={gameMode}
          boardSize={boardSize}
          winStreak={humanWinStreak}
          opponentType={opponentType}
        />
      )}

    </main>
  )
}
