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
  const lines = getBoardLines(boardSize, winLength)
  const initialState = {
    squares: squares.slice(),
    turn: aiPlayer,
    powers: { [aiPlayer]: { ...playerPowers }, [humanPlayer]: { ...humanPowers } },
    shielded: [...shieldedSquares],
    boosted: [...boostedSquares],
    blocked: [...blockedIndexes],
    // The AI knows its own black holes.  The opponent's black holes deliberately
    // remain unknown rather than leaking hidden UI state into the bot.
    aiTraps: [...aiTrapIndexes],
  }

  const otherPlayer = (player) => (player === aiPlayer ? humanPlayer : aiPlayer)
  const isShielded = (state, index) => state.shielded.includes(index)
  const empty = (state) => getEmptyIndexes(state.squares, state.blocked)
  const maxActionsPerNode = boardSize >= 5 ? 28 : boardSize === 4 ? 22 : 36

  function actionsFor(state) {
    const player = state.turn
    const opponent = otherPlayer(player)
    const available = empty(state)
    const actions = available.map((index) => ({ type: 'move', index }))

    if (hasPower(state.powers[player], 'boost')) {
      available
        .filter((index) => !state.boosted.includes(index))
        .forEach((index) => actions.push({ type: 'boost', index }))
    }

    if (hasPower(state.powers[player], 'trap')) {
      available
        .filter((index) => !(player === aiPlayer && state.aiTraps.includes(index)))
        .forEach((index) => actions.push({ type: 'trap', index }))
    }

    if (hasPower(state.powers[player], 'bomb')) {
      state.squares.forEach((square, index) => {
        if (square === opponent && !isShielded(state, index)) actions.push({ type: 'bomb', index })
      })
    }

    // Shield does not end the turn.  Model it with its follow-up placement so it
    // competes fairly with a normal move instead of being valued as a lost turn.
    if (hasPower(state.powers[player], 'shield')) {
      state.squares.forEach((square, shieldIndex) => {
        if (square !== player || isShielded(state, shieldIndex)) return
        available.forEach((moveIndex) => {
          actions.push({ type: 'shield', index: shieldIndex, followUpMove: moveIndex })
        })
      })
    }

    return actions
  }

  function applyAction(state, action) {
    const player = state.turn
    const next = {
      ...state,
      squares: state.squares.slice(),
      powers: { ...state.powers, [player]: { ...state.powers[player] } },
      shielded: [...state.shielded],
      boosted: [...state.boosted],
      aiTraps: [...state.aiTraps],
      // Locks/freeze only constrain the immediately following turn in the UI.
      blocked: [],
      turn: otherPlayer(player),
    }

    if (action.type === 'move' || action.type === 'boost') {
      next.squares[action.index] = player
      if (action.type === 'boost') {
        next.powers[player].boost -= 1
        next.boosted.push(action.index)
      }
    } else if (action.type === 'bomb') {
      next.squares[action.index] = null
      next.shielded = next.shielded.filter((index) => index !== action.index)
      next.boosted = next.boosted.filter((index) => index !== action.index)
      next.powers[player].bomb -= 1
      next.blocked = [action.index]
    } else if (action.type === 'trap') {
      next.powers[player].trap -= 1
      if (player === aiPlayer) next.aiTraps.push(action.index)
    } else if (action.type === 'shield') {
      next.powers[player].shield -= 1
      next.shielded.push(action.index)
      next.squares[action.followUpMove] = player
    }

    return next
  }

  function getForkCount(state, player) {
    let forks = 0
    for (const index of empty(state)) {
      const nextSquares = state.squares.slice()
      nextSquares[index] = player
      const threats = getImmediateThreats({
        squares: nextSquares,
        boardSize,
        winLength,
        player,
        blockedIndexes: state.blocked,
      })
      if (threats.length >= 2) forks += 1
    }
    return forks
  }

  function evaluate(state, plyFromRoot) {
    const winner = calculateWinner(state.squares, boardSize, winLength)
    // Prefer faster wins and defer unavoidable losses.
    if (winner === aiPlayer) return 1000000 - plyFromRoot
    if (winner === humanPlayer) return -1000000 + plyFromRoot

    let value = 0
    for (const line of lines) {
      const aiCount = line.filter((index) => state.squares[index] === aiPlayer).length
      const humanCount = line.filter((index) => state.squares[index] === humanPlayer).length
      if (aiCount && humanCount) continue

      const multiplierValue = line.reduce(
        (total, index) => total + getCellMultiplier(multipliers, index),
        0
      )
      if (aiCount) value += 7 ** aiCount + multiplierValue * aiCount
      if (humanCount) value -= 7 ** humanCount + multiplierValue * humanCount
    }

    const aiThreats = getImmediateThreats({
      squares: state.squares, boardSize, winLength, player: aiPlayer, blockedIndexes: state.blocked,
    }).length
    const humanThreats = getImmediateThreats({
      squares: state.squares, boardSize, winLength, player: humanPlayer, blockedIndexes: state.blocked,
    }).length
    value += (aiThreats - humanThreats) * 9000

    // Two independent winning squares are qualitatively different from one:
    // without a matching power response the defender can only close one of them.
    if (aiThreats >= 2) value += 220000
    if (humanThreats >= 2) value -= 220000

    // Also value the *ability to create* a fork next turn.  The deep search below
    // proves it on small boards; this term protects 5x5 positions at the horizon.
    value += (getForkCount(state, aiPlayer) - getForkCount(state, humanPlayer)) * 26000
    value += state.aiTraps.length * 35
    return value
  }

  function orderActions(state, actions, plyFromRoot) {
    const maximizing = state.turn === aiPlayer
    return actions
      .map((action) => ({ action, score: evaluate(applyAction(state, action), plyFromRoot + 1) }))
      .sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score))
      .slice(0, maxActionsPerNode)
      .map(({ action }) => action)
  }

  function search(state, depth, alpha, beta, plyFromRoot) {
    const winner = calculateWinner(state.squares, boardSize, winLength)
    if (winner || depth === 0) return evaluate(state, plyFromRoot)

    const actions = actionsFor(state)
    if (actions.length === 0) return evaluate(state, plyFromRoot)
    // Search tactical/terminal candidates first; this makes alpha-beta effective.
    const maximizing = state.turn === aiPlayer
    const orderedActions = orderActions(state, actions, plyFromRoot)

    let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    for (const action of orderedActions) {
      const score = search(applyAction(state, action), depth - 1, alpha, beta, plyFromRoot + 1)
      if (maximizing) {
        best = Math.max(best, score)
        alpha = Math.max(alpha, best)
      } else {
        best = Math.min(best, score)
        beta = Math.min(beta, best)
      }
      if (alpha >= beta) break
    }
    return best
  }

  const rootActions = orderActions(initialState, actionsFor(initialState), 0)
  if (rootActions.length === 0) return null

  // A fork is only proven after four plies: AI action, opponent fork, AI's
  // attempted block, opponent's remaining winning move.  3x3 and 4x4 can
  // afford that exact tactical horizon; 5x5 remains bounded for responsiveness.
  const searchDepth = boardSize <= 4 ? 3 : 2
  const ranked = rootActions.map((action) => ({
    action,
    score: search(
      applyAction(initialState, action),
      searchDepth,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      1
    ),
  }))
  ranked.sort((a, b) => b.score - a.score)
  return ranked[0].action
}
