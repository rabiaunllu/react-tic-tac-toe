export const campaignLevels = [
  // CHAPTER 1: Training Ground
  {
    id: 1,
    title: { en: 'First Steps', tr: 'İlk Adımlar' },
    description: { en: 'Win a classic 3x3 game', tr: 'Klasik 3x3 oyun kazan' },
    type: 'win',
    boardSize: 3,
    winLength: 3,
    difficulty: 'easy',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 9 },
      three: { condition: 'win_in_moves', value: 5 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'balanced',
    unlockCondition: null,
    reward: { type: 'xp', value: 100 },
  },
  {
    id: 2,
    title: { en: 'Explosive Tactics', tr: 'Patlayıcı Taktikler' },
    description: { en: 'Win a game using a Bomb power', tr: 'Bomba gücünü kullanarak kazan' },
    type: 'win',
    boardSize: 3,
    winLength: 3,
    difficulty: 'easy',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'power_used', value: 'bomb' },
      three: { condition: 'win_in_moves', value: 7 },
    },
    constraints: { requirePower: 'bomb' },
    initialBoard: null,
    initialPowers: { bomb: 2, shield: 0, freeze: 0, swap: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 1 },
    reward: { type: 'power', value: 'bomb' },
  },
  {
    id: 3,
    title: { en: 'Defensive Stance', tr: 'Savunma Duruşu' },
    description: { en: 'Win with a Shield power active on your pieces', tr: 'Parçalarında Kalkan gücü aktifken kazan' },
    type: 'win',
    boardSize: 3,
    winLength: 3,
    difficulty: 'easy',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 9 },
      three: { condition: 'win_in_moves', value: 7 },
    },
    constraints: { requirePower: 'shield' },
    initialBoard: null,
    initialPowers: { bomb: 0, shield: 2, freeze: 0, swap: 0, vampire: 0, trap: 0 },
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 2 },
    reward: { type: 'power', value: 'shield' },
  },
  {
    id: 4,
    title: { en: 'Point Maximizer', tr: 'Puan Çoğaltıcı' },
    description: { en: 'Win using cells with multipliers', tr: 'Çarpanlı hücreleri kullanarak kazan' },
    type: 'win',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'score_above', value: 100 },
      three: { condition: 'score_above', value: 200 },
    },
    constraints: { requireMultiplier: true },
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 3 },
    reward: { type: 'xp', value: 150 },
  },
  {
    id: 5,
    title: { en: 'Speed Demon', tr: 'Hız Tutkunu' },
    description: { en: 'Win the game in 5 moves or less', tr: 'Oyunu 5 hamle veya daha kısa sürede kazan' },
    type: 'challenge',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 7 },
      three: { condition: 'win_in_moves', value: 5 },
    },
    constraints: { maxMoves: 9 },
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'chaotic',
    unlockCondition: { type: 'level_complete', value: 4 },
    reward: { type: 'skin', value: 'emerald' },
  },
  
  // CHAPTER 2: Arena Tactics
  {
    id: 6,
    title: { en: 'The Fork Tactic', tr: 'Çatal Taktiği' },
    description: { en: 'Block the threat and create a double attack', tr: 'Tehdidi engelle ve çifte saldırı (çatal) kur' },
    type: 'puzzle',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 4 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: { maxMoves: 4 },
    initialBoard: [
      { player: 1 }, null, { player: 2 },
      null, { player: 2 }, null,
      null, { player: 1 }, null
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 5 },
    reward: { type: 'xp', value: 200 },
  },
  {
    id: 7,
    title: { en: 'Power Outage', tr: 'Güç Kesintisi' },
    description: { en: 'Win without using any powers', tr: 'Hiçbir güç kullanmadan kazan' },
    type: 'challenge',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 7 },
      three: { condition: 'win_in_moves', value: 5 },
    },
    constraints: { noPowers: true },
    initialBoard: null,
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 6 },
    reward: { type: 'xp', value: 200 },
  },
  {
    id: 8,
    title: { en: 'Cornered', tr: 'Kuşatma' },
    description: { en: 'Corners are blocked with lava. Use your powers to break the siege.', tr: 'Köşeler lav ile engellendi. Güçlerini kullanarak kuşatmayı yar ve kazan.' },
    type: 'win',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 7 },
      three: { condition: 'win_in_moves', value: 5 },
    },
    constraints: {},
    initialBoard: [
      { blocked: true }, null, null,
      null, null, null,
      null, null, { blocked: true }
    ],
    initialPowers: { bomb: 1, shield: 1, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 7 },
    reward: { type: 'xp', value: 250 },
  },
  {
    id: 9,
    title: { en: 'Vampire Strike', tr: 'Vampir Darbesi' },
    description: { en: 'Use the Vampire power to steal a win', tr: 'Kazanmak için Vampir gücünü kullan' },
    type: 'puzzle',
    boardSize: 3,
    winLength: 3,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 5 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: { requirePower: 'vampire' },
    initialBoard: [
      { player: 2, multiplier: 3 }, { player: 2 }, null,
      { player: 1 }, null, null,
      { player: 1 }, null, null
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 1, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 8 },
    reward: { type: 'power', value: 'vampire' },
  },
  {
    id: 10,
    title: { en: 'Aggression', tr: 'Saldırganlık' },
    description: { en: 'Defeat a highly aggressive AI', tr: 'Oldukça agresif bir yapay zekayı yen' },
    type: 'survival',
    boardSize: 3,
    winLength: 3,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 7 },
      three: { condition: 'win_in_moves', value: 5 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 9 },
    reward: { type: 'skin', value: 'gold' },
  },

  // CHAPTER 3: Expanded Battlefields
  {
    id: 11,
    title: { en: 'Larger Canvas', tr: 'Daha Büyük Tuval' },
    description: { en: 'Win on a 4x4 board (4 in a row)', tr: '4x4 tahtada kazan (4 lü seri)' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'medium',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 12 },
      three: { condition: 'win_in_moves', value: 7 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 10 },
    reward: { type: 'xp', value: 300 },
  },
  {
    id: 12,
    title: { en: 'Multiplier Madness', tr: 'Çarpan Çılgınlığı' },
    description: { en: 'Get a massive score on a 4x4 board', tr: '4x4 tahtada devasa bir skor elde et' },
    type: 'challenge',
    boardSize: 4,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'score_above', value: 500 },
      three: { condition: 'score_above', value: 1000 },
    },
    constraints: {},
    initialBoard: null, // Game engine should add random multipliers
    initialPowers: null,
    aiPersonality: 'chaotic',
    unlockCondition: { type: 'level_complete', value: 11 },
    reward: { type: 'xp', value: 350 },
  },
  {
    id: 13,
    title: { en: 'Chaos Theory', tr: 'Kaos Teorisi' },
    description: { en: 'Survive the chaotic AI', tr: 'Kaotik yapay zekaya karşı hayatta kal' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 15 },
      three: { condition: 'win_in_moves', value: 9 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'chaotic',
    unlockCondition: { type: 'level_complete', value: 12 },
    reward: { type: 'xp', value: 400 },
  },
  {
    id: 14,
    title: { en: 'Blockade', tr: 'Abluka' },
    description: { en: 'Navigate through a blocked board using powers', tr: 'Engelli tahtada güçlerini kullanarak zaferi kazan' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 12 },
      three: { condition: 'win_in_moves', value: 8 },
    },
    constraints: {},
    initialBoard: [
      { blocked: true }, null, null, null,
      null, null, null, null,
      null, null, null, null,
      null, null, null, { blocked: true }
    ],
    initialPowers: { bomb: 1, shield: 0, freeze: 1, vampire: 0, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 13 },
    reward: { type: 'power', value: 'freeze' },
  },
  {
    id: 15,
    title: { en: 'Freeze Frame', tr: 'Dondurulmuş Kare' },
    description: { en: 'Freeze the critical square and set up a double threat', tr: 'Kritik kareyi dondur ve çifte tehdit kurarak kazan' },
    type: 'puzzle',
    boardSize: 4,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 5 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: {},
    initialBoard: [
      { player: 2 }, { player: 2 }, { player: 2 }, null,
      null, null, null, { player: 1 },
      null, null, null, { player: 1 },
      null, { player: 1 }, { player: 1 }, null
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 1, vampire: 0, trap: 0 },
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 14 },
    reward: { type: 'skin', value: 'ice' },
  },

  // CHAPTER 4: Power Master
  {
    id: 16,
    title: { en: 'Trap Setter', tr: 'Tuzak Kurucu' },
    description: { en: 'Win using traps effectively', tr: 'Tuzakları etkili kullanarak kazan' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 11 },
      three: { condition: 'win_in_moves', value: 7 },
    },
    constraints: { requirePower: 'trap' },
    initialBoard: null,
    initialPowers: { bomb: 0, shield: 0, freeze: 0, swap: 0, vampire: 0, trap: 3 },
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 15 },
    reward: { type: 'power', value: 'trap' },
  },
  {
    id: 17,
    title: { en: 'Vampiric Drain', tr: 'Vampir Sömürüsü' },
    description: { en: 'Steal the AI points with Vampire', tr: 'Yapay zekanın puanlarını Vampir ile çal' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'score_above', value: 400 },
      three: { condition: 'score_above', value: 800 },
    },
    constraints: { requirePower: 'vampire' },
    initialBoard: null,
    initialPowers: { bomb: 0, shield: 0, freeze: 0, swap: 0, vampire: 3, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 16 },
    reward: { type: 'power', value: 'vampire' },
  },
  {
    id: 18,
    title: { en: 'Shield Wall', tr: 'Kalkan Duvarı' },
    description: { en: 'Break through the AIs defenses', tr: 'Yapay zekanın savunmasını kır' },
    type: 'challenge',
    boardSize: 4,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 15 },
      three: { condition: 'win_in_moves', value: 11 },
    },
    constraints: {},
    initialBoard: [
      { player: 2, power: 'shield' }, null, { player: 2, power: 'shield' }, null,
      null, { player: 2, power: 'shield' }, null, null,
      null, null, null, null,
      null, null, null, null
    ],
    initialPowers: { bomb: 2, shield: 1, freeze: 1, vampire: 0, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 17 },
    reward: { type: 'xp', value: 500 },
  },
  {
    id: 19,
    title: { en: 'Double Threat', tr: 'Çifte Tehdit' },
    description: { en: 'Find the hub square to create a double attack', tr: 'Merkez kareyi bularak çifte saldırı tehdidi kur' },
    type: 'puzzle',
    boardSize: 4,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 5 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: { maxMoves: 4 },
    initialBoard: [
      null, null, { player: 1 }, { player: 1 },
      { player: 2 }, null, { player: 2 }, null,
      null, { player: 1 }, { player: 2 }, null,
      null, { player: 1 }, null, { player: 2 }
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 18 },
    reward: { type: 'xp', value: 550 },
  },
  {
    id: 20,
    title: { en: 'Nuclear Option', tr: 'Nükleer Seçenek' },
    description: { en: 'Use Bombs to clear the path to victory', tr: 'Zafere giden yolu temizlemek için Bombaları kullan' },
    type: 'win',
    boardSize: 4,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 15 },
      three: { condition: 'win_in_moves', value: 9 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: { bomb: 5, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 19 },
    reward: { type: 'skin', value: 'toxic_green' },
  },

  // CHAPTER 5: The Gauntlet
  {
    id: 21,
    title: { en: 'The Gauntlet Begins', tr: 'Zorlu Sınav Başlıyor' },
    description: { en: 'Win on a 5x5 board (4 in a row)', tr: '5x5 tahtada kazan (4 lü seri)' },
    type: 'win',
    boardSize: 5,
    winLength: 4,
    difficulty: 'hard',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 15 },
      three: { condition: 'win_in_moves', value: 11 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 20 },
    reward: { type: 'xp', value: 600 },
  },
  {
    id: 22,
    title: { en: 'Five in a Row', tr: 'Beşli Seri' },
    description: { en: 'Connect 5 to win', tr: 'Kazanmak için 5 tanesini birleştir' },
    type: 'win',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 19 },
      three: { condition: 'win_in_moves', value: 13 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: null,
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 21 },
    reward: { type: 'xp', value: 650 },
  },
  {
    id: 23,
    title: { en: 'Minefield', tr: 'Mayın Tarlası' },
    description: { en: 'Avoid pre-placed traps', tr: 'Önceden yerleştirilmiş tuzaklardan kaçın' },
    type: 'survival',
    boardSize: 5,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 17 },
      three: { condition: 'win_in_moves', value: 11 },
    },
    constraints: {},
    initialBoard: [
      null, null, { trap: true }, null, null,
      null, { trap: true }, null, { trap: true }, null,
      { trap: true }, null, null, null, { trap: true },
      null, { trap: true }, null, { trap: true }, null,
      null, null, { trap: true }, null, null
    ],
    initialPowers: null,
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 22 },
    reward: { type: 'xp', value: 700 },
  },
  {
    id: 24,
    title: { en: 'Center Control', tr: 'Merkez Kontrolü' },
    description: { en: 'Control the middle to win', tr: 'Kazanmak için ortayı kontrol et' },
    type: 'win',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 21 },
      three: { condition: 'win_in_moves', value: 15 },
    },
    constraints: {},
    initialBoard: [
      { blocked: true }, null, null, null, { blocked: true },
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      { blocked: true }, null, null, null, { blocked: true }
    ],
    initialPowers: null,
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 23 },
    reward: { type: 'xp', value: 800 },
  },
  {
    id: 25,
    title: { en: 'The Maze', tr: 'Labirent' },
    description: { en: 'A complex 5x5 layout', tr: 'Karmaşık 5x5 düzeni' },
    type: 'win',
    boardSize: 5,
    winLength: 4,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 17 },
      three: { condition: 'win_in_moves', value: 13 },
    },
    constraints: {},
    initialBoard: [
      null, { blocked: true }, null, { blocked: true }, null,
      { blocked: true }, null, null, null, { blocked: true },
      null, null, { player: 2 }, null, null,
      { blocked: true }, null, null, null, { blocked: true },
      null, { blocked: true }, null, { blocked: true }, null
    ],
    initialPowers: { bomb: 1, shield: 1, freeze: 1, vampire: 1, trap: 1 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 24 },
    reward: { type: 'skin', value: 'golden_crown' },
  },

  // CHAPTER 6: Grandmaster
  {
    id: 26,
    title: { en: 'Master Tactician', tr: 'Büyük Taktisyen' },
    description: { en: 'Block the diagonal and create a 5x5 fork', tr: 'Çaprazı engelle ve 5x5 tahtada çatal kur' },
    type: 'puzzle',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 4 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: { maxMoves: 4 },
    initialBoard: [
      { player: 2 }, null, null, null, { player: 1 },
      null, { player: 2 }, null, null, { player: 1 },
      null, null, { player: 2 }, null, { player: 1 },
      null, null, null, { player: 2 }, null,
      { player: 1 }, { player: 1 }, { player: 1 }, null, null
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced',
    unlockCondition: { type: 'level_complete', value: 25 },
    reward: { type: 'xp', value: 1000 },
  },
  {
    id: 27,
    title: { en: 'Block the Win', tr: 'Galibiyeti Engelle' },
    description: { en: 'Block the lethal diagonal and strike back with a double threat', tr: 'Ölümcül çaprazı engelle ve çifte saldırıyla zaferi al' },
    type: 'puzzle',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 4 },
      three: { condition: 'win_in_moves', value: 3 },
    },
    constraints: { maxMoves: 4 },
    initialBoard: [
      { player: 1 }, null, null, null, { player: 2 },
      { player: 1 }, null, null, { player: 2 }, null,
      { player: 1 }, null, { player: 2 }, null, null,
      null, { player: 2 }, null, null, null,
      null, null, { player: 1 }, { player: 1 }, { player: 1 }
    ],
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'aggressive',
    unlockCondition: { type: 'level_complete', value: 26 },
    reward: { type: 'xp', value: 1000 },
  },
  {
    id: 28,
    title: { en: 'Ultimate Combo', tr: 'Nihai Kombo' },
    description: { en: 'Use every power in the game to win', tr: 'Kazanmak için oyundaki tüm güçleri kullan' },
    type: 'challenge',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'score_above', value: 1000 },
      three: { condition: 'score_above', value: 2000 },
    },
    constraints: {},
    initialBoard: null,
    initialPowers: { bomb: 1, shield: 1, freeze: 1, vampire: 1, trap: 1 },
    aiPersonality: 'chaotic',
    unlockCondition: { type: 'level_complete', value: 27 },
    reward: { type: 'xp', value: 1500 },
  },
  {
    id: 29,
    title: { en: 'Impossible Odds', tr: 'İmkansız İhtimaller' },
    description: { en: 'Defeat a fully shielded AI', tr: 'Tamamen kalkanlı bir yapay zekayı yen' },
    type: 'survival',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 21 },
      three: { condition: 'win_in_moves', value: 15 },
    },
    constraints: {},
    initialBoard: [
      { player: 2, power: 'shield' }, { player: 2, power: 'shield' }, null, null, null,
      { player: 2, power: 'shield' }, { player: 2, power: 'shield' }, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null
    ],
    initialPowers: { bomb: 3, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'defensive',
    unlockCondition: { type: 'level_complete', value: 28 },
    reward: { type: 'xp', value: 2000 },
  },
  {
    id: 30,
    title: { en: 'The Final Boss', tr: 'Son Patron' },
    description: { en: 'No powers, 5x5 board, 5 in a row. Pure skill.', tr: 'Güç yok, 5x5 tahta, 5 lü seri. Saf yetenek.' },
    type: 'win',
    boardSize: 5,
    winLength: 5,
    difficulty: 'expert',
    stars: {
      one: { condition: 'win' },
      two: { condition: 'win_in_moves', value: 25 },
      three: { condition: 'win_in_moves', value: 17 },
    },
    constraints: { noPowers: true },
    initialBoard: null,
    initialPowers: { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 },
    aiPersonality: 'balanced', // Near perfect AI expected by game engine on expert + balanced
    unlockCondition: { type: 'level_complete', value: 29 },
    reward: { type: 'skin', value: 'cosmic' },
  }
];

