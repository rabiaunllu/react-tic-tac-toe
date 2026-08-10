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

function getCellMultiplier(multipliers, index) {
  return multipliers?.[index] ?? 1
}

function getBestScoredIndex(candidates, getScore) {
  return candidates.reduce(
    (best, index) => {
      const score = getScore(index)

      if (score > best.score) {
        return { index, score }
      }

      return best
    },
    { index: null, score: Number.NEGATIVE_INFINITY }
  ).index
}

function hasPower(playerPowers, powerId) {
  return (playerPowers?.[powerId] ?? 0) > 0
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

function getMultipleThreatPositions(squares, boardSize, winLength, player, blockedIndexes = []) {
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)
  let bestCandidate = null
  let maxThreats = 0

  for (const index of emptyIndexes) {
    const testSquares = squares.slice()
    testSquares[index] = player

    const threats = getImmediateThreats({
      squares: testSquares,
      boardSize,
      winLength,
      player,
      blockedIndexes,
    })

    if (threats.length >= 2 && threats.length > maxThreats) {
      maxThreats = threats.length
      bestCandidate = index
    }
  }

  return bestCandidate
}

function getPositionalScore(index, squares, boardSize, winLength, multipliers, aiPlayer) {
  const lines = getBoardLines(boardSize, winLength)
  const cellMultiplier = getCellMultiplier(multipliers, index)

  // 1. Center Proximity Bonus
  let centerBonus = 0
  if (boardSize % 2 !== 0) {
    const centerIndex = Math.floor((boardSize * boardSize) / 2)
    if (index === centerIndex) {
      centerBonus = 15
    } else {
      const row = Math.floor(index / boardSize)
      const col = index % boardSize
      const centerRow = Math.floor(boardSize / 2)
      const centerCol = Math.floor(boardSize / 2)
      const dist = Math.abs(row - centerRow) + Math.abs(col - centerCol)
      if (dist === 1) centerBonus = 8
    }
  }

  // 2. Multiplier Value Bonus
  const multiplierBonus = cellMultiplier > 1 ? cellMultiplier * 10 : 0

  // 3. Strategic Line Potentials
  const lineScore = lines.reduce((total, line) => {
    if (!line.includes(index)) return total
    if (line.some((lineIndex) => squares[lineIndex] && squares[lineIndex] !== aiPlayer)) {
      return total
    }

    const aiStones = line.filter((lineIndex) => squares[lineIndex] === aiPlayer).length
    const totalLineMultiplier = line.reduce(
      (sum, lineIndex) => sum + getCellMultiplier(multipliers, lineIndex),
      0
    )

    return total + aiStones * 12 + totalLineMultiplier * 3
  }, 0)

  return centerBonus + multiplierBonus + lineScore
}

function getArenaStrategicMove({
  squares,
  boardSize,
  winLength,
  multipliers = {},
  blockedIndexes = [],
  aiPlayer = aiPlayerDefault,
}) {
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)

  if (emptyIndexes.length === 0) {
    return null
  }

  return getBestScoredIndex(emptyIndexes, (index) =>
    getPositionalScore(index, squares, boardSize, winLength, multipliers, aiPlayer)
  )
}

function getTacticalMove({
  squares,
  boardSize,
  winLength,
  aiPlayer,
  humanPlayer,
  blockedIndexes = [],
  multipliers,
}) {
  // 7-Seviyeli Taktiksel Karar Sistemi:
  // L1: Kendi Kazanma hamlesini yap
  // L2: Rakibin Kazanma hamlesini engelle
  // L3: Rakibin Çoklu Tehdidini (Super Move) engelle
  // L4: Kendi Çoklu Tehdidini oluştur
  // L5: Pozisyonel & Çarpan Değerlendirmeli Stratejik hamle
  // L6: Merkez / Köşe kontrolü
  // L7: Fallback
  return (
    findWinningMove(squares, boardSize, winLength, aiPlayer, blockedIndexes) ??
    findWinningMove(squares, boardSize, winLength, humanPlayer, blockedIndexes) ??
    getMultipleThreatPositions(squares, boardSize, winLength, humanPlayer, blockedIndexes) ??
    getMultipleThreatPositions(squares, boardSize, winLength, aiPlayer, blockedIndexes) ??
    getArenaStrategicMove({
      squares,
      boardSize,
      winLength,
      multipliers,
      blockedIndexes,
      aiPlayer,
    }) ??
    getCenterMove(squares, boardSize, blockedIndexes) ??
    getCornerMove(squares, boardSize, blockedIndexes) ??
    getRandomMove(squares, blockedIndexes)
  )
}

