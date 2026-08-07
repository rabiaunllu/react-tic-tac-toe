const DEFAULT_API_BASE_URL = 'http://localhost:5243'
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const onlineFlag = import.meta.env.VITE_ENABLE_ONLINE?.trim().toLowerCase()
const isOnlineFlagEnabled = onlineFlag === 'true' || (!import.meta.env.PROD && !onlineFlag)
const hasConfiguredApiBaseUrl = Boolean(configuredApiBaseUrl)
const canUseSameOriginApi = import.meta.env.PROD && !hasConfiguredApiBaseUrl

export const API_BASE_URL = (
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? DEFAULT_API_BASE_URL : '')
).replace(/\/+$/, '')
export const IS_ONLINE_ENABLED =
  isOnlineFlagEnabled && (import.meta.env.DEV || hasConfiguredApiBaseUrl || canUseSameOriginApi)
export const ONLINE_UNAVAILABLE_MESSAGE = 'Online mod yakında açılacak.'

export class RoomRequestError extends Error {
  constructor(message, { status = 0 } = {}) {
    super(message)
    this.name = 'RoomRequestError'
    this.status = status
  }
}

export function isRoomNotFoundError(error) {
  return error instanceof RoomRequestError && error.status === 404
}

export function isConnectionError(error) {
  return error instanceof RoomRequestError && error.status === 0
}

export function getRoomStatusText(status) {
  const statusMap = {
    waiting: 'Rakip bekleniyor',
    ready: 'Oyun hazır',
    playing: 'Maç devam ediyor',
    completed: 'Tamamlandı',
  }

  return statusMap[status] ?? 'Durum bilinmiyor'
}

export async function requestRoomJson(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
  } catch {
    throw new RoomRequestError('Bağlantı kurulamadı. Tekrar deneniyor...')
  }

  if (!response.ok) {
    let errorCode

    try {
      const errorBody = await response.clone().json()
      errorCode = String(errorBody.error ?? '')
    } catch {
      errorCode = ''
    }

    if (response.status === 403) {
      throw new RoomRequestError('Bu oda işlemi için yetkiniz yok.', { status: response.status })
    }

    if (response.status === 404) {
      throw new RoomRequestError('Oda bulunamadı. Kodu kontrol et.', { status: response.status })
    }

    if (response.status === 400) {
      throw new RoomRequestError('Eksik veya hatalı bilgi var. Oyuncu adını ve oda ayarlarını kontrol et.', {
        status: response.status,
      })
    }

    if (response.status === 409) {
      if (errorCode.toLowerCase().includes('full')) {
        throw new RoomRequestError('Bu oda dolu.', { status: response.status })
      }

      const normalizedError = errorCode.toLowerCase()
      const powerErrorMessages = [
        ['occupied square', 'Bomba için dolu bir kare seç.'],
        ['shielded stones', 'Kalkanlı taş bombalanamaz.'],
        ['your own stone', 'Kalkanı kendi taşına koyabilirsin.'],
        ['already shielded', 'Bu taş zaten kalkanlı.'],
        ['boost needs', 'Boost için boş bir kare seç.'],
        ['already boosted', 'Bu kare zaten boostlu.'],
        ['black hole needs', 'Kara Delik için boş bir kare seç.'],
        ['contains a black hole', 'Bu hedef uygun değil.'],
        ['already been used', 'Bu güç hakkın kalmadı.'],
        ["not this player's turn", 'Şu anda sıra sende değil.'],
      ]
      const powerError = powerErrorMessages.find(([key]) => normalizedError.includes(key))

      if (powerError) {
        throw new RoomRequestError(powerError[1], { status: response.status })
      }

      throw new RoomRequestError('Oda şu anda bu işleme uygun değil.', { status: response.status })
    }

    throw new RoomRequestError('Beklenmeyen bir hata oluştu. Biraz sonra tekrar deneyin.', {
      status: response.status,
    })
  }

  return response.json()
}

export function startRoom(roomCode, playerId) {
  return requestRoomJson(`/api/rooms/${roomCode}/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}
