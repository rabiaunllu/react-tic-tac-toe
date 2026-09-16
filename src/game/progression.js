// XP rewards for different actions
export const XP_REWARDS = {
  win_classic: 10,
  win_arena: 15,
  win_campaign_level: 25,
  draw: 3,
  loss: 2,
  perfect_win: 20,      // win without opponent scoring
  power_used: 2,
  multiplier_captured: 5,
  daily_challenge: 50,
  streak_bonus_per: 5,   // per win in streak
  three_star_level: 15,  // bonus for 3-star completion
};

// Calculate required XP for a given level
export function getXPForLevel(level) {
  if (level <= 1) return 0;
  
  // Exponential curve that flattens after level 15
  if (level <= 15) {
    // Level 1: 0, Level 2: 50, Level 3: 141, Level 4: 259, Level 5: 400
    return Math.floor(50 * Math.pow(level - 1, 1.5));
  } else {
    // Linear scaling after level 15
    const xp15 = Math.floor(50 * Math.pow(14, 1.5));
    return xp15 + (level - 15) * 1500;
  }
}

// Determine current level based on total XP
export function getLevelForXP(totalXP) {
  let level = 1;
  while (getXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

// Get detailed progress information for UI
export function getXPProgress(totalXP) {
  const level = getLevelForXP(totalXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const currentXP = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  
  // Calculate percentage (0 to 100)
  let percentage = (currentXP / xpNeeded) * 100;
  percentage = Math.min(100, Math.max(0, percentage));
  
  return { 
    level, 
    currentXP: totalXP, // Total XP across all levels
    currentLevelXP,     // XP at the start of current level
    nextLevelXP,        // XP required for next level
    xpIntoLevel: currentXP, // XP earned in current level
    xpNeeded,           // Total XP needed to complete current level
    percentage 
  };
}

// Unlockables per Level
export const LEVEL_UNLOCKS = [
  { level: 1, type: 'mode', value: 'classic', label: { en: 'Classic Mode', tr: 'Klasik Mod' } },
  { level: 2, type: 'board', value: '4x4', label: { en: '4x4 Board', tr: '4x4 Tahta' } },
  { level: 3, type: 'mode', value: 'arena', label: { en: 'Arena Mode', tr: 'Arena Modu' } },
  { level: 5, type: 'board', value: '5x5', label: { en: '5x5 Board', tr: '5x5 Tahta' } },
  { level: 7, type: 'skin', value: 'gold', label: { en: 'Gold Legend Skin', tr: 'Altın Efsane Teması' } },
  { level: 10, type: 'mode', value: 'campaign', label: { en: 'Puzzle Quest', tr: 'Bulmaca Seferi' } },
  { level: 12, type: 'skin', value: 'emerald', label: { en: 'Emerald Retro Skin', tr: 'Zümrüt Retro Teması' } },
  { level: 15, type: 'skin', value: 'cosmic', label: { en: 'Cosmic Purple Skin', tr: 'Kozmik Mor Teması' } },
  { level: 18, type: 'feature', value: 'daily_challenge', label: { en: 'Daily Challenge', tr: 'Günlük Görev' } },
  { level: 20, type: 'skin', value: 'ice', label: { en: 'Ice Crystal Skin', tr: 'Buz Kristali Teması' } },
];

// Achievements Definitions
export const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', title: { en: 'First Victory', tr: 'İlk Zafer' }, desc: { en: 'Win your first game', tr: 'İlk oyununu kazan' }, xpReward: 25 },
  { id: 'power_user', icon: '⚡', title: { en: 'Power User', tr: 'Güç Ustası' }, desc: { en: 'Use 10 powers total', tr: 'Toplam 10 güç kullan' }, xpReward: 30 },
  { id: 'streak_3', icon: '🔥', title: { en: 'On Fire!', tr: 'Alevlerde!' }, desc: { en: 'Win 3 games in a row', tr: '3 oyun üst üste kazan' }, xpReward: 40 },
  { id: 'streak_5', icon: '💎', title: { en: 'Unstoppable', tr: 'Durdurulamaz' }, desc: { en: 'Win 5 games in a row', tr: '5 oyun üst üste kazan' }, xpReward: 75 },
  { id: 'arena_master', icon: '🎭', title: { en: 'Arena Master', tr: 'Arena Ustası' }, desc: { en: 'Win 10 Arena games', tr: '10 Arena oyunu kazan' }, xpReward: 50 },
  { id: 'big_board', icon: '📐', title: { en: 'Think Big', tr: 'Büyük Düşün' }, desc: { en: 'Win on a 5x5 board', tr: '5x5 tahtada kazan' }, xpReward: 35 },
  { id: 'bomb_expert', icon: '💣', title: { en: 'Demolition Expert', tr: 'Yıkım Uzmanı' }, desc: { en: 'Use Bomb 5 times', tr: '5 kez Bomba kullan' }, xpReward: 25 },
  { id: 'shield_wall', icon: '🛡️', title: { en: 'Shield Wall', tr: 'Kalkan Duvarı' }, desc: { en: 'Successfully block 3 bomb attacks with shield', tr: '3 bomba saldırısını kalkanla engelle' }, xpReward: 40 },
  { id: 'multiplier_king', icon: '👑', title: { en: 'Multiplier King', tr: 'Çarpan Kralı' }, desc: { en: 'Win with 3x multiplier on winning line', tr: 'Kazanan çizgide 3x çarpan ile kazan' }, xpReward: 45 },
  { id: 'speed_demon', icon: '⏱️', title: { en: 'Speed Demon', tr: 'Hız Şeytanı' }, desc: { en: 'Win a game in under 30 seconds', tr: '30 saniyenin altında oyun kazan' }, xpReward: 50 },
  { id: 'campaign_5', icon: '⭐', title: { en: 'Rising Star', tr: 'Yükselen Yıldız' }, desc: { en: 'Complete 5 puzzle quests', tr: '5 bulmaca tamamla' }, xpReward: 40 },
  { id: 'campaign_15', icon: '🌟', title: { en: 'Veteran', tr: 'Deneyimli' }, desc: { en: 'Complete 15 puzzle quests', tr: '15 bulmaca tamamla' }, xpReward: 75 },
  { id: 'campaign_30', icon: '💫', title: { en: 'Grandmaster', tr: 'Büyük Usta' }, desc: { en: 'Complete all 30 puzzle quests', tr: '30 bulmacanın tamamını çöz' }, xpReward: 150 },
  { id: 'all_stars', icon: '✨', title: { en: 'Perfectionist', tr: 'Mükemmeliyetçi' }, desc: { en: 'Get 3 stars on 10 levels', tr: '10 seviyede 3 yıldız al' }, xpReward: 100 },
];

import { safeGetItem, safeSetItem, STORAGE_KEYS, computeChecksum } from '../services/storageService';

const PROGRESSION_SALT = 'xo-tactix-prog-v2';
const LEGACY_STORAGE_KEY = 'xo-tactix-progress';

// Default progress object
const DEFAULT_PROGRESS = {
  totalXP: 0,
  level: 1,
  achievements: [], // Array of unlocked achievement IDs
  campaignStars: {}, // Map of level ID to stars (e.g., { "1": 3 })
  stats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    powersUsed: 0,
    bombsUsed: 0,
    shieldsBlocked: 0
  }
};

/**
 * Validates integrity of progression data via checksum signature.
 */
export function verifyProgressionIntegrity(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (!raw._sig) return true; // Legacy save before tamper signing
  const testObj = { ...raw };
  delete testObj._sig;
  return computeChecksum(testObj, PROGRESSION_SALT) === raw._sig;
}

/**
 * Sanitizes progression data, enforcing valid level formulas and valid achievement IDs.
 */
export function sanitizeProgression(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PROGRESS, stats: { ...DEFAULT_PROGRESS.stats } };
  }

  const isTampered = Boolean(raw._sig && !verifyProgressionIntegrity(raw));
  if (isTampered) {
    console.warn('[Security] Progression data tampering detected! Resetting to safe defaults.');
  }

  const validAchievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const rawAchievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  const cleanAchievements = isTampered ? [] : rawAchievements.filter((id) => validAchievementIds.has(id));

  const rawStats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const gamesPlayed = Math.max(0, parseInt(rawStats.gamesPlayed, 10) || 0);
  const wins = Math.max(0, Math.min(gamesPlayed, parseInt(rawStats.wins, 10) || 0));
  const losses = Math.max(0, Math.min(gamesPlayed - wins, parseInt(rawStats.losses, 10) || 0));
  const draws = Math.max(0, Math.min(gamesPlayed - wins - losses, parseInt(rawStats.draws, 10) || 0));
  const currentStreak = Math.max(0, Math.min(wins, parseInt(rawStats.currentStreak, 10) || 0));
  const bestStreak = Math.max(currentStreak, Math.min(wins, parseInt(rawStats.bestStreak, 10) || 0));

  const totalXP = Math.max(0, parseInt(raw.totalXP, 10) || 0);
  // Cap max possible XP based on match history to thwart manual DevTools inflation
  const maxPlausibleXP = Math.max(10000, gamesPlayed * 250 + 15000);
  const safeTotalXP = isTampered ? 0 : Math.min(maxPlausibleXP, totalXP);
  const calculatedLevel = getLevelForXP(safeTotalXP);

  const cleanCampaignStars = {};
  if (!isTampered && raw.campaignStars && typeof raw.campaignStars === 'object' && !Array.isArray(raw.campaignStars)) {
    for (const [lvlIdStr, stars] of Object.entries(raw.campaignStars)) {
      const lvlId = parseInt(lvlIdStr, 10);
      if (Number.isInteger(lvlId) && lvlId >= 1 && lvlId <= 30) {
        cleanCampaignStars[lvlId] = Math.min(3, Math.max(1, parseInt(stars, 10) || 1));
      }
    }
  }

  return {
    ...DEFAULT_PROGRESS,
    totalXP: safeTotalXP,
    level: calculatedLevel, // Enforce strictly calculated level from XP formula
    achievements: cleanAchievements,
    campaignStars: cleanCampaignStars,
    stats: {
      ...DEFAULT_PROGRESS.stats,
      gamesPlayed,
      wins,
      losses,
      draws,
      currentStreak,
      bestStreak,
      powersUsed: Math.max(0, parseInt(rawStats.powersUsed, 10) || 0),
      bombsUsed: Math.max(0, parseInt(rawStats.bombsUsed, 10) || 0),
      shieldsBlocked: Math.max(0, parseInt(rawStats.shieldsBlocked, 10) || 0),
    },
  };
}