/**
 * Uyarlamalı Zorluk Seviyeleri (User Spec):
 * - Normal: 12%
 * - 1+ kazanma: 8%
 * - 3+ kazanma: 3% (Ölümcül Pro)
 * - Kaybedince (-1 ve altı): 35% (Geri dönüş şansı)
 */
function getAdaptiveRandomChance(humanWinStreak) {
  if (humanWinStreak >= 3) {
    return 0.03 // 3+ kazanma: 3% (2.7x daha ölümcül)
  }

  if (humanWinStreak >= 1) {
    return 0.08 // 1+ kazanma: 8% (2.25x daha agresif)
  }

  if (humanWinStreak <= -1) {
    return 0.35 // Kaybedince: 35% (Oyuncuya şans veriyor)
  }

  return 0.12 // Normal: 12% (2.5x me tutarlı)
}

export function getAdaptiveAiMove({
  squares,
  boardSize,
  winLength,
  humanWinStreak,
  blockedIndexes = [],
  multipliers,
  aiPlayer = 'O',
  humanPlayer = 'X',
}) {
  // L1: 100% priority win
  const winningMove = findWinningMove(
    squares,
    boardSize,
    winLength,
    aiPlayer,
    blockedIndexes
  )

  if (winningMove !== null) {
    return winningMove
  }

  // L2: 100% priority block
  const blockingMove = findWinningMove(
    squares,
    boardSize,
    winLength,
    humanPlayer,
    blockedIndexes
  )

  if (blockingMove !== null) {
    return blockingMove
  }

  // L3: 100% priority block multiple threats (Super Move)
  const multipleThreatBlock = getMultipleThreatPositions(
    squares,
    boardSize,
    winLength,
    humanPlayer,
    blockedIndexes
  )

  if (multipleThreatBlock !== null) {
    return multipleThreatBlock
  }

  // Adaptive variance check
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
    multipliers,
  })
}

