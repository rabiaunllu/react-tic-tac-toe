export function createEmptyBoard(boardSize) {
  return Array(boardSize * boardSize).fill(null)
}

export function getWinningLine(squares, boardSize = 3, winLength = 3) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]

  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      const startIndex = row * boardSize + column
      const player = squares[startIndex]

      if (!player) {
        continue
      }

      for (const [rowStep, columnStep] of directions) {
        const endRow = row + rowStep * (winLength - 1)
        const endColumn = column + columnStep * (winLength - 1)

        if (
          endRow < 0 ||
          endRow >= boardSize ||
          endColumn < 0 ||
          endColumn >= boardSize
        ) {
          continue
        }

        const line = Array.from({ length: winLength }, (_, offset) => {
          const lineRow = row + rowStep * offset
          const lineColumn = column + columnStep * offset
          return lineRow * boardSize + lineColumn
        })

        if (line.every((index) => squares[index] === player)) {
          return line
        }
      }
    }
  }

  return null
}

export function calculateWinner(squares, boardSize = 3, winLength = 3) {
  const winningLine = getWinningLine(squares, boardSize, winLength)

  if (!winningLine) {
    return null
  }

  return squares[winningLine[0]]
}

export function isBoardFull(squares) {
  return squares.every(Boolean)
}

export function createBoardMultipliers(boardSize = 3) {
  const cellIndexes = [...Array(boardSize * boardSize).keys()]
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
