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
}
const initialPlayerPowers = {
  X: createInitialPowerCounts(),
  O: createInitialPowerCounts(),
}

export default function App() {
  const [squares, setSquares] = useState(initialSquares)
  const [xIsNext, setXIsNext] = useState(true)
  const [gameMode, setGameMode] = useState('classic')
  const [scores, setScores] = useState(initialScores)
  const [arenaSettings, setArenaSettings] = useState(initialArenaSettings)
  const [isArenaSettingsOpen, setIsArenaSettingsOpen] = useState(false)
  const [multipliers, setMultipliers] = useState({})
  const [playerPowers, setPlayerPowers] = useState(initialPlayerPowers)
const [activePower, setActivePower] = useState(null)

  const winner = calculateWinner(squares)
  const winningLine = getWinningLine(squares)
  const multipliersEnabled = gameMode === 'arena' && arenaSettings.multipliersEnabled
  const roundScore = calculateRoundScore(winningLine, multipliers, multipliersEnabled)
  const isDraw = !winner && isBoardFull(squares)
  const currentPlayer = xIsNext ? 'X' : 'O'
const powersEnabled = gameMode === 'arena' && arenaSettings.powersEnabled

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
  }, [gameMode, arenaSettings.multipliersEnabled, multipliersEnabled])

  function handleSquareClick(index) {
    if (squares[index] || winner) {
      return
    }

    const nextSquares = squares.slice()
    nextSquares[index] = xIsNext ? 'X' : 'O'

    setSquares(nextSquares)
    setXIsNext(!xIsNext)
  }

  function handleRestart() {
    setSquares(initialSquares)
    setXIsNext(true)
    setMultipliers(multipliersEnabled ? createBoardMultipliers() : {})
    setActivePower(null)
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
                onSettingsChange={setArenaSettings}
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
    onSelectPower={setActivePower}
  />
)}

 <Board
  squares={squares}
  multipliers={multipliers}
  winningLine={winningLine}
  onSquareClick={handleSquareClick}
/>

        <button className="restart-button" onClick={handleRestart}>
          Yeni oyun
        </button>
      </section>
    </main>
  )
}