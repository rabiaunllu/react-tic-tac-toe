import { useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import GameModeToggle from './components/GameModeToggle'
import ScoreBoard from './components/ScoreBoard'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import { createInitialPowerCounts } from './game/powers'
import {
  calculateRoundScore,
  calculateWinner,
  createBoardMultipliers,
  getWinningLine,
  isBoardFull,
} from './game/gameLogic'

const initialSquares = Array(9).fill(null)

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
  const [squares, setSquares] = useState(initialSquares)
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

  const winner = calculateWinner(squares)
  const winningLine = getWinningLine(squares)
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
  }, [winner, roundScore])

  useEffect(() => {
    setSquares(initialSquares)
    setXIsNext(true)
    setMultipliers(multipliersEnabled ? createBoardMultipliers() : {})
    setActivePower(null)
    setShieldedSquares([])
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setPlayerPowers(createInitialPlayerPowers())
  }, [gameMode, arenaSettings.multipliersEnabled, multipliersEnabled])

  function spendPlayerPower(player, powerId) {
    setPlayerPowers((currentPowers) => ({
      ...currentPowers,
      [player]: {
        ...currentPowers[player],
        [powerId]: currentPowers[player][powerId] - 1,
      },
    }))
  }

  function resetGame(nextSettings = arenaSettings) {
    const shouldUseMultipliers = gameMode === 'arena' && nextSettings.multipliersEnabled

    setSquares(initialSquares)
    setXIsNext(true)
    setMultipliers(shouldUseMultipliers ? createBoardMultipliers() : {})
    setActivePower(null)
    setShieldedSquares([])
    setBoostedSquares([])
    setVisibleBoostedSquares([])
    setPlayerPowers(createInitialPlayerPowers())
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
    if (winner) {
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

  function handleResetScores() {
    setScores(initialScores)
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

        <GameModeToggle gameMode={gameMode} onGameModeChange={setGameMode} />

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
        />

        {powersEnabled && (
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
          squares={squares}
          multipliers={multipliers}
          winningLine={winningLine}
          shieldedSquares={shieldedSquares}
          visibleBoostedSquares={visibleBoostedSquares}
          onSquareClick={handleSquareClick}
        />

        <button className="restart-button" onClick={handleRestart}>
          Yeni oyun
        </button>
      </section>
    </main>
  )
}
