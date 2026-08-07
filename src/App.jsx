import { useCallback, useEffect, useState } from 'react'
import { getAdaptiveAiMove, getArenaAiPowerAction } from './game/aiPlayer'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import { createInitialPowerCounts, rewardedPowerIds } from './game/powers'
import GameSetup from './components/GameSetup'
import OnlineGame from './components/OnlineGame'
import RoundResultModal from './components/RoundResultModal'
import RoundResultPreviewBar from './components/RoundResultPreviewBar'
import SoundToggle from './components/SoundToggle'
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
  isConnectionError,
  isRoomNotFoundError,
  requestRoomJson,
} from './api/roomsApi'
import { playSound, registerUserGesture } from './game/soundManager'

const defaultBoardSize = 3

const initialScores = {
  X: 0,
  O: 0,
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
  const [boostedSquares, setBoostedSquares] = useState([])
  const [visibleBoostedSquares, setVisibleBoostedSquares] = useState([])
  const [traps, setTraps] = useState([])
  const [blackHoleEvent, setBlackHoleEvent] = useState(null)
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
  const [rewardedPowerClaimed, setRewardedPowerClaimed] = useState(false)
  const [isRewarding, setIsRewarding] = useState(false)
  const [rewardedPowerMessage, setRewardedPowerMessage] = useState('')
  const [isRewardedPowerPickerOpen, setIsRewardedPowerPickerOpen] = useState(false)
 
 

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
  const matchWinner =
    gameConfig && !gameConfig.isInfinite
      ? scores.X >= gameConfig.targetValue
        ? 'X'
        : scores.O >= gameConfig.targetValue
          ? 'O'
          : null
      : null
  const hasBombTarget = squares.some(
    (square, index) => square && !shieldedSquares.includes(index)
  )
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
  const hasTrapTarget = squares.some(
  (square, index) =>
    !square &&
    !lockedSquares.includes(index) &&
    !traps.some((trap) => trap.index === index && trap.owner === currentPlayer)
)
  const vampireSources = squares
    .map((square, index) => square === 'O' && multipliers[index] ? index : null)
    .filter((index) => index !== null)
  const vampireTargets = squares
    .map((square, index) => square === 'X' && !multipliers[index] ? index : null)
    .filter((index) => index !== null)
  const isRewardedPowerAvailable =
    gameMode === 'arena' && opponentType === 'ai' && powersEnabled
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

        setScores((currentScores) => ({
          ...currentScores,
          [nextWinner]: currentScores[nextWinner] + nextRoundScore,
        }))
        if (opponentType === 'ai' && (gameMode === 'classic' || gameMode === 'arena')) {
  setHumanWinStreak((currentStreak) => {
    if (nextWinner === 'X') {
      return Math.min(currentStreak + 1, 3)
    }

    if (nextWinner === 'O') {
      return Math.max(currentStreak - 1, -3)
    }

    return currentStreak
  })
}
        setResultMessage(getRandomMessage(winnerMessages))
        setLoserMessage(getRandomMessage(loserMessages))
        playSound('win')
        return
      }

      if (isBoardFull(nextSquares)) {
        setResultMessage(getRandomMessage(drawMessages))
        setLoserMessage(null)
        playSound('draw')
      }
    },
    [boardSize, winLength, multipliers, multipliersEnabled, boostedSquares,opponentType, gameMode,]
  )
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
    const shouldUseMultipliers =
      nextGameMode === 'arena' && nextSettings.multipliersEnabled

    setSquares(createEmptyBoard(boardSize))
    setXIsNext(true)
    setMultipliers(shouldUseMultipliers ? createBoardMultipliers(boardSize) : {})
    setActivePower(null)
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setTraps([])
    setBlackHoleEvent(null)
    setPlayerPowers((currentPowers) => {
      const nextPowers = createInitialPlayerPowers({ gameMode: nextGameMode, opponentType })
      rewardedPowerIds.forEach((powerId) => {
        const retainedRewardCount = currentPowers.X[powerId] ?? 0
        if (retainedRewardCount > 0) {
          nextPowers.X[powerId] = retainedRewardCount
        }
      })

      return nextPowers
    })
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    
  }

  function handleRewardedPowerClaim(powerId) {
    if (!isRewardedPowerAvailable || rewardedPowerClaimed || isRewarding) {
      return
    }

    setIsRewarding(true)
    setIsRewardedPowerPickerOpen(false)
    setRewardedPowerMessage('Reklam izleniyor...')
    window.setTimeout(() => {
      setPlayerPowers((currentPowers) => ({
        ...currentPowers,
        X: {
          ...currentPowers.X,
          [powerId]: (currentPowers.X[powerId] ?? 0) + 1,
        },
      }))
      setRewardedPowerClaimed(true)
      setIsRewarding(false)
      setRewardedPowerMessage(`${powerId === 'joker' ? 'Joker' : powerId === 'freeze' ? 'Freeze' : 'Vampir'} gücü eklendi.`)
      playSound('power')
    }, 2000)
  }

  function handleSelectHumanPower(powerId) {
    if (winner || matchWinner || isDraw) {
      return
    }

    if (powerId === 'vampire') {
      handleVampirePower()
      return
    }

    setActivePower(powerId)
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
    setLockedSquares([index])
    spendPlayerPower(currentPlayer, 'bomb')
    playSound('bomb')
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleShieldPower(index) {
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
    setXIsNext(!xIsNext)
  }
  function handleTrapPower(index) {
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
    setActivePower(null)
    setXIsNext(!xIsNext)
  }
  function handleJokerPower(index) {
    const targetValue = squares[index]
    const opponentPlayer = currentPlayer === 'X' ? 'O' : 'X'

    if (
      targetValue !== opponentPlayer ||
      shieldedSquares.includes(index) ||
      lockedSquares.includes(index)
    ) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = currentPlayer

    setSquares(nextSquares)
    revealBoostedSquare(index)
    playSound('power')
    finishRound(nextSquares)
    spendPlayerPower(currentPlayer, 'joker')
    setLockedSquares([])
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleFreezePower(index) {
    if (squares[index] || lockedSquares.includes(index) || frozenSquares.includes(index)) {
      return
    }

    setFrozenSquares([index])
    spendPlayerPower(currentPlayer, 'freeze')
    playSound('power')
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleVampirePower() {
    const sourceIndex = vampireSources[0]
    const targetIndex = vampireTargets[0]

    if (sourceIndex === undefined || targetIndex === undefined) {
      setRewardedPowerMessage('Vampir için uygun çarpanlı rakip taşı ve çarpansız kendi taşın gerekli.')
      setActivePower(null)
      return
    }

    const transferredMultiplier = multipliers[sourceIndex]
    setMultipliers((currentMultipliers) => {
      const nextMultipliers = { ...currentMultipliers, [targetIndex]: transferredMultiplier }
      delete nextMultipliers[sourceIndex]
      return nextMultipliers
    })
    spendPlayerPower(currentPlayer, 'vampire')
    playSound('power')
    setRewardedPowerMessage(`Vampir ${transferredMultiplier}x çarpanı kendi taşına aktardı.`)
    setActivePower(null)
    setXIsNext(!xIsNext)
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

  function handleSquareClick(index) {
  registerUserGesture()
  if (winner || matchWinner || isDraw) {
    return
  }

  if (powersEnabled && activePower === 'bomb') {
    handleBombPower(index)
    return
  }

  if (powersEnabled && activePower === 'shield') {
    handleShieldPower(index)
    return
  }

  if (powersEnabled && activePower === 'joker') {
    if (isDraw) {
      return
    }

    handleJokerPower(index)
    return
  }

  if (powersEnabled && activePower === 'trap') {
    handleTrapPower(index)
    return
  }

  if (powersEnabled && activePower === 'freeze') {
    handleFreezePower(index)
    return
  }

  if (powersEnabled && activePower === 'boost') {
    handleBoostPower(index)
    return
  }

  if (powersEnabled && activePower === 'vampire') {
    handleVampirePower()
    return
  }

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
  setXIsNext(!xIsNext)
}

  const restoreLocalGameSession = useCallback((session) => {
    setOnlineGame(null)
    setGameConfig(session.gameConfig)
    setGameMode(session.gameMode)
    setScores(session.scores)
    setArenaSettings(session.arenaSettings)
    setPendingArenaSettings(null)
    setMultipliers(session.multipliers ?? {})
    setPlayerPowers(session.playerPowers)
    setActivePower(session.activePower ?? null)
    setShieldedSquares(session.shieldedSquares)
    setLockedSquares(session.lockedSquares)
    setFrozenSquares(session.frozenSquares ?? [])
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
    setRewardedPowerClaimed(session.rewardedPowerClaimed ?? false)
    setIsRewarding(false)
    setRewardedPowerMessage(session.rewardedPowerMessage ?? '')
    setIsRewardedPowerPickerOpen(false)
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
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
            symbol: onlineSession.symbol,
            playerName: onlineSession.playerName,
            room,
          })
          setSetupRestoreMessage('')
          setIsSessionRestoreChecked(true)
        } catch (error) {
          if (isRoomNotFoundError(error)) {
            clearOnlineSession()

            if (isMounted) {
              setSetupRestoreMessage('')
              setIsSessionRestoreChecked(true)
            }

            return
          }

          if (isMounted) {
            setSetupRestoreMessage(
              isConnectionError(error)
                ? 'Bağlantı kurulamadı. Tekrar deneniyor...'
                : 'Online oda bulunamadı. Kodu kontrol edip yeni oda oluşturabilir veya odaya katılabilirsin.'
            )
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
          restoreLocalGameSession(localSession)
          setSetupRestoreMessage('')
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

  useEffect(() => {
    const isAiSupportedMode = gameMode === 'classic' || gameMode === 'arena'
    const isAiTurn =
      gameConfig &&
      isAiSupportedMode &&
      opponentType === 'ai' &&
      !xIsNext &&
      !winner &&
      !matchWinner &&
      !isDraw

    if (!isAiTurn) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const spendAiPower = (powerId) => {
        setPlayerPowers((currentPowers) => ({
          ...currentPowers,
          O: {
            ...currentPowers.O,
            [powerId]: currentPowers.O[powerId] - 1,
          },
        }))
      }

      const placeAiStone = (index, nextBoostedSquares = boostedSquares) => {
        if (squares[index] || lockedSquares.includes(index) || frozenSquares.includes(index)) {
          return
        }

        const triggeredTrap = traps.find(
          (trap) => trap.index === index && trap.owner !== 'O'
        )

        if (triggeredTrap) {
          setBlackHoleEvent({
            index,
            player: 'O',
            id: Date.now(),
          })
          setTraps((currentTraps) =>
            currentTraps.filter((trap) => trap.index !== index)
          )
          setLockedSquares([])
          setFrozenSquares([])
          setActivePower(null)
          setXIsNext(true)
          playSound('blackhole')
          return
        }

        const nextSquares = squares.slice()
        nextSquares[index] = 'O'

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
        setLockedSquares([])
        setFrozenSquares([])
        setXIsNext(true)
      }

      if (gameMode === 'arena' && powersEnabled) {
        const aiPowerAction = getArenaAiPowerAction({
          squares,
          boardSize,
          winLength,
          humanWinStreak,
          roundNumber,
          playerPowers: playerPowers.O,
          shieldedSquares,
          boostedSquares,
          blockedIndexes: [...lockedSquares, ...frozenSquares],
          aiTrapIndexes: traps
            .filter((trap) => trap.owner === 'O')
            .map((trap) => trap.index),
          multipliers,
        })

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
          setFrozenSquares([])
          spendAiPower('bomb')
          playSound('bomb')
          setActivePower(null)
          setXIsNext(true)
          return
        }

        if (aiPowerAction?.type === 'shield') {
          setShieldedSquares((currentShieldedSquares) => [
            ...currentShieldedSquares,
            aiPowerAction.index,
          ])
          spendAiPower('shield')
          playSound('power')
          setLockedSquares([])
          setFrozenSquares([])
          setActivePower(null)
          setXIsNext(true)
          return
        }

        if (aiPowerAction?.type === 'trap') {
          setTraps((currentTraps) => [
            ...currentTraps,
            {
              index: aiPowerAction.index,
              owner: 'O',
            },
          ])
          spendAiPower('trap')
          playSound('blackhole')
          setLockedSquares([])
          setFrozenSquares([])
          setActivePower(null)
          setXIsNext(true)
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
          setFrozenSquares([])
          setActivePower(null)
          placeAiStone(aiPowerAction.index, nextBoostedSquares)
          return
        }
      }

      const aiMove = getAdaptiveAiMove({
        squares,
        boardSize,
        winLength,
        humanWinStreak,
        roundNumber,
        blockedIndexes: [...lockedSquares, ...frozenSquares],
        multipliers:
          gameMode === 'arena' && multipliersEnabled ? multipliers : undefined,
      })

      if (aiMove === null) {
        return
      }

      placeAiStone(aiMove)
    }, 450)

    return () => window.clearTimeout(timeoutId)
  }, [
    gameConfig,
    gameMode,
    opponentType,
    xIsNext,
    winner,
    matchWinner,
    isDraw,
    squares,
    boardSize,
    winLength,
    humanWinStreak,
    lockedSquares,
    frozenSquares,
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
  ])
  useEffect(() => {
    if (!blackHoleEvent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBlackHoleEvent(null)
    }, 1100)

    return () => window.clearTimeout(timeoutId)
  }, [blackHoleEvent])

  useEffect(() => {
    if (!gameConfig || onlineGame) {
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
      boostedSquares,
      visibleBoostedSquares,
      traps,
      blackHoleEvent,
      resultMessage,
      loserMessage,
      roundNumber,
      isRoundResultOpen: Boolean((winner || isDraw) && !showSetupReturnConfirm),
      humanWinStreak,
      ...(gameMode === 'arena' && opponentType === 'ai'
        ? { frozenSquares, rewardedPowerClaimed, rewardedPowerMessage }
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
    boostedSquares,
    visibleBoostedSquares,
    traps,
    blackHoleEvent,
    resultMessage,
    loserMessage,
    roundNumber,
    winner,
    isDraw,
    showSetupReturnConfirm,
    humanWinStreak,
    rewardedPowerClaimed,
    rewardedPowerMessage,
  ])

  function handleSaveOnlineSession(session) {
    writeOnlineSession(session)
  }

  function handleNextRound() {
    registerUserGesture()
    playSound('click')
    resetGame()
    setRewardedPowerClaimed(false)
    setIsRewarding(false)
    setRewardedPowerMessage('')
    setIsRewardedPowerPickerOpen(false)
    setRoundNumber((currentRound) => currentRound + 1)
    setIsRoundResultDismissed(false)
  }

  function handleNewMatch() {
    registerUserGesture()
    playSound('click')
    setSquares(createEmptyBoard(boardSize))
    setXIsNext(true)
    setRoundNumber(1)
    setScores(initialScores)
    setMultipliers(multipliersEnabled ? createBoardMultipliers(boardSize) : {})
    setPlayerPowers(createInitialPlayerPowers({ gameMode, opponentType }))
    setTraps([])
    setBlackHoleEvent(null)
    setActivePower(null)
    setShieldedSquares([])
    setLockedSquares([])
    setFrozenSquares([])
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setHumanWinStreak(0)
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
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    setGameConfig(null)
    setTraps([])
    setBlackHoleEvent(null)
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
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setTraps([])
    setBlackHoleEvent(null)
    setResultMessage(null)
    setLoserMessage(null)
    setIsRoundResultDismissed(false)
    setShowSetupReturnConfirm(false)
    setShowScoreResetConfirm(false)
    setHumanWinStreak(0)
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
            Ayarlara dön
          </button>
          <button className="score-reset-button" onClick={handleRequestScoreReset}>
            Puan sıfırla
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
          <div className="setup-return-confirm">
            <strong>Ayarlara dönülsün mü?</strong>

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
                Ayarlara dön
              </button>
            </div>
          </div>
        )}

        {showScoreResetConfirm && (
          <div className="setup-return-confirm">
            <strong>Puanlar sıfırlansın mı?</strong>

            <div className="setup-return-actions">
              <button type="button" onClick={handleCancelScoreReset}>
                Hayır
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={handleConfirmScoreReset}
              >
                Evet
              </button>
            </div>
          </div>
        )}

        <GameStatus
          winner={winner}
          isDraw={isDraw}
          xIsNext={xIsNext}
          roundScore={roundScore}
          resultMessage={resultMessage}
          loserMessage={loserMessage}
          matchWinner={matchWinner}
        />

        {blackHoleEvent && (
          <div className="black-hole-message" role="status" aria-live="assertive">
            KARA DELİK! {blackHoleEvent.player} taşı yutuldu!
          </div>
        )}

        <div className="arena-board-stack">
          <PowerPanel
            currentPlayer="X"
            score={scores.X}
            scoreLabel={scoreLabel}
            powerOptions={powerOptions}
            extraPowerIds={
              isRewardedPowerAvailable
                ? rewardedPowerIds.filter((powerId) => (playerPowers.X[powerId] ?? 0) > 0)
                : []
            }
            rewardedPack={
              isRewardedPowerAvailable
                ? {
                    claimed: rewardedPowerClaimed,
                    disabled: rewardedPowerClaimed || Boolean(winner) || Boolean(matchWinner),
                    isRewarding,
                    isPickerOpen: isRewardedPowerPickerOpen,
                    message: isRewarding ? rewardedPowerMessage : '',
                    powerIds: rewardedPowerIds,
                    onToggle: () => setIsRewardedPowerPickerOpen((current) => !current),
                    onClaim: handleRewardedPowerClaim,
                  }
                : null
            }
            isActivePlayer={currentPlayer === 'X' && !winner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled && !matchWinner}
            powerCounts={playerPowers.X}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            disabledPowers={{
              bomb: !hasBombTarget,
              boost: !hasBoostTarget || Boolean(winner),
              trap: !hasTrapTarget || Boolean(winner),
              joker: !squares.some(
                (square, index) =>
                  square === 'O' &&
                  !shieldedSquares.includes(index) &&
                  !lockedSquares.includes(index)
              ) || Boolean(winner),
              freeze: !squares.some((square, index) => !square && !lockedSquares.includes(index) && !frozenSquares.includes(index)) || Boolean(winner),
              vampire: vampireSources.length === 0 || vampireTargets.length === 0 || Boolean(winner),
            }}
            onSelectPower={handleSelectHumanPower}
            onUseRandomBoost={handleRandomBoostPower}
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
            onSquareClick={handleSquareClick}
            traps={traps}
            currentPlayer={currentPlayer}
            visibleTrapOwner={opponentType === 'ai' ? 'X' : currentPlayer}
            blackHoleEventIndex={blackHoleEvent?.index}
          />

          <PowerPanel
            currentPlayer="O"
            score={scores.O}
            scoreLabel={scoreLabel}
            powerOptions={powerOptions}
            isActivePlayer={currentPlayer === 'O' && !winner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled && !matchWinner}
            powerCounts={playerPowers.O}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            disabledPowers={{
              bomb: !hasBombTarget,
              boost: !hasBoostTarget || Boolean(winner),
              trap: !hasTrapTarget || Boolean(winner),
            }}
            onSelectPower={setActivePower}
            onUseRandomBoost={handleRandomBoostPower}
          />

          {(winner || isDraw) && !matchWinner && isRoundResultDismissed && (
            <RoundResultPreviewBar
              onNextRound={handleNextRound}
            />
          )}
        </div>


      </section>

      {(winner || isDraw) &&
        !showSetupReturnConfirm &&
        (!isRoundResultDismissed || Boolean(matchWinner)) && (
        <RoundResultModal
          roundNumber={roundNumber}
          winner={winner}
          isDraw={isDraw}
          matchWinner={matchWinner}
          scores={scores}
          scoreLabel={scoreLabel}
          resultMessage={resultMessage}
          loserMessage={loserMessage}
          onNextRound={handleNextRound}
          onNewMatch={handleNewMatch}
          onMenu={handleResultMenu}
          onClose={matchWinner ? undefined : () => setIsRoundResultDismissed(true)}
        />
      )}

    </main>
  )
}
