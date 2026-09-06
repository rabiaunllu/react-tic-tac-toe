import { calculateWinner } from './gameLogic.js'

const aiPlayerDefault = 'O'
const humanPlayerDefault = 'X'

const boardLinesCache = new Map()

export function getBoardLines(boardSize, winLength) {
  const cacheKey = `${boardSize}-${winLength}`
  const cached = boardLinesCache.get(cacheKey)
  if (cached) return cached

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

  boardLinesCache.set(cacheKey, lines)
  return lines
}

function getEmptyIndexes(squares, blockedIndexes = []) {
  return squares
    .map((square, index) =>
      square || blockedIndexes.includes(index) ? null : index
    )
    .filter((index) => index !== null)
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

function getCellMultiplier(multipliers, index) {
  return multipliers?.[index] ?? 1
}

export function getForkSquares(squares, boardSize, winLength, player, blocked = [], lines = getBoardLines(boardSize, winLength)) {
  const empty = getEmptyIndexes(squares, blocked)
  const forks = []

  for (let i = 0; i < empty.length; i += 1) {
    const idx = empty[i]
    let threatsCreated = 0

    for (let l = 0; l < lines.length; l += 1) {
      const line = lines[l]
      if (!line.includes(idx)) continue

      let pCount = 0
      let emptyCount = 0
      for (let k = 0; k < line.length; k += 1) {
        const cell = line[k]
        if (cell === idx || squares[cell] === player) pCount += 1
        else if (!squares[cell] && !blocked.includes(cell)) emptyCount += 1
      }

      if (pCount === winLength - 1 && emptyCount === 1) {
        threatsCreated += 1
      }
    }

    if (threatsCreated >= 2) {
      forks.push({ index: idx, threatsCount: threatsCreated })
    }
  }

  return forks
}

export function getForkCount(squares, boardSize, winLength, player, blocked = [], lines = getBoardLines(boardSize, winLength)) {
  return getForkSquares(squares, boardSize, winLength, player, blocked, lines).length
}

export function countImmediateThreats(squares, boardSize, winLength, player, blocked = [], lines = getBoardLines(boardSize, winLength)) {
  let count = 0
  for (let l = 0; l < lines.length; l += 1) {
    const line = lines[l]
    let p = 0
    let empty = 0
    for (let k = 0; k < line.length; k += 1) {
      const cell = line[k]
      if (squares[cell] === player) p += 1
      else if (!squares[cell] && !blocked.includes(cell)) empty += 1
    }
    if (p === winLength - 1 && empty === 1) {
      count += 1
    }
  }
  return count
}

export function getForkHubScore(squares, player, blocked = [], lines = []) {
  let hubScore = 0
  const opponent = player === 'X' ? 'O' : 'X'

  for (let i = 0; i < squares.length; i += 1) {
    if (squares[i] !== player) continue
    let openLines = 0

    for (let l = 0; l < lines.length; l += 1) {
      const line = lines[l]
      if (!line.includes(i)) continue

      const hasOpponent = line.some((idx) => squares[idx] === opponent)
      const hasBlocked = line.some((idx) => blocked.includes(idx) && idx !== i)
      if (!hasOpponent && !hasBlocked) {
        openLines += 1
      }
    }

    if (openLines >= 2) {
      hubScore += (openLines - 1) * 90_000
    }
  }

  return hubScore
}

function getMultipleThreatPositions(squares, boardSize, winLength, player, blockedIndexes = []) {
  const forks = getForkSquares(squares, boardSize, winLength, player, blockedIndexes)
  return forks.length > 0 ? forks[0].index : null
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

  let centerBonus = 0
  const center = (boardSize - 1) / 2
  const row = Math.floor(index / boardSize)
  const col = index % boardSize
  const dist = Math.abs(row - center) + Math.abs(col - center)
  if (dist === 0) {
    centerBonus = 120
  } else if (dist === 1) {
    centerBonus = 40
  }

  const multiplierBonus = cellMultiplier > 1 ? cellMultiplier * 10 : 0

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

export function getClassicDdaConfig({
  humanWinStreak = 0,
  consecutiveDraws = 0,
  roundNumber = 1,
  gameMode = 'classic',
} = {}) {
  // SADECE Klasik Mod için adaptif eşik aktif. Arena modu her zaman tavizsiz Grandmaster kalır.
  if (gameMode !== 'classic') {
    return {
      mode: 'grandmaster',
      skipAntiExploit: false,
      forkHesitationChance: 0,
      suboptimalMoveChance: 0,
      pityBlockMissChance: 0,
      skipOwnFork: false,
    }
  }

  // 1. SÜREKLİ BERABERLİK DURUMU (Draw Breakout)
  // Klasik modda sonsuz beraberlik döngüsünü kırmak için kullanıcının kazanmasına kontrollü fırsat tanı
  if (consecutiveDraws >= 3) {
    return {
      mode: 'draw_breakout_extreme',
      skipAntiExploit: true,
      forkHesitationChance: 0.90,
      suboptimalMoveChance: 0.70,
      pityBlockMissChance: 0.40,
      skipOwnFork: true,
    }
  }

  if (consecutiveDraws === 2) {
    return {
      mode: 'draw_breakout_strong',
      skipAntiExploit: true,
      forkHesitationChance: 0.65,
      suboptimalMoveChance: 0.45,
      pityBlockMissChance: 0.15,
      skipOwnFork: false,
    }
  }

  if (consecutiveDraws === 1 && roundNumber > 1) {
    return {
      mode: 'draw_breakout_mild',
      skipAntiExploit: false,
      forkHesitationChance: 0.30,
      suboptimalMoveChance: 0.20,
      pityBlockMissChance: 0,
      skipOwnFork: false,
    }
  }

  // 2. BOT HEP KAZANIYORSA (Bot Win Streak / Human Loss Streak)
  // Kullanıcının seviyesine göre botun zorluğunu kademeli azaltarak kazanmasını sağla
  if (humanWinStreak <= -3) {
    return {
      mode: 'loss_recovery_extreme',
      skipAntiExploit: true,
      forkHesitationChance: 1.0,
      suboptimalMoveChance: 0.75,
      pityBlockMissChance: 0.50,
      skipOwnFork: true,
    }
  }

  if (humanWinStreak === -2) {
    return {
      mode: 'loss_recovery_strong',
      skipAntiExploit: true,
      forkHesitationChance: 0.75,
      suboptimalMoveChance: 0.50,
      pityBlockMissChance: 0.25,
      skipOwnFork: false,
    }
  }

  if (humanWinStreak === -1) {
    return {
      mode: 'loss_recovery_mild',
      skipAntiExploit: false,
      forkHesitationChance: 0.40,
      suboptimalMoveChance: 0.25,
      pityBlockMissChance: 0,
      skipOwnFork: false,
    }
  }

  // 3. NORMAL / GRANDMASTER (Kullanıcı öndeyse veya ilk turlar)
  return {
    mode: 'grandmaster',
    skipAntiExploit: false,
    forkHesitationChance: 0,
    suboptimalMoveChance: 0,
    pityBlockMissChance: 0,
    skipOwnFork: false,
  }
}

export function getAdaptiveAiMove({
  squares,
  boardSize,
  winLength,
  blockedIndexes = [],
  multipliers,
  aiPlayer = aiPlayerDefault,
  humanPlayer = humanPlayerDefault,
  humanWinStreak = 0,
  roundNumber = 1,
  consecutiveDraws = 0,
  gameMode = 'classic',
}) {
  const dda = getClassicDdaConfig({ humanWinStreak, consecutiveDraws, roundNumber, gameMode })

  // L1: Kendi Kazanma Hamlesi (Her zaman %100 infaz edilir)
  const winningMove = findWinningMove(squares, boardSize, winLength, aiPlayer, blockedIndexes)
  if (winningMove !== null) return winningMove

  // L2: Rakibin Kazanma Hamlesini Bloke Et
  const blockingMove = findWinningMove(squares, boardSize, winLength, humanPlayer, blockedIndexes)
  if (blockingMove !== null) {
    // Klasik modda beraberlik 3+'ya ulaşmışsa veya oyuncu 2+ kez kaybetmişse,
    // kullanıcının 3'lü yapıp kazanabilmesi için kontrollü fırsat tanı
    if (dda.pityBlockMissChance > 0 && Math.random() < dda.pityBlockMissChance) {
      // Bloke etmeyip konumsal hamleye devam et, kullanıcı kazansın!
    } else {
      return blockingMove
    }
  }

  // L2.5: 3x3 Klasik Teori Kalkanı (Anti-Exploit Guards)
  // Sürekli beraberlik kırıcı veya geri dönüş modunda değilse klasik teoriyi uygula
  if (boardSize === 3 && winLength === 3 && !dda.skipAntiExploit) {
    const totalStones = squares.filter(Boolean).length
    // Kural A: Rakip ilk hamlesinde merkeze (4) oynadıysa, bot ZORUNLU olarak bir KÖŞE (0, 2, 6, 8) oynamalıdır.
    if (totalStones === 1 && squares[4] === humanPlayer) {
      const corners = [0, 2, 6, 8].filter((idx) => !squares[idx] && !blockedIndexes.includes(idx))
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)]
      }
    }

    // Kural B: Rakip zıt köşeleri tutmuşsa (0-8 veya 2-6) ve merkez botta ise (4),
    // bot köşeye oynamayıp ZORUNLU olarak kenarlardan birine (1, 3, 5, 7) oynar.
    if (squares[4] === aiPlayer) {
      const hasOppositeCorners =
        (squares[0] === humanPlayer && squares[8] === humanPlayer) ||
        (squares[2] === humanPlayer && squares[6] === humanPlayer)
      if (hasOppositeCorners) {
        const edges = [1, 3, 5, 7].filter((idx) => !squares[idx] && !blockedIndexes.includes(idx))
        if (edges.length > 0) {
          const scoredEdges = edges.map((edgeIdx) => ({
            index: edgeIdx,
            score: getPositionalScore(edgeIdx, squares, boardSize, winLength, multipliers, aiPlayer),
          }))
          scoredEdges.sort((a, b) => b.score - a.score)
          const bestScore = scoredEdges[0].score
          const topEdges = scoredEdges.filter((e) => e.score >= bestScore - 5)
          return topEdges[Math.floor(Math.random() * topEdges.length)].index
        }
      }
    }
  }

  // L3: Rakibin Çift Taraflı Tehdidini (Fork) Engelle
  const multipleThreatBlock = getMultipleThreatPositions(squares, boardSize, winLength, humanPlayer, blockedIndexes)
  if (multipleThreatBlock !== null) {
    // DDA: Klasik modda beraberlik kırıcı veya seviye azaltma aktifse, bot çatalı görmezden gelerek kullanıcının kazanmasına imkan tanır
    if (!dda.forkHesitationChance || Math.random() >= dda.forkHesitationChance) {
      return multipleThreatBlock
    }
  }

  // L4: Kendi Çift Taraflı Tehdidini (Fork) Kur
  if (!dda.skipOwnFork) {
    const botFork = getMultipleThreatPositions(squares, boardSize, winLength, aiPlayer, blockedIndexes)
    if (botFork !== null) {
      return botFork
    }
  }

  // L5: Merkez Kareyi Ele Geçir (Eğer boşsa)
  const centerIdx = getCenterIndex(boardSize)
  if (!squares[centerIdx] && !blockedIndexes.includes(centerIdx)) {
    return centerIdx
  }

  // L6: Pozisyonel ve Stratejik Hamle
  const emptyIndexes = getEmptyIndexes(squares, blockedIndexes)
  if (emptyIndexes.length === 0) return null

  const scoredMoves = emptyIndexes.map((index) => ({
    index,
    score: getPositionalScore(index, squares, boardSize, winLength, multipliers, aiPlayer),
  }))
  scoredMoves.sort((a, b) => b.score - a.score)

  // DDA: Klasik modda seviye azaltma veya beraberlik kırıcıda ikinci en iyi hamleyi seçerek oyunu kullanıcı lehine aç
  if (
    scoredMoves.length > 1 &&
    dda.suboptimalMoveChance > 0 &&
    Math.random() < dda.suboptimalMoveChance
  ) {
    return scoredMoves[1].index
  }

  // Eşit veya çok yakın skordaki en iyi hamleler arasında organik seçim (monotonluğu önler)
  const bestScore = scoredMoves[0].score
  const topMoves = scoredMoves.filter((m) => m.score >= bestScore - 2)
  if (topMoves.length > 1) {
    return topMoves[Math.floor(Math.random() * topMoves.length)].index
  }

  return scoredMoves[0].index
}

