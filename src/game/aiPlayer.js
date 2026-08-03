import { calculateWinner } from './gameLogic'

function getEmptyIndexes(squares) {
  return squares
    .map((square, index) => (square ? null : index))
    .filter((index) => index !== null)
}

function getRandomMove(squares) {
  const emptyIndexes = getEmptyIndexes(squares)

  if (emptyIndexes.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * emptyIndexes.length)
  return emptyIndexes[randomIndex]
}

function findWinningMove(squares, boardSize, winLength, player) {
  const emptyIndexes = getEmptyIndexes(squares)

  return (
    emptyIndexes.find((index) => {
      const testSquares = squares.slice()
      testSquares[index] = player

      return calculateWinner(testSquares, boardSize, winLength) === player
    }) ?? null
  )
}

function getCenterMove(squares, boardSize) {
  if (boardSize % 2 === 0) {
    return null
  }

  const centerIndex = Math.floor((boardSize * boardSize) / 2)
  return squares[centerIndex] ? null : centerIndex
}

function getCornerMove(squares, boardSize) {
  const lastRowStart = boardSize * (boardSize - 1)
  const corners = [0, boardSize - 1, lastRowStart, boardSize * boardSize - 1]
  const availableCorners = corners.filter((index) => !squares[index])

  if (availableCorners.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * availableCorners.length)
  return availableCorners[randomIndex]
}

function getTacticalMove({
  squares,
  boardSize,
  winLength,
  aiPlayer,
  humanPlayer,
}) {
  return (
    findWinningMove(squares, boardSize, winLength, aiPlayer) ??
    findWinningMove(squares, boardSize, winLength, humanPlayer) ??
    getCenterMove(squares, boardSize) ??
    getCornerMove(squares, boardSize) ??
    getRandomMove(squares)
  )
}

function getAdaptiveRandomChance(humanWinStreak) {
  if (humanWinStreak >= 3) {
    return 0.08
  }

  if (humanWinStreak >= 1) {
    return 0.18
  }

  if (humanWinStreak <= -3) {
    return 0.6
  }

  if (humanWinStreak <= -1) {
    return 0.45
  }

  return 0.3
}
export function getAdaptiveAiMove({
  squares,
  boardSize,
  winLength,
  humanWinStreak,
  aiPlayer = 'O',
  humanPlayer = 'X',
}) {
  const randomChance = getAdaptiveRandomChance(humanWinStreak)

  if (Math.random() < randomChance) {
    return getRandomMove(squares)
  }

  return getTacticalMove({
    squares,
    boardSize,
    winLength,
    aiPlayer,
    humanPlayer,
  })
}