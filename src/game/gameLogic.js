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
  const multiplierConfigs = {
    3: [2, 3],
    4: [2, 2, 3],
    5: [2, 2, 3, 3],
  }

  const values = multiplierConfigs[boardSize] || [2, 2, 3]
  const cellIndexes = [...Array(boardSize * boardSize).keys()]
  const shuffledIndexes = cellIndexes.sort(() => Math.random() - 0.5)

  const result = {}
  values.forEach((value, idx) => {
    if (idx < shuffledIndexes.length) {
      result[shuffledIndexes[idx]] = value
    }
  })

  return result
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
    const cellScore = multipliers?.[cellIndex] || 1
    const boostMultiplier = boostedSquares.includes(cellIndex) ? 2 : 1

    return total + cellScore * boostMultiplier
  }, 0)
}

export function hasNearMissThreat(squares, boardSize = 3, winLength = 3, player = 'X') {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]

  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
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

        let playerCount = 0
        let emptyCount = 0

        for (let offset = 0; offset < winLength; offset += 1) {
          const lineRow = row + rowStep * offset
          const lineColumn = column + columnStep * offset
          const val = squares[lineRow * boardSize + lineColumn]
          if (val === player) {
            playerCount += 1
          } else if (!val) {
            emptyCount += 1
          }
        }

        if (playerCount === winLength - 1 && emptyCount === 1) {
          return true
        }
      }
    }
  }

  return false
}