// ── Arena AI Bulletproof Grandmaster Engine ─────────────────────────────────
//
// Unified Minimax + Alpha-Beta search with Hard Tactical Guards:
//   L1: Immediate Win Execution (100% deterministic victory)
//   L2: Threat Resolution Filter (Guaranteed block/bomb against mate-in-1 threats)
//   L3: Opponent Fork Prevention & Counter-Forcing Defense
//   L4: AI Own Fork Creation
//   L5: Transposition Table Cache & Alpha-Beta Depth 6 Search
//   L6: Opening Book for 0ms first-move response

/* ── Zobrist Hashing & Transposition Table ─────────────────────────────────── */

const MAX_CELLS = 25
const ZOBRIST_PIECES = Array.from({ length: MAX_CELLS }, () => [
  Math.floor(Math.random() * 0x7fffffff), // Empty
  Math.floor(Math.random() * 0x7fffffff), // X
  Math.floor(Math.random() * 0x7fffffff), // O
])
const ZOBRIST_SHIELD = Array.from({ length: MAX_CELLS }, () => Math.floor(Math.random() * 0x7fffffff))
const ZOBRIST_BOOST = Array.from({ length: MAX_CELLS }, () => Math.floor(Math.random() * 0x7fffffff))
const ZOBRIST_BLOCK = Array.from({ length: MAX_CELLS }, () => Math.floor(Math.random() * 0x7fffffff))
const ZOBRIST_TURN = Math.floor(Math.random() * 0x7fffffff)