export const chapters = [
  { id: 1, title: { en: 'Training Ground', tr: 'Eğitim Alanı' }, levels: [1, 2, 3, 4, 5], icon: '🎯' },
  { id: 2, title: { en: 'Arena Tactics', tr: 'Arena Taktikleri' }, levels: [6, 7, 8, 9, 10], icon: '⚔️' },
  { id: 3, title: { en: 'Expanded Battlefields', tr: 'Genişletilmiş Savaş Alanları' }, levels: [11, 12, 13, 14, 15], icon: '🗺️' },
  { id: 4, title: { en: 'Power Master', tr: 'Güç Ustası' }, levels: [16, 17, 18, 19, 20], icon: '⚡' },
  { id: 5, title: { en: 'The Gauntlet', tr: 'Zorlu Sınav' }, levels: [21, 22, 23, 24, 25], icon: '🛡️' },
  { id: 6, title: { en: 'Grandmaster', tr: 'Büyük Usta' }, levels: [26, 27, 28, 29, 30], icon: '👑' }
];

export function getLevelById(id) {
  return campaignLevels.find(level => level.id === id);
}

export function getChapterForLevel(levelId) {
  return chapters.find(chapter => chapter.levels.includes(levelId));
}

/**
 * Extracts mission board setup into squares, blocked indices, and shielded indices.
 * Prevents { blocked: true } from turning into 'O' marks and restores shields.
 */
