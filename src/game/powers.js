export const powerDefinitions = [
  {
    id: 'bomb',
    name: 'Bomba',
    icon: '💣',
    description: 'Korumasız herhangi bir taşı kaldırır.',
    initialCount: 1,
  },
  {
    id: 'shield',
    name: 'Kalkan',
    icon: '🛡️',
    description: 'Kendi taşını saldırılara karşı korur.',
    initialCount: 1,
  },
  {
    id: 'boost',
    name: 'Boost',
    icon: '⚡',
    description: 'Sonraki hamlenin hücre puanını artırır.',
    initialCount: 1,
  },
  {
    id: 'joker',
    name: 'Joker',
    icon: '🃏',
    description: 'Rakibin taşını kendi taşına çevirir.',
    initialCount: 1,
  },
  {
    id: 'trap',
    name: 'Kara Delik',
    icon: '🕳️',
    description: 'Boş kareye gizli kara delik kurar. Rakip basarsa taşı kaybolur.',
    initialCount: 1,
  },
]

const localHumanPowerIds = ['bomb', 'shield', 'boost', 'trap']
const localAiPowerIds = ['bomb', 'shield', 'boost', 'trap']
const onlinePowerIds = ['bomb', 'shield', 'boost', 'trap']

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