export const winnerMessages = [
  ['✨', 'Plan çalıştı.', 'Rövanş kokusu geldi.'],
  ['⚡', 'Bu round hızlı bitti.', 'Rakip ısınamadı.'],
  ['🎯', 'Temiz çizgi.', 'Hamleler cuk oturdu.'],
  ['🔥', 'Tempo sende.', 'Baskı hissedildi.'],
  ['💫', 'Güzel kapanış.', 'Ego hafif çizildi.'],
  ['🏆', 'Round cepte.', 'Bir sonraki daha sert.'],
]

export const loserMessages = [
  'Ego hafif çizildi.',
  'Rövanş şart oldu.',
  'Plan biraz kaydı.',
  'Sessiz bir reset.',
  'Bir tur nefes al.',
]

export const drawMessages = [
  ['🤝', 'Berabere.', 'Hesaplaşma ertelendi.'],
  ['🧊', 'Tahta kilitlendi.', 'Kimse düşmedi.'],
  ['😶', 'Sıfır risk.', 'Sıfır kazanan.'],
  ['🎭', 'Denge bozulmadı.', 'Rövanş hazır.'],
]

export function getRandomMessage(messages) {
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}
