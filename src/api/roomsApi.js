export const API_BASE_URL = 'http://localhost:5243'

export function getRoomStatusText(status) {
  const statusMap = {
    waiting: 'Rakip bekleniyor',
    ready: 'Oyun hazır',
    playing: 'Oyun başladı',
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
    throw new Error('Backend çalışmıyor olabilir. Önce server/XoArena.Api projesini başlatın.')
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Bu oda işlemi için yetkiniz yok.')
    }

    if (response.status === 404) {
      throw new Error('Oda bulunamadı. Kodu kontrol edip tekrar deneyin.')
    }

    if (response.status === 400) {
      throw new Error('Eksik veya hatalı bilgi var. Oyuncu adı ve oda ayarlarını kontrol edin.')
    }

    if (response.status === 409) {
      throw new Error('Oda şu anda bu işleme uygun değil.')
    }

    throw new Error('Beklenmeyen bir hata oluştu. Biraz sonra tekrar deneyin.')
  }

  return response.json()
}

export function startRoom(roomCode, playerId) {
  return requestRoomJson(`/api/rooms/${roomCode}/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}
