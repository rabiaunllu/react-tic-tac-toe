export function getWinningLine(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  return lines.find(([a, b, c]) => {
    return squares[a] && squares[a] === squares[b] && squares[a] === squares[c]
  }) || null
}

export function calculateWinner(squares) {
  const winningLine = getWinningLine(squares)

  if (!winningLine) {
    return null
  }

  return squares[winningLine[0]]
}

export function isBoardFull(squares) {
  return squares.every(Boolean)
}

export function createBoardMultipliers() {
  const cellIndexes = [...Array(9).keys()]
  const shuffledIndexes = cellIndexes.sort(() => Math.random() - 0.5)

  return {
    [shuffledIndexes[0]]: 2,
    [shuffledIndexes[1]]: 3,
  }
}

export function calculateRoundScore(
  winningLine,
  multipliers,
  multipliersEnabled,
  boostedSquares = []
) {
  if (!winningLine || !multipliersEnabled) {
    return 1
  }

  return winningLine.reduce((total, cellIndex) => {
    const cellScore = multipliers[cellIndex] || 1
    const boostMultiplier = boostedSquares.includes(cellIndex) ? 2 : 1

    return total + cellScore * boostMultiplier
  }, 0)
}