export function getArenaAiPowerAction({
  squares,
  boardSize,
  winLength,
  playerPowers,
  humanPowers = {},
  shieldedSquares = [],
  boostedSquares = [],
  blockedIndexes = [],
  aiTrapIndexes = [],
  multipliers = {},
  aiPlayer = aiPlayerDefault,
  humanPlayer = humanPlayerDefault,
}) {
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)
  const immediateHumanWinTargets = new Set(
    getImmediateThreats({
      squares,
      boardSize,
      winLength,
      player: humanPlayer,
      blockedIndexes,
    }).flatMap(({ emptyIndexes: threatEmptyIndexes }) => threatEmptyIndexes)
  )
  const hasImmediateHumanWin = immediateHumanWinTargets.size > 0
  const humanHasBomb = hasPower(humanPowers, 'bomb')
  const candidates = []

  // A power is an alternative turn action, not a pre-selected priority.  Evaluate
  // it beside every legal stone placement so the bot can preserve resources.
  emptyIndexes.forEach((index) => {
    candidates.push({ type: 'move', index })

    if (hasPower(playerPowers, 'boost') && !boostedSquares.includes(index)) {
      candidates.push({ type: 'boost', index })
    }

    // If X is expected to place here to win, occupy it with O instead of
    // spending a trap: the same square is permanently denied without using a power.
    if (
      hasPower(playerPowers, 'trap') &&
      !aiTrapIndexes.includes(index) &&
      (!immediateHumanWinTargets.has(index) || humanHasBomb)
    ) {
      candidates.push({ type: 'trap', index })
    }
  })

  if (hasPower(playerPowers, 'bomb')) {
    squares.forEach((square, index) => {
      if (square === humanPlayer && !shieldedSquares.includes(index)) {
        candidates.push({ type: 'bomb', index })
      }
    })
  }

  if (hasPower(playerPowers, 'shield')) {
    squares.forEach((square, index) => {
      if (square === aiPlayer && !shieldedSquares.includes(index)) {
        candidates.push({ type: 'shield', index })
      }
    })
  }

  const scoredCandidates = candidates
    .map((candidate) => {
      const nextSquares = squares.slice()
      const nextBlockedIndexes = [...blockedIndexes]

      if (candidate.type === 'move' || candidate.type === 'boost') {
        nextSquares[candidate.index] = aiPlayer
      }

      if (candidate.type === 'bomb') {
        nextSquares[candidate.index] = null
        nextBlockedIndexes.push(candidate.index)
      }

      // A trap makes the target unusable for the opponent's immediate winning move.
      if (candidate.type === 'trap') {
        nextBlockedIndexes.push(candidate.index)
      }

      const opponentCanWin =
        findWinningMove(
          nextSquares,
          boardSize,
          winLength,
          humanPlayer,
          nextBlockedIndexes
        ) !== null

      // When the opponent has a one-turn win, reject every action that leaves it
      // available. This guard deliberately runs before heuristics and power value.
      if (hasImmediateHumanWin && opponentCanWin) {
        return null
      }

      const aiWins = calculateWinner(nextSquares, boardSize, winLength) === aiPlayer
      const bombVulnerableBlock =
        !aiWins &&
        humanHasBomb &&
        hasImmediateHumanWin &&
        (candidate.type === 'move' || candidate.type === 'boost') &&
        immediateHumanWinTargets.has(candidate.index)
      const ownThreats = getImmediateThreats({
        squares: nextSquares,
        boardSize,
        winLength,
        player: aiPlayer,
        blockedIndexes: nextBlockedIndexes,
      }).length
      const humanThreats = getImmediateThreats({
        squares: nextSquares,
        boardSize,
        winLength,
        player: humanPlayer,
        blockedIndexes: nextBlockedIndexes,
      }).length
      const positionalScore =
        candidate.type === 'move' || candidate.type === 'boost'
          ? getPositionalScore(
              candidate.index,
              nextSquares,
              boardSize,
              winLength,
              multipliers,
              aiPlayer
            )
          : 0
      const multiplierValue = getCellMultiplier(multipliers, candidate.index)
      const tacticalPowerValue = getBoardLines(boardSize, winLength).reduce(
        (bestValue, line) => {
          if (!line.includes(candidate.index)) {
            return bestValue
          }

          const aiStones = line.filter((lineIndex) => nextSquares[lineIndex] === aiPlayer).length
          const humanStones = line.filter((lineIndex) => nextSquares[lineIndex] === humanPlayer).length
          const lineMultiplier = line.reduce(
            (total, lineIndex) => total + getCellMultiplier(multipliers, lineIndex),
            0
          )

          if (candidate.type === 'bomb' && aiStones === 0) {
            return Math.max(
              bestValue,
              Math.max(0, humanStones - 1) * 110 + multiplierValue * 10
            )
          }

          if (candidate.type === 'shield' && humanStones === 0) {
            return Math.max(
              bestValue,
              Math.max(0, aiStones - 1) * 100 + lineMultiplier * 4
            )
          }

          if (candidate.type === 'trap' && aiStones === 0) {
            return Math.max(bestValue, humanStones * 42 + multiplierValue * 8)
          }

          return bestValue
        },
        0
      )
      const actionCost = {
        move: 0,
        boost: 12,
        bomb: 42,
        shield: 28,
        trap: 24,
      }[candidate.type]

      return {
        ...candidate,
        score:
          (aiWins ? 100000 : 0) +
          positionalScore +
          tacticalPowerValue +
          ownThreats * 340 -
          humanThreats * 460 +
          (candidate.type === 'boost' ? multiplierValue * 18 : 0) -
          actionCost -
          (bombVulnerableBlock ? 900 : 0) -
          (opponentCanWin ? 10000 : 0),
      }
    })
    .filter(Boolean)

  if (scoredCandidates.length === 0) {
    // This only occurs with an impossible or already-finished board state.
    return null
  }

  return scoredCandidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best
  )
}
