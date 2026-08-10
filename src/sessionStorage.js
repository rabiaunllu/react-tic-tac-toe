export const LOCAL_SESSION_KEY = 'xo-arena-local-session'
export const ONLINE_SESSION_KEY = 'xo-arena-online-session'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readSession(key) {
  if (!canUseLocalStorage()) {
    return null
  }

  try {
    const rawSession = window.localStorage.getItem(key)

    return rawSession ? JSON.parse(rawSession) : null
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

function writeSession(key, value) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function clearSession(key) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(key)
}

function hasSession(key) {
  return canUseLocalStorage() && window.localStorage.getItem(key) !== null
}

export function hasStoredLocalSession() {
  return hasSession(LOCAL_SESSION_KEY)
}

export function hasStoredOnlineSession() {
  return hasSession(ONLINE_SESSION_KEY)
}

export function isValidLocalSession(session) {
  return Boolean(
    session &&
      session.gameConfig &&
      typeof session.gameMode === 'string' &&
      typeof session.opponentType === 'string' &&
      Array.isArray(session.squares) &&
      typeof session.xIsNext === 'boolean' &&
      session.scores &&
      session.arenaSettings &&
      session.playerPowers &&
      Array.isArray(session.shieldedSquares) &&
      Array.isArray(session.lockedSquares) &&
      Array.isArray(session.boostedSquares) &&
      Array.isArray(session.visibleBoostedSquares) &&
      Array.isArray(session.traps) &&
      typeof session.roundNumber === 'number'
  )
}

export function readLocalSession() {
  const session = readSession(LOCAL_SESSION_KEY)

  if (!session) {
    return null
  }

  if (!isValidLocalSession(session)) {
    clearLocalSession()
    return null
  }

  return session
}

export function writeLocalSession(session) {
  writeSession(LOCAL_SESSION_KEY, session)
}

export function clearLocalSession() {
  clearSession(LOCAL_SESSION_KEY)
}

// Security: playerId must be a UUID (issued by the server) — rejects tampered / guessable tokens
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Security: online session expires after 24 hours to limit localStorage exposure window
const ONLINE_SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function isValidOnlineSession(session) {
  if (!session) return false

  // Reject tampered or missing format fields
  if (
    typeof session.roomCode !== 'string' ||
    !session.roomCode.trim() ||
    typeof session.playerId !== 'string' ||
    !UUID_REGEX.test(session.playerId.trim()) ||
    typeof session.symbol !== 'string' ||
    !['X', 'O'].includes(session.symbol) ||
    typeof session.playerName !== 'string' ||
    !session.playerName.trim()
  ) {
    return false
  }

  // Reject expired sessions (older than 24 hours)
  if (typeof session.savedAt === 'number') {
    const ageMs = Date.now() - session.savedAt
    if (ageMs > ONLINE_SESSION_TTL_MS || ageMs < 0) {
      return false
    }
  }

  return true
}

export function readOnlineSession() {
  const session = readSession(ONLINE_SESSION_KEY)

  if (!session) {
    return null
  }

  if (!isValidOnlineSession(session)) {
    clearOnlineSession()
    return null
  }

  return session
}

export function writeOnlineSession(session) {
  // Security: stamp the save time so TTL can be enforced on read
  writeSession(ONLINE_SESSION_KEY, { ...session, savedAt: Date.now() })
}

export function clearOnlineSession() {
  clearSession(ONLINE_SESSION_KEY)
}