export function extractMissionBoardSetup(initialBoardOrMission, boardSize) {
  let board = initialBoardOrMission;
  let size = Number(boardSize) || 3;

  if (initialBoardOrMission && typeof initialBoardOrMission === 'object' && !Array.isArray(initialBoardOrMission)) {
    if ('initialBoard' in initialBoardOrMission) {
      board = initialBoardOrMission.initialBoard;
      size = Number(initialBoardOrMission.boardSize) || size;
    }
  }

  const expectedLength = Math.max(9, size * size);
  if (!Array.isArray(board) || board.length !== expectedLength) {
    return {
      squares: Array(expectedLength).fill(null),
      blockedSquares: [],
      shieldedSquares: [],
      multipliers: {},
    };
  }

  const squares = [];
  const blockedSquares = [];
  const shieldedSquares = [];
  const multipliers = {};

  board.forEach((cell, index) => {
    if (!cell) {
      squares.push(null);
      return;
    }

    if (cell === 'X' || cell === 'O') {
      squares.push(cell);
      return;
    }

    if (cell.blocked) {
      squares.push(null);
      blockedSquares.push(index);
      return;
    }

    const symbol = cell.player === 1 || cell.player === 'X' ? 'X' : 'O';
    squares.push(symbol);

    if (cell.power === 'shield') {
      shieldedSquares.push(index);
    }

    if (cell.multiplier) {
      multipliers[index] = cell.multiplier;
    }
  });

  return { squares, blockedSquares, shieldedSquares, multipliers };
}

