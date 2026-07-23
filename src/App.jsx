import { useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import { calculateWinner, isBoardFull } from './game/gameLogic'
import GameModeToggle from './components/GameModeToggle'
import ScoreBoard from './components/ScoreBoard'
import ArenaSettings from './components/ArenaSettings'


const initialSquares = Array(9).fill(null)
const initialScores = {
  X: 0,
  O: 0,
}
const initialArenaSettings = {
  powersEnabled: true,
  multipliersEnabled: true,
}

//useState kısımları 
export default function App() {
  const [squares, setSquares] = useState(initialSquares)
  const [xIsNext, setXIsNext] = useState(true)
  const [gameMode, setGameMode] = useState('classic')
  const [scores, setScores] = useState(initialScores)
  const [arenaSettings, setArenaSettings] = useState(initialArenaSettings)
const [isArenaSettingsOpen, setIsArenaSettingsOpen] = useState(false)

  const winner = calculateWinner(squares)
  const isDraw = !winner && isBoardFull(squares)
  useEffect(() => {
  if (!winner) {
    return
  }

  setScores((currentScores) => ({
    ...currentScores,
    [winner]: currentScores[winner] + 1,
  }))
}, [winner])

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
        <GameStatus winner={winner} isDraw={isDraw} xIsNext={xIsNext} />

        <Board squares={squares} onSquareClick={handleSquareClick} />

        <button className="restart-button" onClick={handleRestart}>
          Yeni oyun
        </button>
      </section>
    </main>
  )
}