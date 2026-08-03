import { calculateWinner } from './gameLogic'

const aiPlayerDefault = 'O'
const humanPlayerDefault = 'X'

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

function getBoardLines(boardSize, winLength) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  const lines = []

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

        lines.push(
          Array.from({ length: winLength }, (_, offset) => {
            const lineRow = row + rowStep * offset
            const lineColumn = column + columnStep * offset
            return lineRow * boardSize + lineColumn
          })
        )
      }
    }
  }

  return lines
}

function getImmediateThreats({
  squares,
  boardSize,
  winLength,
  player,
  blockedIndexes = [],
}) {
  return getBoardLines(boardSize, winLength)
    .map((line) => {
      const playerIndexes = line.filter((index) => squares[index] === player)
      const emptyIndexes = line.filter(
        (index) => !squares[index] && !blockedIndexes.includes(index)
      )

      return {
        line,
        playerIndexes,
        emptyIndexes,
      }
    })
    .filter(
      ({ playerIndexes, emptyIndexes }) =>
        playerIndexes.length === winLength - 1 && emptyIndexes.length === 1
    )
}

function getNearLines({
  squares,
  boardSize,
  winLength,
  player,
  blockedIndexes = [],
}) {
  return getBoardLines(boardSize, winLength)
    .map((line) => {
      const playerIndexes = line.filter((index) => squares[index] === player)
      const opponentIndexes = line.filter((index) => squares[index] && squares[index] !== player)
      const emptyIndexes = line.filter(
        (index) => !squares[index] && !blockedIndexes.includes(index)
      )

      return {
        line,
        playerIndexes,
        opponentIndexes,
        emptyIndexes,
      }
    })
    .filter(
      ({ playerIndexes, opponentIndexes, emptyIndexes }) =>
        opponentIndexes.length === 0 &&
        playerIndexes.length >= Math.max(1, winLength - 2) &&
        emptyIndexes.length > 0
    )
    .sort((firstLine, secondLine) => secondLine.playerIndexes.length - firstLine.playerIndexes.length)
}

function getAdaptivePowerChance(humanWinStreak) {
  if (humanWinStreak >= 2) {
    return 0.72
  }

  if (humanWinStreak <= -2) {
    return 0.22
  }

  return 0.45
}

function hasPower(playerPowers, powerId) {
  return (playerPowers?.[powerId] ?? 0) > 0
}

function getAiBoostTarget({
  squares,
  boardSize,
  winLength,
  boostedSquares = [],
  blockedIndexes = [],
  aiPlayer = aiPlayerDefault,
}) {
  const winningMove = findWinningMove(squares, boardSize, winLength, aiPlayer, blockedIndexes)

  if (
    winningMove === null ||
    boostedSquares.includes(winningMove) ||
    blockedIndexes.includes(winningMove)
  ) {
    return null
  }

  return winningMove
}

function getAiBombTarget({
  squares,
  boardSize,
  winLength,
  shieldedSquares = [],
  blockedIndexes = [],
  humanPlayer = humanPlayerDefault,
}) {
  const threats = getImmediateThreats({
    squares,
    boardSize,
    winLength,
    player: humanPlayer,
    blockedIndexes,
  })

  for (const threat of threats) {
    const target = threat.playerIndexes.find(
      (index) => !shieldedSquares.includes(index)
    )

    if (target !== undefined) {
      return target
    }
  }

  return null
}

function getAiShieldTarget({
  squares,
  boardSize,
  winLength,
  shieldedSquares = [],
  blockedIndexes = [],
  aiPlayer = aiPlayerDefault,
}) {
  const nearLines = getNearLines({
    squares,
    boardSize,
    winLength,
    player: aiPlayer,
    blockedIndexes,
  })

  for (const nearLine of nearLines) {
    const target = nearLine.playerIndexes.find(
      (index) => !shieldedSquares.includes(index) && !blockedIndexes.includes(index)
    )

    if (target !== undefined) {
      return target
    }
  }

  return null
}

function getAiTrapTarget({
  squares,
  boardSize,
  winLength,
  blockedIndexes = [],
  aiTrapIndexes = [],
  humanPlayer = humanPlayerDefault,
}) {
  const threats = getImmediateThreats({
    squares,
    boardSize,
    winLength,
    player: humanPlayer,
    blockedIndexes,
  })
  const threatTarget = threats
    .map(({ emptyIndexes }) => emptyIndexes[0])
    .find(
      (index) =>
        index !== undefined &&
        !squares[index] &&
        !blockedIndexes.includes(index) &&
        !aiTrapIndexes.includes(index)
    )

  if (threatTarget !== undefined) {
    return threatTarget
  }

  const centerTarget = getCenterMove(squares, boardSize, blockedIndexes)

  if (centerTarget !== null && !aiTrapIndexes.includes(centerTarget)) {
    return centerTarget
  }

  const lastRowStart = boardSize * (boardSize - 1)
  const corners = [0, boardSize - 1, lastRowStart, boardSize * boardSize - 1]
  const cornerTarget = corners.find(
    (index) =>
      !squares[index] &&
      !blockedIndexes.includes(index) &&
      !aiTrapIndexes.includes(index)
  )

  return cornerTarget ?? null
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

export function getArenaAiPowerAction({
  squares,
  boardSize,
  winLength,
  humanWinStreak,
  playerPowers,
  shieldedSquares = [],
  boostedSquares = [],
  blockedIndexes = [],
  aiTrapIndexes = [],
  aiPlayer = aiPlayerDefault,
  humanPlayer = humanPlayerDefault,
}) {
  if (Math.random() > getAdaptivePowerChance(humanWinStreak)) {
    return null
  }

  const bombTarget = hasPower(playerPowers, 'bomb')
    ? getAiBombTarget({
        squares,
        boardSize,
        winLength,
        shieldedSquares,
        blockedIndexes,
        humanPlayer,
      })
    : null

  if (bombTarget !== null) {
    return { type: 'bomb', index: bombTarget }
  }

  const boostTarget = hasPower(playerPowers, 'boost')
    ? getAiBoostTarget({
        squares,
        boardSize,
        winLength,
        boostedSquares,
        blockedIndexes,
        aiPlayer,
      })
    : null

  if (boostTarget !== null) {
    return { type: 'boost', index: boostTarget }
  }

  const shieldTarget = hasPower(playerPowers, 'shield')
    ? getAiShieldTarget({
        squares,
        boardSize,
        winLength,
        shieldedSquares,
        blockedIndexes,
        aiPlayer,
      })
    : null

  if (shieldTarget !== null) {
    return { type: 'shield', index: shieldTarget }
  }

  const trapTarget = hasPower(playerPowers, 'trap')
    ? getAiTrapTarget({
        squares,
        boardSize,
        winLength,
        blockedIndexes,
        aiTrapIndexes,
        humanPlayer,
      })
    : null

  if (trapTarget !== null) {
    return { type: 'trap', index: trapTarget }
  }

  return null
}