/**
 * Validates mission constraints (maxMoves, exactMoves, noPowers, requirePower, etc.)
 */
export function evaluateMissionConstraints(mission, {
  moves = 0,
  roundScore = 0,
  usedPowerIds = [],
  winningLine = [],
  multipliers = {},
  boostedSquares = [],
} = {}) {
  const constraints = mission?.constraints ?? {};
  const failures = [];

  if (constraints.maxMoves != null && moves > constraints.maxMoves) {
    failures.push({
      type: 'maxMoves',
      expected: constraints.maxMoves,
      actual: moves,
      messageTr: `En fazla ${constraints.maxMoves} hamle sınırı aşıldı (${moves} hamle yapıldı).`,
      messageEn: `Move limit of ${constraints.maxMoves} exceeded (${moves} moves made).`,
    });
  }

  if (constraints.exactMoves != null && moves !== constraints.exactMoves) {
    failures.push({
      type: 'exactMoves',
      expected: constraints.exactMoves,
      actual: moves,
      messageTr: `Tam olarak ${constraints.exactMoves} hamlede kazanılmalıydı (${moves} hamle yapıldı).`,
      messageEn: `Must win in exactly ${constraints.exactMoves} move(s) (${moves} moves made).`,
    });
  }

  if (constraints.noPowers === true && usedPowerIds.length > 0) {
    failures.push({
      type: 'noPowers',
      messageTr: 'Güç kullanılmadan kazanılmalıydı.',
      messageEn: 'No powers allowed for this challenge.',
    });
  }

  if (constraints.requirePower && !usedPowerIds.includes(constraints.requirePower)) {
    failures.push({
      type: 'requirePower',
      expected: constraints.requirePower,
      messageTr: `Zorunlu güç ("${constraints.requirePower}") kullanılmadı.`,
      messageEn: `Required power ("${constraints.requirePower}") was not used.`,
    });
  }

  if (constraints.requireMultiplier === true) {
    const hasMultiplier = winningLine && winningLine.some(
      (index) => (multipliers?.[index] ?? 1) > 1 || boostedSquares.includes(index)
    );
    if (!hasMultiplier) {
      failures.push({
        type: 'requireMultiplier',
        messageTr: 'Kazanan çizgide çarpanlı hücre kullanılmalıydı.',
        messageEn: 'Winning line must include a multiplier cell.',
      });
    }
  }

  if (constraints.score_above != null && roundScore < constraints.score_above) {
    failures.push({
      type: 'score_above',
      expected: constraints.score_above,
      actual: roundScore,
      messageTr: `En az ${constraints.score_above} puan gerekiyordu (Mevcut: ${roundScore}).`,
      messageEn: `Target score of ${constraints.score_above} not reached (Current: ${roundScore}).`,
    });
  }

  return {
    success: failures.length === 0,
    failures,
  };
}