const transpositionTable = new Map()
const MAX_TT_SIZE = 50_000

function hasPower(powers, id) {
  return (powers?.[id] ?? 0) > 0
}

function getZobristHash(state) {
  const { squares, shielded, boosted, blocked, turn } = state
  let hash = turn === 'X' ? ZOBRIST_TURN : 0

  for (let i = 0; i < squares.length; i += 1) {
    const stone = squares[i]
    const pIdx = stone === 'X' ? 1 : stone === 'O' ? 2 : 0
    hash ^= ZOBRIST_PIECES[i][pIdx]
  }

  for (let i = 0; i < shielded.length; i += 1) {
    hash ^= ZOBRIST_SHIELD[shielded[i]]
  }

  for (let i = 0; i < boosted.length; i += 1) {
    hash ^= ZOBRIST_BOOST[boosted[i]]
  }

  for (let i = 0; i < blocked.length; i += 1) {
    hash ^= ZOBRIST_BLOCK[blocked[i]]
  }

  return hash >>> 0
}

/* ── Harmonized Dynamic Heuristic Evaluation Matrix ───────────────────────── */

const ARENA_WIN = 100_000

function evaluateArena(state, context, plyFromRoot = 0) {
  const { squares, shielded, boosted, aiTraps, blocked, powers } = state
  const { boardSize, winLength, multipliers, aiPlayer, humanPlayer, lines } = context

  const winner = calculateWinner(squares, boardSize, winLength)
  if (winner === aiPlayer) return ARENA_WIN - plyFromRoot
  if (winner === humanPlayer) return -ARENA_WIN + plyFromRoot

  const totalStones = squares.filter((s) => s !== null).length
  const isOpening = totalStones <= 3
  const isEndgame = totalStones >= 6
  const powerPhaseMult = isOpening ? 0.05 : isEndgame ? 2.0 : 1.0

  let score = 0

  const W = boardSize === 3
    ? [0, 40, 4_500]
    : boardSize === 4
      ? [0, 20, 300, 4_500]
      : [0, 15, 100, 800, 4_500]

  let aiThreats = 0
  let huThreats = 0
  let aiLockedThreats = 0
  let huLockedThreats = 0

  for (let l = 0; l < lines.length; l += 1) {
    const line = lines[l]
    let ai = 0
    let hu = 0
    let emptyUnblocked = 0
    let emptyBlocked = 0
    let lineMult = 0

    for (let k = 0; k < line.length; k += 1) {
      const idx = line[k]
      const stone = squares[idx]
      lineMult += multipliers?.[idx] ?? 1
      if (stone === aiPlayer) ai += 1
      else if (stone === humanPlayer) hu += 1
      else if (blocked.includes(idx)) emptyBlocked += 1
      else emptyUnblocked += 1
    }

    if (ai > 0 && hu > 0) continue

    if (ai > 0) {
      const w = W[ai] ?? W.at(-1)
      score += w + lineMult * ai * 5
      if (ai === winLength - 1) {
        if (emptyUnblocked === 1) aiThreats += 1
        else if (emptyBlocked === 1) aiLockedThreats += 1
      }
    } else if (hu > 0) {
      const w = W[hu] ?? W.at(-1)
      score -= w + lineMult * hu * 5
      if (hu === winLength - 1) {
        if (emptyUnblocked === 1) huThreats += 1
        else if (emptyBlocked === 1) huLockedThreats += 1
      }
    }
  }

  // Tactical Threats (Harmonized Scale)
  score += aiThreats * 5_000 - huThreats * 6_000
  // Lav/bomba kilitli tehditler doğrudan bir sonraki tur kazandırmaz, bu yüzden puanı abartılmaz
  score += aiLockedThreats * 300 - huLockedThreats * 450

  // Double Threats (Forks)
  if (aiThreats >= 2) score += 7_000
  if (huThreats >= 2) score -= 8_500

  const aiForks = getForkCount(squares, boardSize, winLength, aiPlayer, blocked, lines)
  const huForks = getForkCount(squares, boardSize, winLength, humanPlayer, blocked, lines)
  score += aiForks * 3_500 - huForks * 5_000

  if (boardSize === 3) {
    const aiHubs = getForkHubScore(squares, aiPlayer, blocked, lines)
    const huHubs = getForkHubScore(squares, humanPlayer, blocked, lines)
    score += (aiHubs - huHubs) * 0.035
  }

  // Positional: Center dominance + multiplier score
  const center = (boardSize - 1) / 2
  for (let i = 0; i < squares.length; i += 1) {
    const stone = squares[i]
    if (!stone) continue
    const row = Math.floor(i / boardSize)
    const col = i % boardSize
    const prox = Math.max(0, boardSize - Math.abs(row - center) - Math.abs(col - center))
    const m = multipliers?.[i] ?? 1
    const v = prox * 50 + (m - 1) * 150
    score += stone === aiPlayer ? v : -v
  }

  // Power Leverage & Reserves (Phase Adjusted)
  for (let i = 0; i < shielded.length; i += 1) {
    const idx = shielded[i]
    const isCenter = idx === getCenterIndex(boardSize)
    const shieldValue = (isCenter ? 600 : 300) * powerPhaseMult
    if (squares[idx] === aiPlayer) score += shieldValue
    else if (squares[idx] === humanPlayer) score -= shieldValue
  }

  for (let i = 0; i < boosted.length; i += 1) {
    const idx = boosted[i]
    const mult = multipliers?.[idx] ?? 1
    const boostValue = 150 * mult * powerPhaseMult
    if (squares[idx] === aiPlayer) score += boostValue
    else if (squares[idx] === humanPlayer) score -= boostValue
  }

  score += aiTraps.filter((i) => !squares[i]).length * 250

  // Reserve preservation: Reward keeping unspent powers for endgame
  if (powers) {
    const aiPowerReserve = (powers[aiPlayer]?.bomb ?? 0) + (powers[aiPlayer]?.shield ?? 0) + (powers[aiPlayer]?.vampire ?? 0) + (powers[aiPlayer]?.freeze ?? 0)
    const huPowerReserve = (powers[humanPlayer]?.bomb ?? 0) + (powers[humanPlayer]?.shield ?? 0) + (powers[humanPlayer]?.vampire ?? 0) + (powers[humanPlayer]?.freeze ?? 0)
    score += (aiPowerReserve - huPowerReserve) * 200

    // Pessimistic Trap Hazard: If Human has unspent trap, discount placing on high-traffic empty squares
    if (hasPower(powers[humanPlayer], 'trap')) {
      const centerIdx = getCenterIndex(boardSize)
      if (squares[centerIdx] === aiPlayer) {
        score -= 150
      }
    }
  }

  return score
}

