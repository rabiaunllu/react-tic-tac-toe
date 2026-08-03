import { calculateWinner } from './gameLogic'

function getEmptyIndexes(squares, blockedIndexes = []) {
  return squares
    .map((square, index) =>
      square || blockedIndexes.includes(index) ? null : index
    )
    .filter((index) => index !== null)
}

function getRandomMove(squares, blockedIndexes = []) {
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)

  if (emptyIndexes.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * emptyIndexes.length)
  return emptyIndexes[randomIndex]
}
function findWinningMove(squares, boardSize, winLength, player, blockedIndexes = []) {
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)

  return (
    emptyIndexes.find((index) => {
      const testSquares = squares.slice()
      testSquares[index] = player

      return calculateWinner(testSquares, boardSize, winLength) === player
    }) ?? null
  )
}
function getCenterMove(squares, boardSize, blockedIndexes = []) {
  if (boardSize % 2 === 0) {
    return null
  }

  const centerIndex = Math.floor((boardSize * boardSize) / 2)

  if (blockedIndexes.includes(centerIndex)) {
    return null
  }

  return squares[centerIndex] ? null : centerIndex
}

function getCornerMove(squares, boardSize, blockedIndexes = []) {
  const lastRowStart = boardSize * (boardSize - 1)
  const corners = [0, boardSize - 1, lastRowStart, boardSize * boardSize - 1]
  const availableCorners = corners.filter(
    (index) => !squares[index] && !blockedIndexes.includes(index)
  )

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
  blockedIndexes = [],
}) {
  return (
    findWinningMove(squares, boardSize, winLength, aiPlayer, blockedIndexes) ??
    findWinningMove(squares, boardSize, winLength, humanPlayer, blockedIndexes) ??
    getCenterMove(squares, boardSize, blockedIndexes) ??
    getCornerMove(squares, boardSize, blockedIndexes) ??
    getRandomMove(squares, blockedIndexes)
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
  blockedIndexes = [],
  aiPlayer = 'O',
  humanPlayer = 'X',
}) {
  const randomChance = getAdaptiveRandomChance(humanWinStreak)

  if (Math.random() < randomChance) {
    return getRandomMove(squares, blockedIndexes)
  }

  return getTacticalMove({
    squares,
    boardSize,
    winLength,
    aiPlayer,
    humanPlayer,
    blockedIndexes,
  })
}
