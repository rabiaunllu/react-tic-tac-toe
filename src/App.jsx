import { useState } from 'react'
import './App.css'
import Board from './components/Board'
import GameStatus from './components/GameStatus'
import { calculateWinner, isBoardFull } from './game/gameLogic'

const initialSquares = Array(9).fill(null)

export default function App() {
  const [squares, setSquares] = useState(initialSquares)
  const [xIsNext, setXIsNext] = useState(true)

  const winner = calculateWinner(squares)
  const isDraw = !winner && isBoardFull(squares)

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

  return (
    <main className="app-shell">
      <section className="game-card">
        <header className="game-header">
          <span className="eyebrow">XO ARENA</span>
          <h1>Gelişmiş Tic Tac Toe</h1>
          <p>Klasik modla başlıyoruz. Arena güçleri birazdan sahaya inecek.</p>
        </header>

        <GameStatus winner={winner} isDraw={isDraw} xIsNext={xIsNext} />

        <Board squares={squares} onSquareClick={handleSquareClick} />

        <button className="restart-button" onClick={handleRestart}>
          Yeni oyun
        </button>
      </section>
    </main>
  )
}