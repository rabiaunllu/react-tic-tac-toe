import { useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import ScoreBoard from './components/ScoreBoard'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import { createInitialPowerCounts } from './game/powers'
import GameSetup from './components/GameSetup'
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

function createInitialPlayerPowers() {
  return {
    X: createInitialPowerCounts(),
    O: createInitialPowerCounts(),
  }
}

export default function App() {
  const [squares, setSquares] = useState(() => createEmptyBoard(defaultBoardSize))
  const [xIsNext, setXIsNext] = useState(true)
  const [gameMode, setGameMode] = useState('classic')
  const [scores, setScores] = useState(initialScores)
  const [arenaSettings, setArenaSettings] = useState(initialArenaSettings)
  const [pendingArenaSettings, setPendingArenaSettings] = useState(null)
  const [isArenaSettingsOpen, setIsArenaSettingsOpen] = useState(false)
  const [multipliers, setMultipliers] = useState({})
  const [playerPowers, setPlayerPowers] = useState(createInitialPlayerPowers)
  const [activePower, setActivePower] = useState(null)
  const [shieldedSquares, setShieldedSquares] = useState([])
  const [boostedSquares, setBoostedSquares] = useState([])
  const [visibleBoostedSquares, setVisibleBoostedSquares] = useState([])
  const [resultMessage, setResultMessage] = useState(null)
const [loserMessage, setLoserMessage] = useState(null)
const [gameConfig, setGameConfig] = useState(null)
const [showSetupReturnConfirm, setShowSetupReturnConfirm] = useState(false)

  const boardSize = gameConfig?.boardSize ?? defaultBoardSize
  const winLength = gameConfig?.winLength ?? 3
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
  const hasBombTarget = squares.some(Boolean)
  const hasGameStarted =
    squares.some(Boolean) ||
    shieldedSquares.length > 0 ||
    boostedSquares.length > 0
  const boostTargets = squares
    .map((square, index) => (square || boostedSquares.includes(index) ? null : index))
    .filter((index) => index !== null)
  const hasBoostTarget = boostTargets.length > 0
  

  useEffect(() => {
    if (!winner) {
      return
    }

    setScores((currentScores) => ({
      ...currentScores,
      [winner]: currentScores[winner] + roundScore,
    }))
    setResultMessage(getRandomMessage(winnerMessages))
setLoserMessage(getRandomMessage(loserMessages))
  }, [winner, roundScore])
useEffect(() => {
  if (!isDraw) {
    return
  }

  setResultMessage(getRandomMessage(drawMessages))
  setLoserMessage(null)
}, [isDraw])
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
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setPlayerPowers(createInitialPlayerPowers())
    setResultMessage(null)
setLoserMessage(null)
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

  function handleGameModeChange(nextGameMode) {
    if (nextGameMode === gameMode) {
      return
    }

    setGameMode(nextGameMode)
    resetGame(arenaSettings, nextGameMode)
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
    spendPlayerPower(currentPlayer, 'bomb')
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleShieldPower(index) {
    const targetValue = squares[index]

    if (targetValue !== currentPlayer || shieldedSquares.includes(index)) {
      return
    }

    setShieldedSquares((currentShieldedSquares) => [
      ...currentShieldedSquares,
      index,
    ])

    spendPlayerPower(currentPlayer, 'shield')
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleJokerPower(index) {
    const targetValue = squares[index]

    if (targetValue === currentPlayer || shieldedSquares.includes(index)) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = currentPlayer

    setSquares(nextSquares)
    revealBoostedSquare(index)
    spendPlayerPower(currentPlayer, 'joker')
    setActivePower(null)
    setXIsNext(!xIsNext)
  }

  function handleBoostPower(index, isVisible = true) {
    if (squares[index] || boostedSquares.includes(index)) {
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
    setActivePower(null)
  }

  function handleRandomBoostPower() {
    if (winner || !hasBoostTarget) {
      return
    }

    const targetIndex = boostTargets[Math.floor(Math.random() * boostTargets.length)]
    handleBoostPower(targetIndex, false)
  }

  function handleSquareClick(index) {
    if (winner || matchWinner) {
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

    if (powersEnabled && activePower === 'boost') {
      handleBoostPower(index)
      return
    }

    if (squares[index]) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = currentPlayer

    setSquares(nextSquares)
    revealBoostedSquare(index)
    setXIsNext(!xIsNext)
  }

  function handleRestart() {
    resetGame()
  }
  function handleNewMatch() {
  setSquares(createEmptyBoard(boardSize))
  setXIsNext(true)
  setScores(initialScores)
  setMultipliers(multipliersEnabled ? createBoardMultipliers(boardSize) : {})
  setPlayerPowers(createInitialPlayerPowers())
  setActivePower(null)
  setShieldedSquares([])
  setBoostedSquares([])
  setVisibleBoostedSquares([])
  setResultMessage(null)
  setLoserMessage(null)
}

  function handleResetScores() {
    setScores(initialScores)
  }

  function handleStartGame(config) {
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
  setPlayerPowers(createInitialPlayerPowers())
  setActivePower(null)
  setShieldedSquares([])
  setBoostedSquares([])
  setVisibleBoostedSquares([])
  setResultMessage(null)
  setLoserMessage(null)
  setShowSetupReturnConfirm(false)
}
if (!gameConfig) {
  return <GameSetup onStartGame={handleStartGame} />
}
  return (
    <main className="app-shell">
      <section className="game-card">
        <header className="game-header">
          <span className="eyebrow">XO ARENA</span>
          <h1>Gelişmiş Tic Tac Toe</h1>
          <p>
            {gameMode === 'classic'
              ? 'Sade ve geleneksel oyun. Güç yok, bahane yok.'
              : 'Arena modu aktif. Özel güçler yakında sahaya inecek.'}
          </p>
        </header>
<button
  className="setup-back-button"
  onClick={() => setShowSetupReturnConfirm(true)}
>
  Ayarlara dön
</button>
{showSetupReturnConfirm && (
  <div className="setup-return-confirm">
    <strong>Ayarlara dönülsün mü?</strong>
    <p>Mevcut maç sıfırlanacak, skor ve tahta temizlenecek.</p>

    <div className="setup-return-actions">
      <button
        type="button"
        onClick={() => setShowSetupReturnConfirm(false)}
      >
        Vazgeç
      </button>
      <button
        type="button"
        className="danger-action"
        onClick={() => {
          setShowSetupReturnConfirm(false)
          setGameConfig(null)
        }}
      >
        Ayarlara dön
      </button>
    </div>
  </div>
)}
<div className="match-target-info">
  {gameConfig.isInfinite
    ? 'Sonsuz mod aktif'
    : gameConfig.gameMode === 'classic'
      ? `${gameConfig.targetValue} round kazanan maçı alır`
      : `${gameConfig.targetValue} puana ulaşan maçı alır`}
</div>
        

        {gameMode === 'arena' && (
          <div className="arena-settings-wrapper">
            <button
              className="settings-button"
              onClick={() => setIsArenaSettingsOpen(!isArenaSettingsOpen)}
            >
              {isArenaSettingsOpen ? 'Ayarları gizle' : 'Arena ayarları'}
            </button>

            {isArenaSettingsOpen && (
              <ArenaSettings
                settings={arenaSettings}
                pendingSettings={pendingArenaSettings}
                onSettingsChange={handleArenaSettingsChange}
                onConfirmSettingsChange={handleConfirmArenaSettingsChange}
                onCancelSettingsChange={handleCancelArenaSettingsChange}
              />
            )}
          </div>
        )}

        <ScoreBoard scores={scores} onResetScores={handleResetScores} />

<GameStatus
  winner={winner}
  isDraw={isDraw}
  xIsNext={xIsNext}
  roundScore={roundScore}
  resultMessage={resultMessage}
  loserMessage={loserMessage}
  matchWinner={matchWinner}
/>

        {powersEnabled && !matchWinner && (
          <PowerPanel
            currentPlayer={currentPlayer}
            powerCounts={playerPowers[currentPlayer]}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            disabledPowers={{
              bomb: !hasBombTarget,
              boost: !hasBoostTarget || Boolean(winner),
            }}
            onSelectPower={setActivePower}
            onUseRandomBoost={handleRandomBoostPower}
          />
        )}

        <Board
          boardSize={boardSize}
          squares={squares}
          multipliers={multipliers}
          winningLine={winningLine}
          shieldedSquares={shieldedSquares}
          visibleBoostedSquares={visibleBoostedSquares}
          onSquareClick={handleSquareClick}
        />

        <button
  className="restart-button"
  onClick={matchWinner ? handleNewMatch : handleRestart}
>
  {matchWinner ? 'Yeni maç' : 'Yeni round'}
</button>
      </section>
    </main>
  )
}
