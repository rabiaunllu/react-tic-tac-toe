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
]

export function createInitialPowerCounts() {
  return powerDefinitions.reduce((counts, power) => {
    counts[power.id] = power.initialCount
    return counts
  }, {})
}
