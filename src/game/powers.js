export const powerDefinitions = [
  {
    id: 'bomb',
    name: 'Bomba',
    icon: '💣',
    description: 'Rakibin korumasız taşını kaldır.',
    initialCount: 1,
  },
  {
    id: 'shield',
    name: 'Kalkan',
    icon: '🛡️',
    description: 'Seçilen taşı koru. Sıra geçmez.',
    initialCount: 1,
  },
  // Boost: arka planda hazır, UI'dan gizli — ileride aktif edilebilir
  {
    id: 'boost',
    name: 'Boost',
    icon: '⚡',
    description: 'Hücre puanını 2 katına çıkar. Sıra geçmez.',
    initialCount: 0,
  },
  {
    id: 'trap',
    name: 'Kara Delik',
    icon: '🕳️',
    description: 'Boş kareye gizli tuzak kur. Rakip basarsa taşı kaybolur.',
    initialCount: 1,
  },
  {
    id: 'freeze',
    name: 'Dondur',
    icon: '❄️',
    description: 'Boş kareyi 1 tur kilitle. Sıra geçmez.',
    initialCount: 1,
  },
  {
    id: 'vampire',
    name: 'Vampir',
    icon: '🧛',
    description: 'Rakibin çarpanını kendi taşına çek. Sıra geçmez.',
    initialCount: 1,
  },
]

// Rewarded pack: Freeze veya Vampir (Joker kaldırıldı)
export const rewardedPowerIds = ['freeze', 'vampire']

export const ARENA_POWER_NAMES = {
  bomb: 'Bomba',
  shield: 'Kalkan',
  boost: 'Boost',
  trap: 'Kara Delik',
  freeze: 'Dondur',
  vampire: 'Vampir',
}

export function getPowerName(powerId, t) {
  if (!powerId) return ''
  if (typeof t === 'function') {
    const localized = t(`powers.${powerId}.name`)
    if (localized && !localized.startsWith('powers.')) {
      return localized
    }
  }
  return ARENA_POWER_NAMES[powerId] || powerId
}

export function getLocalizedPowerDefinition(power, t) {
  if (!power) return null
  if (typeof t !== 'function') return power
  return {
    ...power,
    name: t(`powers.${power.id}.name`) || power.name,
    description: t(`powers.${power.id}.desc`) || power.description,
  }
}

// Yan Yana (Local Human vs Human): Freeze + Vampir aktif, Boost/Joker yok
const localHumanPowerIds = ['bomb', 'shield', 'freeze', 'vampire']
// Bota Karşı (Local PvC): Kara Delik + Vampir aktif, Boost/Joker yok
const localAiPowerIds = ['bomb', 'shield', 'trap', 'vampire']
// Online: Kara Delik + Vampir aktif, Boost/Joker yok
const onlinePowerIds = ['bomb', 'shield', 'trap', 'vampire']

export function getAvailablePowerIds({
  gameMode,
  opponentType = 'human',
  playContext = 'local',
}) {
  if (gameMode !== 'arena') {
    return []
  }

  if (playContext === 'online') {
    return onlinePowerIds
  }

  if (opponentType === 'ai') {
    return localAiPowerIds
  }

  return localHumanPowerIds
}

export function getAvailablePowerDefinitions(options) {
  const availablePowerIds = getAvailablePowerIds(options)

  return powerDefinitions.filter((power) => availablePowerIds.includes(power.id))
}

export function createInitialPowerCounts(options = { gameMode: 'arena' }) {
  return getAvailablePowerDefinitions(options).reduce((counts, power) => {
    counts[power.id] = power.initialCount
    return counts
  }, {})
}

export function getPowerDefinitions(powerIds) {
  return powerDefinitions.filter((power) => powerIds.includes(power.id))
}
