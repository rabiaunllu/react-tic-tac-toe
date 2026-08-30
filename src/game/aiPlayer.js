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
  if (emptyIndexes.length === 0) return null
  return emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)]
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
    [0, 1],  // Yatay
    [1, 0],  // Dikey
    [1, 1],  // Ana Köşegen
    [1, -1], // Ters Köşegen
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

      return { line, playerIndexes, emptyIndexes }
    })
    .filter(
      ({ playerIndexes, emptyIndexes }) =>
        playerIndexes.length === winLength - 1 && emptyIndexes.length === 1
    )
}

function getCellMultiplier(multipliers, index) {
  return multipliers?.[index] ?? 1
}

function hasPower(playerPowers, powerId) {
  return (playerPowers?.[powerId] ?? 0) > 0
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

function getCenterIndex(boardSize) {
  if (boardSize % 2 !== 0) {
    return Math.floor((boardSize * boardSize) / 2)
  }
  const mid = boardSize / 2
  return (mid - 1) * boardSize + (mid - 1)
}

function getPositionalScore(index, squares, boardSize, winLength, multipliers, aiPlayer) {
  const lines = getBoardLines(boardSize, winLength)
  const cellMultiplier = getCellMultiplier(multipliers, index)

  // 1. MERKEZ HAKİMİYETİ BONUSU (Tic-Tac-Toe'da Merkez = Hayatidir)
  let centerBonus = 0
  const center = (boardSize - 1) / 2
  const row = Math.floor(index / boardSize)
  const col = index % boardSize
  const dist = Math.abs(row - center) + Math.abs(col - center)
  if (dist === 0) {
    centerBonus = 120 // Tam merkez karesi
  } else if (dist === 1) {
    centerBonus = 40  // Merkeze komşu kareler
  }

  // 2. Çarpan Değeri Bonusu
  const multiplierBonus = cellMultiplier > 1 ? cellMultiplier * 10 : 0

  // 3. Stratejik Hat Potansiyeli
  const lineScore = lines.reduce((total, line) => {
    if (!line.includes(index)) return total
    if (line.some((lineIndex) => squares[lineIndex] && squares[lineIndex] !== aiPlayer)) {
      return total
    }

    const aiStones = line.filter((lineIndex) => squares[lineIndex] === aiPlayer).length
    return total + aiStones * 20 + 5
  }, 0)

  return centerBonus + multiplierBonus + lineScore
}

export function getAdaptiveAiMove({
  squares,
  boardSize,
  winLength,
  humanWinStreak = 0,
  blockedIndexes = [],
  multipliers,
  aiPlayer = aiPlayerDefault,
  humanPlayer = humanPlayerDefault,
}) {
  // DGD (Dynamic Game Difficulty) - Oyuncu kaybediyorsa tolerans tanı
  if (humanWinStreak <= -1 && Math.random() < 0.25) {
    const randomMove = getRandomMove(squares, blockedIndexes)
    if (randomMove !== null) return randomMove
  }

  // L1: Kendi Kazanma Hamlesi
  const winningMove = findWinningMove(squares, boardSize, winLength, aiPlayer, blockedIndexes)
  if (winningMove !== null) return winningMove

  // L2: Rakibin Kazanma Hamlesini KESİN Bloke Et
  const blockingMove = findWinningMove(squares, boardSize, winLength, humanPlayer, blockedIndexes)
  if (blockingMove !== null) return blockingMove

  // L3: Rakibin Çift Taraflı Tehdidini (Fork) Engelle
  const multipleThreatBlock = getMultipleThreatPositions(squares, boardSize, winLength, humanPlayer, blockedIndexes)
  if (multipleThreatBlock !== null) return multipleThreatBlock

  // L4: Kendi Çift Taraflı Tehdidini (Fork) Kur
  const botFork = getMultipleThreatPositions(squares, boardSize, winLength, aiPlayer, blockedIndexes)
  if (botFork !== null) return botFork

  // L5: Merkez Kareyi Ele Geçir (Eğer boşsa)
  const centerIdx = getCenterIndex(boardSize)
  if (!squares[centerIdx] && !blockedIndexes.includes(centerIdx)) {
    return centerIdx
  }

  // L6: Pozisyonel ve Stratejik Hamle
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)
  if (emptyIndexes.length === 0) return null

  let bestIndex = emptyIndexes[0]
  let bestScore = -Infinity

  for (const index of emptyIndexes) {
    const score = getPositionalScore(index, squares, boardSize, winLength, multipliers, aiPlayer)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestIndex
}

/**
 * ARENA AI POWER & MOVE DECISION ENGINE
 */
export function getArenaAiPowerAction({
  squares,
  boardSize,
  winLength,
  playerPowers = {},
  humanPowers = {},
  shieldedSquares = [],
  boostedSquares = [],
  blockedIndexes = [],
  aiTrapIndexes = [],
  multipliers = {},
  aiPlayer = aiPlayerDefault,
  humanPlayer = humanPlayerDefault,
}) {
  const isShielded = (state, index) => state.shielded.includes(index)
  const empty = (state) => getEmptyIndexes(state.squares, state.blocked)

  const initialState = {
    squares: squares.slice(),
    turn: aiPlayer,
    powers: {
      [aiPlayer]: { bomb: 0, shield: 0, trap: 0, freeze: 0, vampire: 0, boost: 0, ...playerPowers },
      [humanPlayer]: { bomb: 0, shield: 0, trap: 0, freeze: 0, vampire: 0, boost: 0, ...humanPowers },
    },
    shielded: [...shieldedSquares],
    boosted: [...boostedSquares],
    blocked: [...blockedIndexes],
    aiTraps: [...aiTrapIndexes],
  }

  // 1. ANINDA KAZANMA HAMLESİ
  const instantWin = findWinningMove(initialState.squares, boardSize, winLength, aiPlayer, initialState.blocked)
  if (instantWin !== null) {
    return { type: 'move', index: instantWin }
  }

  // 2. TACTICAL BOMB STRIKE: Rakibin taşını silerek anında maç kazanma
  if (hasPower(initialState.powers[aiPlayer], 'bomb')) {
    for (let i = 0; i < initialState.squares.length; i++) {
      if (initialState.squares[i] === humanPlayer && !isShielded(initialState, i)) {
        const testSquares = initialState.squares.slice()
        testSquares[i] = null
        const winAfterBomb = findWinningMove(testSquares, boardSize, winLength, aiPlayer, [i])
        if (winAfterBomb !== null) {
          return { type: 'bomb', index: i }
        }
      }
    }
  }

  // 3. RAKİBİN 2'Lİ SERİSİNİ BOMBALA VEYA BLOKE ET:
  // Eğer rakip 2 taş dizmişse ve botun bombası varsa -> Rakibin taşını patlat!
  const humanThreats = getImmediateThreats({
    squares: initialState.squares,
    boardSize,
    winLength,
    player: humanPlayer,
    blockedIndexes: initialState.blocked,
  })

  if (humanThreats.length > 0) {
    // Rakip tehdidini patlatabilecek bombamız var mı?
    if (hasPower(initialState.powers[aiPlayer], 'bomb')) {
      const threatLine = humanThreats[0].line
      const bombTarget = threatLine.find((idx) => initialState.squares[idx] === humanPlayer && !isShielded(initialState, idx))
      if (bombTarget !== undefined) {
        return { type: 'bomb', index: bombTarget }
      }
    }

    // Normal taş ile o hattı kapat
    const blockCell = humanThreats[0].emptyIndexes[0]
    if (blockCell !== undefined && !initialState.blocked.includes(blockCell)) {
      return { type: 'move', index: blockCell }
    }
  }

  // 4. MERKEZ HAKİMİYETİ (Açılışta veya serbestken ilk hamle mutlaka Merkez olmalı!)
  const centerIdx = getCenterIndex(boardSize)
  if (!initialState.squares[centerIdx] && !initialState.blocked.includes(centerIdx)) {
    return { type: 'move', index: centerIdx }
  }

  // 5. ÇİFT TARAFLI TEHDİT (FORK) ENGELLEME / KURMA
  const humanFork = getMultipleThreatPositions(initialState.squares, boardSize, winLength, humanPlayer, initialState.blocked)
  if (humanFork !== null) {
    if (hasPower(initialState.powers[aiPlayer], 'bomb')) {
      for (let i = 0; i < initialState.squares.length; i++) {
        if (initialState.squares[i] === humanPlayer && !isShielded(initialState, i)) {
          const testSquares = initialState.squares.slice()
          testSquares[i] = null
          const forkAfterBomb = getMultipleThreatPositions(testSquares, boardSize, winLength, humanPlayer, initialState.blocked)
          if (forkAfterBomb === null) {
            return { type: 'bomb', index: i }
          }
        }
      }
    }
    return { type: 'move', index: humanFork }
  }

  const botFork = getMultipleThreatPositions(initialState.squares, boardSize, winLength, aiPlayer, initialState.blocked)
  if (botFork !== null) {
    return { type: 'move', index: botFork }
  }

  // 6. ARENA GÜÇ VE GENEL HAREKET ARAMASI
  const availableMoves = empty(initialState)
  if (availableMoves.length === 0) return null

  let bestMove = availableMoves[0]
  let bestScore = -Infinity

  for (const index of availableMoves) {
    const score = getPositionalScore(index, initialState.squares, boardSize, winLength, multipliers, aiPlayer)
    if (score > bestScore) {
      bestScore = score
      bestMove = index
    }
  }

  return { type: 'move', index: bestMove }
}
