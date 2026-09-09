const WINNER_MESSAGES_TR = [
  ['✨', 'Plan çalıştı.', 'Rövanş kokusu geldi.'],
  ['⚡', 'Bu tur hızlı bitti.', 'Rakip ısınamadı.'],
  ['🎯', 'Temiz çizgi.', 'Hamleler cuk oturdu.'],
  ['🔥', 'Tempo sende.', 'Baskı hissedildi.'],
  ['💫', 'Güzel kapanış.', 'Ego hafif çizildi.'],
  ['🏆', 'Tur cepte.', 'Bir sonraki daha sert.'],
]

const WINNER_MESSAGES_EN = [
  ['✨', 'Plan worked.', 'Revenge is brewing.'],
  ['⚡', 'Quick finish.', 'Opponent could not warm up.'],
  ['🎯', 'Clean line.', 'Moves landed perfectly.'],
  ['🔥', 'Momentum is yours.', 'Pressure was felt.'],
  ['💫', 'Great finish.', 'Ego slightly bruised.'],
  ['🏆', 'Round secured.', 'Next one will be tougher.'],
]

const LOSER_MESSAGES_TR = [
  'Ego hafif çizildi.',
  'Rövanş şart oldu.',
  'Plan biraz kaydı.',
  'Sessiz bir reset.',
  'Bir tur nefes al.',
]

const LOSER_MESSAGES_EN = [
  'Ego slightly bruised.',
  'Rematch is calling.',
  'Plan slipped away.',
  'Quiet reset.',
  'Catch your breath for the next round.',
]

const DRAW_MESSAGES_TR = [
  ['🤝', 'Berabere.', 'Hesaplaşma ertelendi.'],
  ['🧊', 'Tahta kilitlendi.', 'Kimse düşmedi.'],
  ['😶', 'Sıfır risk.', 'Sıfır kazanan.'],
  ['🎭', 'Denge bozulmadı.', 'Rövanş hazır.'],
]

const DRAW_MESSAGES_EN = [
  ['🤝', 'Draw.', 'Showdown postponed.'],
  ['🧊', 'Board locked.', 'Nobody fell.'],
  ['😶', 'Zero risk.', 'Zero winners.'],
  ['🎭', 'Balance unbroken.', 'Rematch ready.'],
]

export const winnerMessages = [...WINNER_MESSAGES_TR]
winnerMessages.tr = WINNER_MESSAGES_TR
winnerMessages.en = WINNER_MESSAGES_EN

export const loserMessages = [...LOSER_MESSAGES_TR]
loserMessages.tr = LOSER_MESSAGES_TR
loserMessages.en = LOSER_MESSAGES_EN

export const drawMessages = [...DRAW_MESSAGES_TR]
drawMessages.tr = DRAW_MESSAGES_TR
drawMessages.en = DRAW_MESSAGES_EN

export function getRandomMessage(messages, lang = 'tr') {
  const targetLang = lang === 'en' ? 'en' : 'tr'
  const list = Array.isArray(messages) && messages[targetLang]
    ? messages[targetLang]
    : Array.isArray(messages)
      ? messages
      : (messages?.[targetLang] ?? messages?.tr ?? Object.values(messages || {})[0] ?? [])

  if (!Array.isArray(list) || list.length === 0) return null
  const randomIndex = Math.floor(Math.random() * list.length)
  return list[randomIndex]
}

export function translateResultMessage(message, lang = 'tr') {
  if (!message) return message
  const targetLang = lang === 'en' ? 'en' : 'tr'

  if (Array.isArray(message)) {
    const icon = message[0]
    if (icon === '⏰') {
      const meta = message[3]
      if (meta && meta.type === 'timeout') {
        const { timedOutPlayerName, winnerName } = meta
        const displayTimedOut = targetLang === 'en'
          ? (timedOutPlayerName === 'Oyuncu' ? 'Player' : timedOutPlayerName)
          : (timedOutPlayerName === 'Player' ? 'Oyuncu' : timedOutPlayerName)
        const displayWinner = targetLang === 'en'
          ? (winnerName === 'Oyuncu' ? 'Player' : winnerName)
          : (winnerName === 'Player' ? 'Oyuncu' : winnerName)

        return targetLang === 'en'
          ? ['⏰', `${displayTimedOut}'s time ran out!`, `Round won by ${displayWinner}.`, meta]
          : ['⏰', `${displayTimedOut} Süresi Bitti!`, `Turu ${displayWinner} kazandı.`, meta]
      }
      if (typeof message[1] === 'string') {
        const matchTr = message[1].match(/^(.*?)\s*Süresi Bitti!/i)
        const matchEn = message[1].match(/^(.*?)(?:'s time ran out!| Time Is Up!| Timed Out!)/i)
        let rawPlayer = matchTr ? matchTr[1] : (matchEn ? matchEn[1] : 'Player')
        if (targetLang === 'en' && rawPlayer === 'Oyuncu') rawPlayer = 'Player'
        if (targetLang === 'tr' && rawPlayer === 'Player') rawPlayer = 'Oyuncu'

        const subMatchTr = typeof message[2] === 'string' ? message[2].match(/^Turu\s*(.*?)\s*kazandı\./i) : null
        const subMatchEn = typeof message[2] === 'string' ? message[2].match(/^Round won by\s*(.*?)\./i) : null
        let rawWinner = subMatchTr ? subMatchTr[1] : (subMatchEn ? subMatchEn[1] : 'Bot')
        if (targetLang === 'en' && rawWinner === 'Oyuncu') rawWinner = 'Player'
        if (targetLang === 'tr' && rawWinner === 'Player') rawWinner = 'Oyuncu'

        return targetLang === 'en'
          ? ['⏰', `${rawPlayer}'s time ran out!`, `Round won by ${rawWinner}.`]
          : ['⏰', `${rawPlayer} Süresi Bitti!`, `Turu ${rawWinner} kazandı.`]
      }
    }
    const winIdx = WINNER_MESSAGES_TR.findIndex((m) => m[0] === icon)
    if (winIdx !== -1) {
      return targetLang === 'en' ? WINNER_MESSAGES_EN[winIdx] : WINNER_MESSAGES_TR[winIdx]
    }
    const drawIdx = DRAW_MESSAGES_TR.findIndex((m) => m[0] === icon)
    if (drawIdx !== -1) {
      return targetLang === 'en' ? DRAW_MESSAGES_EN[drawIdx] : DRAW_MESSAGES_TR[drawIdx]
    }
    return message
  }

  if (typeof message === 'string') {
    const loserTrIdx = LOSER_MESSAGES_TR.indexOf(message)
    if (loserTrIdx !== -1) {
      return targetLang === 'en' ? LOSER_MESSAGES_EN[loserTrIdx] : LOSER_MESSAGES_TR[loserTrIdx]
    }
    const loserEnIdx = LOSER_MESSAGES_EN.indexOf(message)
    if (loserEnIdx !== -1) {
      return targetLang === 'en' ? LOSER_MESSAGES_EN[loserEnIdx] : LOSER_MESSAGES_TR[loserEnIdx]
    }
  }

  return message
}

export function translateLoserMessage(message, lang = 'tr') {
  return translateResultMessage(message, lang)
}
