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
  const supportedBoardSizes = [3, 4, 5]
  const safeBoardSize = supportedBoardSizes.includes(boardSize) ? boardSize : 3

  return (
    <div className={`board board-size-${safeBoardSize}`}>
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