/**
 * Checks if a single star objective is met.
 */
export function evaluateSingleStar(starConfig, { moves = 0, roundScore = 0, usedPowerIds = [] } = {}) {
  if (!starConfig) return false;
  const cond = starConfig.condition;

  switch (cond) {
    case 'win':
      return true;
    case 'win_in_moves':
      return moves <= (starConfig.value ?? Infinity);
    case 'power_used':
      return usedPowerIds.includes(starConfig.value);
    case 'score_above':
      return roundScore >= (starConfig.value ?? 0);
    case 'no_powers':
      return usedPowerIds.length === 0;
    default:
      return true;
  }
}

/**
 * Evaluates total stars (1-3) earned for a campaign level.
 */
export function evaluateMissionStars(mission, context = {}) {
  if (!mission?.stars) return 1;

  let stars = 1;

  if (mission.stars.two && evaluateSingleStar(mission.stars.two, context)) {
    stars += 1;
  }

  if (mission.stars.three && evaluateSingleStar(mission.stars.three, context)) {
    stars += 1;
  }

  return Math.min(3, Math.max(1, stars));
}

import { safeGetItem, safeSetItem, STORAGE_KEYS, sanitizeCampaignProgress } from '../services/storageService';

export { sanitizeCampaignProgress as validateCampaignProgress };

/**
 * Unlocks a skin reward safely with cloud sync.
 */
export function unlockSkinReward(skinId) {
  if (!skinId) return;
  try {
    const saved = safeGetItem(STORAGE_KEYS.SKINS, {});
    // Permanent unlock (10 years in future)
    saved[skinId] = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    safeSetItem(STORAGE_KEYS.SKINS, saved);
  } catch (e) {
    console.error('Failed to unlock skin reward', e);
  }
}