// Load progress safely with sanitization and legacy migration
export function loadProgress() {
  let saved = safeGetItem(STORAGE_KEYS.PROGRESSION, null);
  if (!saved) {
    const legacy = safeGetItem(LEGACY_STORAGE_KEY, null);
    if (legacy) {
      saved = legacy;
      const migrated = sanitizeProgression(legacy);
      saveProgress(migrated);
    }
  }
  return sanitizeProgression(saved);
}

// Save progress safely with sanitization, tamper signature, and cloud sync
export function saveProgress(progress) {
  const clean = sanitizeProgression(progress);
  delete clean._sig;
  clean._sig = computeChecksum(clean, PROGRESSION_SALT);
  safeSetItem(STORAGE_KEYS.PROGRESSION, clean);
  safeSetItem(LEGACY_STORAGE_KEY, clean, { syncCloud: false });
}

// Add XP and check for level ups
export function addXP(amount, reason = 'gameplay') {
  void reason;
  if (amount <= 0) return { newXP: 0, leveledUp: false, newLevel: 1, newUnlocks: [] };

  const progress = loadProgress();
  const oldLevel = progress.level;
  
  progress.totalXP += amount;
  progress.level = getLevelForXP(progress.totalXP);
  
  const leveledUp = progress.level > oldLevel;
  const newUnlocks = [];
  
  if (leveledUp) {
    // Find all unlocks between oldLevel (exclusive) and newLevel (inclusive)
    LEVEL_UNLOCKS.forEach(unlock => {
      if (unlock.level > oldLevel && unlock.level <= progress.level) {
        newUnlocks.push(unlock);
      }
    });
  }
  
  saveProgress(progress);
  
  return {
    newXP: progress.totalXP,
    leveledUp,
    newLevel: progress.level,
    newUnlocks
  };
}

// Unlock an achievement
// Returns the achievement data if newly unlocked, null if already had
export function unlockAchievement(achievementId) {
  const progress = loadProgress();
  
  if (progress.achievements.includes(achievementId)) {
    return null; // Already unlocked
  }
  
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return null; // Invalid achievement ID
  
  progress.achievements.push(achievementId);
  saveProgress(progress);
  
  // Add XP reward for achievement
  if (achievement.xpReward) {
    addXP(achievement.xpReward, 'achievement');
  }
  
  return achievement;
}

// Get all unlocked content based on current level
export function getUnlockedContent(totalXP) {
  const level = getLevelForXP(totalXP);
  
  const unlocked = {
    modes: [],
    boards: [],
    skins: [],
    features: []
  };
  
  LEVEL_UNLOCKS.forEach(unlock => {
    if (level >= unlock.level) {
      if (unlock.type === 'mode') unlocked.modes.push(unlock.value);
      if (unlock.type === 'board') unlocked.boards.push(unlock.value);
      if (unlock.type === 'skin') unlocked.skins.push(unlock.value);
      if (unlock.type === 'feature') unlocked.features.push(unlock.value);
    }
  });
  
  return unlocked;
}
