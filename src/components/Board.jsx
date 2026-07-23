
//9 elemanlı squares dizisini geziyor ve her eleman için bir Square oluşturuyor.

import Square from './Square'

export default function Board({
  squares,
  multipliers,
  winningLine,
  shieldedSquares,
  visibleBoostedSquares,
  onSquareClick,
}) {
  return (
    <div className="board">
      {squares.map((square, index) => (
        <Square
          key={index}
          value={square}
          multiplier={multipliers[index]}
          isWinningSquare={winningLine?.includes(index)}
          isShielded={shieldedSquares.includes(index)}
          isBoosted={visibleBoostedSquares.includes(index)}
          onSquareClick={() => onSquareClick(index)}
        />
      ))}
    </div>
  )
}
