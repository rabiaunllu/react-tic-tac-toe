import { useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import ScoreBoard from './components/ScoreBoard'
import ArenaSettings from './components/ArenaSettings'
import PowerPanel from './components/PowerPanel'
import { createInitialPowerCounts } from './game/powers'
import GameSetup from './components/GameSetup'
import HowToPlay from './components/HowToPlay'
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
  const [lockedSquares, setLockedSquares] = useState([])
  const [boostedSquares, setBoostedSquares] = useState([])
  const [visibleBoostedSquares, setVisibleBoostedSquares] = useState([])
  const [resultMessage, setResultMessage] = useState(null)
const [loserMessage, setLoserMessage] = useState(null)
const [gameConfig, setGameConfig] = useState(null)
const [showSetupReturnConfirm, setShowSetupReturnConfirm] = useState(false)
const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)

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
  const hasBombTarget = squares.some(
    (square, index) => square && !shieldedSquares.includes(index)
  )
  const hasGameStarted =
    squares.some(Boolean) ||
    shieldedSquares.length > 0 ||
    lockedSquares.length > 0 ||
    boostedSquares.length > 0
  const boostTargets = squares
    .map((square, index) =>
      square || boostedSquares.includes(index) || lockedSquares.includes(index)
        ? null
        : index
    )
    .filter((index) => index !== null)
  const hasBoostTarget = boostTargets.length > 0
  const scoreLabel = gameMode === 'classic' ? 'Round' : 'Puan'
  const modeChip = gameMode === 'arena' ? 'ARENA' : 'KLASİK'
  const targetChip = gameConfig
    ? gameConfig.isInfinite
      ? 'SONSUZ'
      : gameConfig.gameMode === 'classic'
        ? `${gameConfig.targetValue} ROUND`
        : `${gameConfig.targetValue} PUAN`
    : 'YENİ MAÇ'
  const lineChip = `${winLength} TAŞ`
  

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
    setLockedSquares([])
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
    setBoostedSquares((currentBoostedSquares) =>
      currentBoostedSquares.filter((squareIndex) => squareIndex !== index)
    )
    setVisibleBoostedSquares((currentVisibleBoostedSquares) =>
      currentVisibleBoostedSquares.filter((squareIndex) => squareIndex !== index)
    )
    setLockedSquares([index])
    spendPlayerPower(currentPlayer, 'bomb')
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
  spendPlayerPower(currentPlayer, 'joker')
  setLockedSquares([])
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
    setLockedSquares([])
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

    if (squares[index] || lockedSquares.includes(index)) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = currentPlayer

    setSquares(nextSquares)
    revealBoostedSquare(index)
    setLockedSquares([])
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
  setLockedSquares([])
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
  setLockedSquares([])
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
        <header className="game-header brand-header">
          <span className="eyebrow">REKABET MODU</span>
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
    onClick={() => setShowSetupReturnConfirm(true)}
  >
    Ayarlara dön
  </button>
    <button
    className="setup-back-button"
    onClick={() => setIsHowToPlayOpen(!isHowToPlayOpen)}
  >
    Nasıl oynanır?
  </button>
</div>
{isHowToPlayOpen && (
  <HowToPlay
    gameConfig={gameConfig}
    gameMode={gameMode}
    arenaSettings={arenaSettings}
    onClose={() => setIsHowToPlayOpen(false)}
  />
)}
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

        <ScoreBoard
          scores={scores}
          scoreLabel={scoreLabel}
          onResetScores={handleResetScores}
        />

<GameStatus
  winner={winner}
  isDraw={isDraw}
  xIsNext={xIsNext}
  roundScore={roundScore}
  resultMessage={resultMessage}
  loserMessage={loserMessage}
  matchWinner={matchWinner}
/>

        <div className="arena-board-stack">
          <PowerPanel
            currentPlayer="X"
            score={scores.X}
            scoreLabel={scoreLabel}
            isActivePlayer={currentPlayer === 'X' && !winner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled && !matchWinner}
            powerCounts={playerPowers.X}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            disabledPowers={{
              bomb: !hasBombTarget,
              boost: !hasBoostTarget || Boolean(winner),
            }}
            onSelectPower={setActivePower}
            onUseRandomBoost={handleRandomBoostPower}
          />

          <Board
            boardSize={boardSize}
            squares={squares}
            multipliers={multipliers}
            winningLine={winningLine}
            shieldedSquares={shieldedSquares}
            lockedSquares={lockedSquares}
            visibleBoostedSquares={visibleBoostedSquares}
            onSquareClick={handleSquareClick}
          />

          <PowerPanel
            currentPlayer="O"
            score={scores.O}
            scoreLabel={scoreLabel}
            isActivePlayer={currentPlayer === 'O' && !winner && !matchWinner && !isDraw}
            isPowersEnabled={powersEnabled && !matchWinner}
            powerCounts={playerPowers.O}
            activePower={activePower}
            boostMode={arenaSettings.boostMode}
            disabledPowers={{
              bomb: !hasBombTarget,
              boost: !hasBoostTarget || Boolean(winner),
            }}
            onSelectPower={setActivePower}
            onUseRandomBoost={handleRandomBoostPower}
          />
        </div>

        {!matchWinner && (
          <button className="restart-button" onClick={handleRestart}>
            Yeni round
          </button>
        )}
      </section>

      {matchWinner && (
        <div className="match-winner-modal" role="presentation">
          <div
            className="match-winner-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-winner-title"
          >
            <span className="match-winner-trophy" aria-hidden="true">🏆</span>
            <div className="match-winner-copy">
              <strong id="match-winner-title">{matchWinner} maçı aldı</strong>
              <span>{scores.X} - {scores.O}</span>
              <small>Rövanş hazır.</small>
            </div>
            <div className="match-winner-actions">
              <button type="button" onClick={handleNewMatch}>
                Yeni maç
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setGameConfig(null)}
              >
                Ayarlara dön
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