/* ── Smart Action Generation ──────────────────────────────────────────────── */

function generateActions(state, context, plyFromRoot = 0) {
  const { squares, blocked, frozen, powers, shielded, boosted, aiTraps, turn } = state
  const { aiPlayer, humanPlayer } = context
  const opponent = turn === aiPlayer ? humanPlayer : aiPlayer
  const pp = powers[turn]
  const unavailable = [...blocked, ...frozen]
  const available = getEmptyIndexes(squares, unavailable)
  const actions = []

  for (let i = 0; i < available.length; i += 1) {
    actions.push({ type: 'move', index: available[i] })
  }

  if (hasPower(pp, 'bomb')) {
    const oppStones = []
    for (let i = 0; i < squares.length; i += 1) {
      if (squares[i] === opponent && !shielded.includes(i)) {
        oppStones.push(i)
      }
    }

    // Taktiksel bomba filtreleme: Sırayı boşa harcamamak için sadece somut tehdit içeren taşlar bombalanır
    for (let s = 0; s < oppStones.length; s += 1) {
      const idx = oppStones[s]
      const testSquares = squares.slice()
      testSquares[idx] = null

      // 1. Bombalandığında mevcut oyuncu anında kazanabiliyor mu?
      const winAfterBomb = findWinningMove(testSquares, context.boardSize, context.winLength, turn, [idx])
      if (winAfterBomb !== null) {
        actions.push({ type: 'bomb', index: idx })
        continue
      }

      // 2. Bu taş rakibin 1-eksik veya 2-eksik kazanma hattında mı?
      // NOT: Kraterli kareler (unavailable) bir sonraki tur açılacağı için hala somut tehdittir!
      const isThreatStone = context.lines.some((line) => {
        if (!line.includes(idx)) return false
        const oppCount = line.filter((c) => squares[c] === opponent).length
        const emptyCount = line.filter((c) => !squares[c]).length
        return oppCount >= Math.max(2, context.winLength - 1) && emptyCount >= 1
      })

      if (isThreatStone) {
        actions.push({ type: 'bomb', index: idx })
        continue
      }

      // 3. Bu taş rakibin çatal (fork) parçası mı?
      const forksWithStone = getForkCount(squares, context.boardSize, context.winLength, opponent, unavailable, context.lines)
      if (forksWithStone > 0) {
        const forksWithoutStone = getForkCount(testSquares, context.boardSize, context.winLength, opponent, [idx], context.lines)
        if (forksWithoutStone < forksWithStone) {
          actions.push({ type: 'bomb', index: idx })
        }
      }
    }
  }

  if (hasPower(pp, 'trap')) {
    const ownTraps = turn === aiPlayer ? aiTraps : []
    const trapTargets = plyFromRoot === 0 ? available : available.slice(0, 3)
    for (let i = 0; i < trapTargets.length; i += 1) {
      const idx = trapTargets[i]
      if (!ownTraps.includes(idx)) {
        actions.push({ type: 'trap', index: idx })
      }
    }
  }

  if (hasPower(pp, 'boost')) {
    for (let i = 0; i < available.length; i += 1) {
      const idx = available[i]
      if (!boosted.includes(idx)) {
        actions.push({ type: 'boost', index: idx })
      }
    }
  }

  if (hasPower(pp, 'shield')) {
    const totalStones = squares.filter((s) => s !== null).length
    const isLateGame = totalStones >= (context.boardSize === 3 ? 4 : 5)
    const hasActiveThreat = countImmediateThreats(squares, context.boardSize, context.winLength, opponent, unavailable, context.lines) > 0 ||
                            countImmediateThreats(squares, context.boardSize, context.winLength, turn, unavailable, context.lines) > 0

    // Açılış evresinde (< 4 taş) korumasız taşları sebepsiz yere kalkanlama; sadece gerçek tehdit veya geç oyunda kullan
    if (isLateGame || hasActiveThreat) {
      const ownStones = []
      for (let i = 0; i < squares.length; i += 1) {
        if (squares[i] === turn && !shielded.includes(i)) ownStones.push(i)
      }
      const shieldTargets = plyFromRoot === 0 ? ownStones : ownStones.slice(0, 1)
      for (let s = 0; s < shieldTargets.length; s += 1) {
        const si = shieldTargets[s]
        for (let m = 0; m < available.length; m += 1) {
          actions.push({ type: 'shield', shieldIndex: si, moveIndex: available[m] })
        }
      }
    }
  }

  if (hasPower(pp, 'freeze') && squares.some((s) => s === opponent)) {
    const freezeTargets = plyFromRoot === 0 ? available : available.slice(0, 2)
    for (let f = 0; f < freezeTargets.length; f += 1) {
      const fi = freezeTargets[f]
      for (let m = 0; m < available.length; m += 1) {
        const mi = available[m]
        if (fi !== mi) {
          actions.push({ type: 'freeze', freezeIndex: fi, moveIndex: mi })
        }
      }
    }
  }

  if (hasPower(pp, 'vampire')) {
    for (let i = 0; i < squares.length; i += 1) {
      if (squares[i] === opponent && (context.multipliers?.[i] ?? 1) > 1) {
        for (let m = 0; m < available.length; m += 1) {
          actions.push({ type: 'vampire', stealIndex: i, moveIndex: available[m] })
        }
      }
    }
  }

  return actions
}

