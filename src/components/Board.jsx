
//9 elemanlı squares dizisini geziyor ve her eleman için bir Square oluşturuyor.

import Square from './Square'

export default function Board({
  boardSize,
  squares,
  multipliers,
  winningLine,
  shieldedSquares,
  lockedSquares,
  visibleBoostedSquares,
  onSquareClick,
}) {
  return (
    <div className="board" style={{ '--board-size': boardSize }}>
      {squares.map((square, index) => (
        <Square
          key={index}
          value={square}
          multiplier={multipliers[index]}
          isWinningSquare={winningLine?.includes(index)}
          isShielded={shieldedSquares.includes(index)}
          isLocked={lockedSquares.includes(index)}
          isBoosted={visibleBoostedSquares.includes(index)}
          onSquareClick={() => onSquareClick(index)}
        />
      ))}
    </div>
  )
}
