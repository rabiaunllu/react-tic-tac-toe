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

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage)
}

function readOnlineStorage() {
  if (!canUseSessionStorage()) return null

  try {
    const rawSession = window.sessionStorage.getItem(ONLINE_SESSION_KEY)
    return rawSession ? JSON.parse(rawSession) : null
  } catch {
    window.sessionStorage.removeItem(ONLINE_SESSION_KEY)
    return null
  }
}

export function hasStoredLocalSession() {
  return hasSession(LOCAL_SESSION_KEY)
}

export function hasStoredOnlineSession() {
  return canUseSessionStorage() && window.sessionStorage.getItem(ONLINE_SESSION_KEY) !== null
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

// Security: playerId must be a UUID (issued by the server) — accepts both hyphenated and 32-hex formats
const UUID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i
const PLAYER_SECRET_REGEX = /^[A-Za-z0-9_-]{43}$/

// Security: online room sessions expire after 15 minutes to prevent stale unstarted lobbies from persisting
const ONLINE_SESSION_TTL_MS = 15 * 60 * 1000 // 15 minutes in milliseconds

export function isValidOnlineSession(session) {
  if (!session) return false

  // Reject tampered or missing format fields
  if (
    typeof session.roomCode !== 'string' ||
    !session.roomCode.trim() ||
    typeof session.playerId !== 'string' ||
    !UUID_REGEX.test(session.playerId.trim()) ||
    typeof session.playerSecret !== 'string' ||
    !PLAYER_SECRET_REGEX.test(session.playerSecret) ||
    typeof session.symbol !== 'string' ||
    !['X', 'O'].includes(session.symbol) ||
    typeof session.playerName !== 'string' ||
    !session.playerName.trim()
  ) {
    return false
  }

  // Reject expired sessions (older than 15 minutes)
  if (typeof session.savedAt === 'number') {
    const ageMs = Date.now() - session.savedAt
    if (ageMs > ONLINE_SESSION_TTL_MS || ageMs < 0) {
      return false
    }
  }

  return true
}

export function readOnlineSession() {
  const session = readOnlineStorage()

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
  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
  }
}

export function clearOnlineSession() {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(ONLINE_SESSION_KEY)
  }

  if (canUseLocalStorage()) {
    window.localStorage.removeItem(ONLINE_SESSION_KEY)
  }
}