/* ── Action Application ───────────────────────────────────────────────────── */

function applyArenaAction(state, action, context) {
  const { aiPlayer, humanPlayer } = context
  const player = state.turn
  const opponent = player === aiPlayer ? humanPlayer : aiPlayer
  const next = {
    squares: state.squares.slice(),
    powers: {
      [aiPlayer]: { ...state.powers[aiPlayer] },
      [humanPlayer]: { ...state.powers[humanPlayer] },
    },
    shielded: [...state.shielded],
    boosted: [...state.boosted],
    blocked: [],
    frozen: [],
    aiTraps: [...state.aiTraps],
    turn: opponent,
  }

  const trapCheck = (idx) => {
    if (player !== aiPlayer && next.aiTraps.includes(idx)) {
      next.squares[idx] = null
      next.aiTraps = next.aiTraps.filter((t) => t !== idx)
    }
  }

  if (action.type === 'move') {
    next.squares[action.index] = player
    trapCheck(action.index)
  } else if (action.type === 'boost') {
    next.squares[action.index] = player
    next.powers[player] = { ...next.powers[player], boost: next.powers[player].boost - 1 }
    next.boosted = [...next.boosted, action.index]
    trapCheck(action.index)
  } else if (action.type === 'bomb') {
    next.squares[action.index] = null
    next.powers[player] = { ...next.powers[player], bomb: next.powers[player].bomb - 1 }
    next.shielded = next.shielded.filter((i) => i !== action.index)
    next.boosted = next.boosted.filter((i) => i !== action.index)
    next.blocked = [action.index]
  } else if (action.type === 'trap') {
    next.powers[player] = { ...next.powers[player], trap: next.powers[player].trap - 1 }
    if (player === aiPlayer) next.aiTraps = [...next.aiTraps, action.index]
  } else if (action.type === 'shield') {
    next.powers[player] = { ...next.powers[player], shield: next.powers[player].shield - 1 }
    next.shielded = [...next.shielded, action.shieldIndex]
    next.squares[action.moveIndex] = player
    trapCheck(action.moveIndex)
  } else if (action.type === 'freeze') {
    next.powers[player] = { ...next.powers[player], freeze: next.powers[player].freeze - 1 }
    next.frozen = [action.freezeIndex]
    next.squares[action.moveIndex] = player
    trapCheck(action.moveIndex)
  } else if (action.type === 'vampire') {
    next.powers[player] = { ...next.powers[player], vampire: next.powers[player].vampire - 1 }
    next.squares[action.moveIndex] = player
    trapCheck(action.moveIndex)
  }

  return next
}

