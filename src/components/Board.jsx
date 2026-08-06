import Square from './Square'

export default function Board({
  boardSize,
  squares,
  multipliers,
  winningLine,
  shieldedSquares,
  lockedSquares,
  frozenSquares = [],
  visibleBoostedSquares,
  traps = [],
  currentPlayer,
  visibleTrapOwner = currentPlayer,
  blackHoleEventIndex,
  onSquareClick,
}) {
  const supportedBoardSizes = [3, 4, 5]
  const safeBoardSize = supportedBoardSizes.includes(boardSize) ? boardSize : 3

  return (
    <div className={`board board-size-${safeBoardSize}`}>
      {squares.map((square, index) => {
        const visibleTrap = traps.find(
          (trap) => trap.index === index && trap.owner === visibleTrapOwner
        )
        const isBlackHoleTriggered = blackHoleEventIndex === index

        return (
          <Square
            key={index}
            value={square}
            multiplier={multipliers[index]}
            isWinningSquare={winningLine?.includes(index)}
            isShielded={shieldedSquares.includes(index)}
            isLocked={lockedSquares.includes(index)}
            isFrozen={frozenSquares.includes(index)}
            isBoosted={visibleBoostedSquares.includes(index)}
            isTrapped={Boolean(visibleTrap)}
            isBlackHoleTriggered={isBlackHoleTriggered}
            onSquareClick={() => onSquareClick(index)}
          />
        )
      })}
    </div>
  )
}