/* ── Move Ordering & Pruning ──────────────────────────────────────────────── */

function orderAndPrune(actions, state, context, plyFromRoot) {
  const maximizing = state.turn === context.aiPlayer
  const scored = actions.map((action) => ({
    action,
    score: evaluateArena(
      applyArenaAction(state, action, context), context, plyFromRoot + 1,
    ),
  }))

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score))

  const maxActions = plyFromRoot === 0
    ? (context.boardSize === 3 ? 20 : 24)
    : plyFromRoot === 1
      ? 10
      : plyFromRoot === 2
        ? 8
        : 6

  if (actions.length <= maxActions) {
    return scored.map((x) => x.action)
  }

  return scored.slice(0, maxActions).map((x) => x.action)
}

/* ── Alpha-Beta Search with Zobrist Transposition Table & Horizon Extension ── */

function searchArena(state, context, depth, alpha, beta, plyFromRoot) {
  const { boardSize, winLength, aiPlayer, humanPlayer } = context
  const winner = calculateWinner(state.squares, boardSize, winLength)
  if (winner === aiPlayer) return ARENA_WIN - plyFromRoot
  if (winner === humanPlayer) return -ARENA_WIN + plyFromRoot

  const actions = generateActions(state, context, plyFromRoot)

  // Dynamic Horizon Extension: If craters or frozen tiles exist at depth 0, extend +1 ply to resolve unlock
  if (depth === 0) {
    if ((state.blocked.length > 0 || state.frozen.length > 0) && plyFromRoot < 7) {
      depth += 1
    } else {
      return evaluateArena(state, context, plyFromRoot)
    }
  }

  if (actions.length === 0) {
    return evaluateArena(state, context, plyFromRoot)
  }

  const zobristKey = getZobristHash(state)
  const cachedEntry = transpositionTable.get(zobristKey)
  if (cachedEntry && cachedEntry.depth >= depth) {
    if (cachedEntry.flag === 'EXACT') return cachedEntry.score
    if (cachedEntry.flag === 'LOWER' && cachedEntry.score > alpha) alpha = cachedEntry.score
    if (cachedEntry.flag === 'UPPER' && cachedEntry.score < beta) beta = cachedEntry.score
    if (alpha >= beta) return cachedEntry.score
  }

  const ordered = orderAndPrune(actions, state, context, plyFromRoot)
  const maximizing = state.turn === aiPlayer

  let best = maximizing ? -Infinity : Infinity
  for (let i = 0; i < ordered.length; i += 1) {
    const action = ordered[i]
    const score = searchArena(
      applyArenaAction(state, action, context),
      context, depth - 1, alpha, beta, plyFromRoot + 1,
    )
    if (maximizing) {
      best = Math.max(best, score)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, score)
      beta = Math.min(beta, best)
    }
    if (beta <= alpha) break
  }

  if (transpositionTable.size < MAX_TT_SIZE) {
    let flag = 'EXACT'
    if (best <= alpha) flag = 'UPPER'
    else if (best >= beta) flag = 'LOWER'
    transpositionTable.set(zobristKey, { depth, score: best, flag })
  }

  return best
}

/* ── Opening Book ─────────────────────────────────────────────────────────── */

function getArenaOpeningAction(state, context) {
  const { squares, powers, boosted, blocked } = state
  const { boardSize, aiPlayer } = context
  const stoneCount = squares.filter((s) => s !== null).length

  if (stoneCount > 1) return null

  const pp = powers[aiPlayer]
  const center = getCenterIndex(boardSize)
  const empty = getEmptyIndexes(squares, blocked)
  if (empty.length === 0) return null

  const corners = boardSize === 3
    ? [0, 2, 6, 8]
    : boardSize === 4
      ? [0, 3, 12, 15]
      : [0, 4, 20, 24]

  const target = empty.includes(center)
    ? center
    : corners.find((c) => empty.includes(c)) ?? empty[0]

  if (hasPower(pp, 'boost') && !boosted.includes(target)) {
    return { type: 'boost', index: target }
  }
  return { type: 'move', index: target }
}

/* ── Main Entry Point ─────────────────────────────────────────────────────── */

/**
 * ARENA AI FULL-POWER DECISION ENGINE
 *
 * Implements hard tactical winning and threat-resolution guarantees
 * alongside deep Alpha-Beta Minimax search.
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
  transpositionTable.clear()
  const lines = getBoardLines(boardSize, winLength)
  const context = { boardSize, winLength, multipliers, aiPlayer, humanPlayer, lines }
  const zeroPowers = { bomb: 0, shield: 0, trap: 0, freeze: 0, vampire: 0, boost: 0 }

  const initialState = {
    squares: squares.slice(),
    turn: aiPlayer,
    powers: {
      [aiPlayer]: { ...zeroPowers, ...playerPowers },
      [humanPlayer]: { ...zeroPowers, ...humanPowers },
    },
    shielded: [...shieldedSquares],
    boosted: [...boostedSquares],
    blocked: [...blockedIndexes],
    frozen: [],
    aiTraps: [...aiTrapIndexes],
  }

  // 1. Opening Book — instant response for first move
  const opening = getArenaOpeningAction(initialState, context)
  if (opening) return opening

  const rootActions = generateActions(initialState, context, 0)
  if (rootActions.length === 0) return null

  // 2. HARD GUARD L1: Immediate Win Check (If any action wins this turn, DO IT!)
  for (let i = 0; i < rootActions.length; i += 1) {
    const act = rootActions[i]
    const testState = applyArenaAction(initialState, act, context)
    if (calculateWinner(testState.squares, boardSize, winLength) === aiPlayer) {
      if (act.type === 'shield') {
        return { type: 'shield', index: act.shieldIndex, followUpMove: act.moveIndex }
      }
      if (act.type === 'freeze') {
        return { type: 'freeze', index: act.freezeIndex, moveIndex: act.moveIndex }
      }
      if (act.type === 'vampire') {
        return { type: 'vampire', index: act.stealIndex, moveIndex: act.moveIndex }
      }
      return act
    }
  }

  // 3. HARD GUARD L2: Immediate Threat Defense Filter
  // Find all lines where human has winLength - 1 stones
  const humanThreatLines = []
  for (let l = 0; l < lines.length; l += 1) {
    const line = lines[l]
    const humanStones = line.filter((idx) => squares[idx] === humanPlayer)
    const emptyCells = line.filter((idx) => !squares[idx])

    if (humanStones.length === winLength - 1 && emptyCells.length === 1) {
      const target = emptyCells[0]
      humanThreatLines.push({ line, target, threatStones: humanStones, isLocked: blockedIndexes.includes(target) })
    }
  }

  // If opponent has open or locked threats, FILTER candidate actions to ONLY those that neutralize the threat
  let candidateActions = rootActions
  if (humanThreatLines.length > 0) {
    const openThreats = humanThreatLines.filter((t) => !t.isLocked)
    if (openThreats.length > 0) {
      const threatTargets = openThreats.map((t) => t.target)
      const allThreatStones = openThreats.flatMap((t) => t.threatStones)

      const validDefenses = rootActions.filter((act) => {
        // Option A: Direct stone placement on threat square
        if (act.type === 'move' || act.type === 'boost') {
          return threatTargets.includes(act.index)
        }
        if (act.type === 'shield' || act.type === 'freeze' || act.type === 'vampire') {
          return threatTargets.includes(act.moveIndex)
        }
        // Option B: Freeze the threat square
        if (act.type === 'freeze' && threatTargets.includes(act.freezeIndex)) {
          return true
        }
        // Option C: Bomb the opponent's threatening stone
        // Açık tek bir tehdit varken taşı koyup bloke etmek bombayı korur.
        // Bombayı sadece birden fazla tehdit (çatal) varsa veya normal hamleyle bloke edilemiyorsa harca!
        if (act.type === 'bomb' && (openThreats.length > 1 || !rootActions.some((a) => (a.type === 'move' || a.type === 'shield') && threatTargets.includes(a.index ?? a.moveIndex)))) {
          return allThreatStones.includes(act.index)
        }
        return false
      })

      if (validDefenses.length > 0) {
        candidateActions = validDefenses
      }
    } else {
      // Threat square is locked by a bomb:
      // If bot has a bomb, MUST bomb one of the opponent's threatening stones!
      const lockedThreatStones = humanThreatLines.flatMap((t) => t.threatStones)
      const bombCounterActions = rootActions.filter(
        (act) => act.type === 'bomb' && lockedThreatStones.includes(act.index)
      )
      if (bombCounterActions.length > 0) {
        candidateActions = bombCounterActions
      } else {
        // No bomb available: must play a forcing counter-threat
        const forcingDefenses = rootActions.filter((act) => {
          const testState = applyArenaAction(initialState, act, context)
          const forcingThreats = countImmediateThreats(testState.squares, boardSize, winLength, aiPlayer, testState.blocked, lines)
          return forcingThreats > 0
        })
        if (forcingDefenses.length > 0) {
          candidateActions = forcingDefenses
        }
      }
    }
  }

  // 3a. HARD GUARD L2.5: 3x3 Klasik Teori Kalkanı (Anti-Exploit Theory Koruması)
  if (boardSize === 3 && winLength === 3 && humanThreatLines.length === 0) {
    const totalStones = squares.filter(Boolean).length

    // Kural A: Rakip ilk hamlesinde merkeze (4) oynadıysa, bot ZORUNLU olarak bir KÖŞE (0, 2, 6, 8) oynamalıdır.
    if (totalStones === 1 && squares[4] === humanPlayer) {
      const corners = [0, 2, 6, 8].filter((idx) => !squares[idx] && !blockedIndexes.includes(idx))
      if (corners.length > 0) {
        return { type: 'move', index: corners[Math.floor(Math.random() * corners.length)] }
      }
    }

    // Kural B: Rakip zıt köşeleri tutmuşsa (0-8 veya 2-6) ve merkez botta ise (4),
    // bot köşeye oynamayıp ZORUNLU olarak kenarlardan birine (1, 3, 5, 7) oynar!
    // Kenara oynamak 2'li hat açarak rakibi savunmaya zorlar ve kaçınılmaz çapraz çatalı bozar.
    if (squares[4] === aiPlayer) {
      const hasOppositeCorners =
        (squares[0] === humanPlayer && squares[8] === humanPlayer) ||
        (squares[2] === humanPlayer && squares[6] === humanPlayer)
      if (hasOppositeCorners) {
        const edges = [1, 3, 5, 7].filter((idx) => !squares[idx] && !blockedIndexes.includes(idx))
        if (edges.length > 0) {
          const scoredEdges = edges.map((edgeIdx) => ({
            index: edgeIdx,
            score: getPositionalScore(edgeIdx, squares, boardSize, winLength, multipliers, aiPlayer),
          }))
          scoredEdges.sort((a, b) => b.score - a.score)
          return { type: 'move', index: scoredEdges[0].index }
        }
      }

      // Kural C: İki bitişik kenar çatalı (1-3, 1-5, 3-7, 5-7) -> Ortak köşeyi al!
      const adjacentEdgePairs = [
        { edges: [1, 3], corner: 0 },
        { edges: [1, 5], corner: 2 },
        { edges: [3, 7], corner: 6 },
        { edges: [5, 7], corner: 8 },
      ]
      for (const pair of adjacentEdgePairs) {
        if (squares[pair.edges[0]] === humanPlayer && squares[pair.edges[1]] === humanPlayer) {
          if (!squares[pair.corner] && !blockedIndexes.includes(pair.corner)) {
            return { type: 'move', index: pair.corner }
          }
        }
      }
    }
  }

  // 3b. HARD GUARD L3: Opponent Fork Defense Filter
  // If opponent has no immediate 1-move win, check if opponent can create a FORK (>= 2 simultaneous winning threats)
  if (humanThreatLines.length === 0) {
    const humanForks = getForkSquares(squares, boardSize, winLength, humanPlayer, blockedIndexes, lines)
    if (humanForks.length > 0) {
      const forkTargets = humanForks.map((f) => f.index)
      const hasMultipleForks = humanForks.length > 1

      const forkDefenses = candidateActions.filter((act) => {
        // Option 1 (Öncelikli): Karşı tehdit yaratarak rakibi savunmaya zorlamak
        const testState = applyArenaAction(initialState, act, context)
        const forcingThreats = countImmediateThreats(testState.squares, boardSize, winLength, aiPlayer, testState.blocked, lines)
        if (forcingThreats > 0) {
          return true
        }

        // Option 2: Bomba ile çatalı oluşturan rakip taşını imha etmek
        if (act.type === 'bomb') {
          const testSquares = squares.slice()
          testSquares[act.index] = null
          const remainingForks = getForkSquares(testSquares, boardSize, winLength, humanPlayer, [act.index], lines)
          if (remainingForks.length === 0) {
            return true
          }
        }

        // Eğer tek bir çatal hedefi varsa doğrudan o kareyi tutmak yeterlidir.
        // Birden fazla çatal hedefi varsa (örn. 2 ve 6), sadece birine taş koymak yetmez çünkü rakip diğerine basar!
        if (!hasMultipleForks) {
          if (act.type === 'move' || act.type === 'boost') {
            return forkTargets.includes(act.index)
          }
          if (act.type === 'shield' || act.type === 'freeze' || act.type === 'vampire') {
            return forkTargets.includes(act.moveIndex)
          }
          if (act.type === 'freeze' && forkTargets.includes(act.freezeIndex)) {
            return true
          }
        }

        return false
      })

      if (forkDefenses.length > 0) {
        candidateActions = forkDefenses
      }
    }
  }

  // 3c. HARD GUARD L4: AI Own Fork Creation
  // If AI can create a fork, prioritize fork-creating actions!
  const aiForks = getForkSquares(squares, boardSize, winLength, aiPlayer, blockedIndexes, lines)
  if (aiForks.length > 0) {
    const aiForkTargets = aiForks.map((f) => f.index)
    const forkActions = candidateActions.filter((act) => {
      if (act.type === 'move' || act.type === 'boost') return aiForkTargets.includes(act.index)
      if (act.type === 'shield' || act.type === 'freeze' || act.type === 'vampire') return aiForkTargets.includes(act.moveIndex)
      return false
    })
    if (forkActions.length > 0) {
      candidateActions = [...forkActions, ...candidateActions.filter((a) => !forkActions.includes(a))]
    }
  }

  // 4. Search Depth Configuration (Arena her zaman tam kapasite Grandmaster arama yapar)
  const remainingCells = getEmptyIndexes(squares, blockedIndexes).length
  const searchDepth = boardSize === 3
    ? Math.min(6, remainingCells + 1)
    : boardSize === 4 ? 4 : 3

  const orderedRoot = orderAndPrune(candidateActions, initialState, context, 0)

  // 5. Minimax Search
  const ranked = orderedRoot.map((action) => {
    const nextState = applyArenaAction(initialState, action, context)
    const score = searchArena(
      nextState,
      context,
      searchDepth - 1,
      -Infinity,
      Infinity,
      1,
    )
    return { action, score }
  })

  ranked.sort((a, b) => b.score - a.score)

  // Arena Modu Tavizsiz Grandmaster: Her zaman hesaplanan EN İYİ (en yüksek puanlı) hamleyi uygular
  const chosen = ranked[0].action

  // 6. Format Conversion
  if (chosen.type === 'shield') {
    return { type: 'shield', index: chosen.shieldIndex, followUpMove: chosen.moveIndex }
  }
  if (chosen.type === 'freeze') {
    return { type: 'freeze', index: chosen.freezeIndex, moveIndex: chosen.moveIndex }
  }
  if (chosen.type === 'vampire') {
    return { type: 'vampire', index: chosen.stealIndex, moveIndex: chosen.moveIndex }
  }
  return chosen
}


