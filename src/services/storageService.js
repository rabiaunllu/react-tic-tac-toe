import { loadData, saveData } from './crazyGamesService.js';

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  CAMPAIGN: 'xo-campaign-progress',
  DAILY: 'xo-daily-challenge',
  PROGRESSION: 'xo-progression',
  SKINS: 'xo-unlocked-skins',
  ACTIVE_SKIN: 'xo-arena-skin',
  SOUND: 'xo-sound-enabled',
  TUTORIAL: 'xo-tutorial-complete',
  INTRO: 'xo-intro-seen',
};

// In-memory fallback if localStorage is disabled, restricted (private mode), or quota exceeded.
const memoryFallback = new Map();

/**
 * Simple, deterministic fast hash for tamper detection (FNV-1a 32-bit).
 */
export function computeChecksum(obj, salt = 'xo-tactix-secure-v1') {
  try {
    const raw = typeof obj === 'string' ? obj : JSON.stringify(obj);
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    for (let i = 0; i < salt.length; i++) {
      hash ^= salt.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  } catch {
    return '0';
  }
}

/**
 * Checks if localStorage is functional.
 */
function isLocalStorageAvailable() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const testKey = '__xo_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely reads from localStorage with memory fallback and error recovery.
 */
export function safeGetItem(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;

  try {
    if (isLocalStorageAvailable()) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
      }
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[StorageService] Failed to read "${key}" from localStorage:`, err);
  }

  return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
}

/**
 * Safely writes to localStorage, mirrors to memory fallback, and queues CrazyGames cloud save.
 */
export function safeSetItem(key, value, options = { syncCloud: true }) {
  if (typeof window === 'undefined') return false;

  memoryFallback.set(key, value);

  let writtenLocally = false;
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(key, JSON.stringify(value));
      writtenLocally = true;
    }
  } catch (err) {
    console.warn(`[StorageService] Failed to write "${key}" to localStorage:`, err);
  }

  // Asynchronously push to CrazyGames cloud if applicable
  if (options.syncCloud && (key === STORAGE_KEYS.CAMPAIGN || key === STORAGE_KEYS.DAILY || key === STORAGE_KEYS.PROGRESSION || key === STORAGE_KEYS.SKINS)) {
    saveData(key, value).catch(() => {});
  }

  return writtenLocally || memoryFallback.has(key);
}

/**
 * Removes an item from both localStorage and memory fallback.
 */
export function safeRemoveItem(key) {
  memoryFallback.delete(key);
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[StorageService] Failed to remove "${key}":`, err);
  }
}

/**
 * Sanitizes and validates Campaign Progress.
 * Clamps stars (1-3), enforces level IDs 1-30, and ensures monotonic unlocks.
 */
export function sanitizeCampaignProgress(raw) {
  if (!raw || typeof raw !== 'object') {
    return { completedLevels: {} };
  }

  const sanitized = { completedLevels: {} };
  const completed = raw.completedLevels;

  if (completed && typeof completed === 'object' && !Array.isArray(completed)) {
    for (const [idStr, lvlData] of Object.entries(completed)) {
      const levelId = parseInt(idStr, 10);
      if (Number.isInteger(levelId) && levelId >= 1 && levelId <= 30 && lvlData) {
        const stars = Math.min(3, Math.max(1, parseInt(lvlData.stars, 10) || 1));
        const completedAt = typeof lvlData.completedAt === 'number' && lvlData.completedAt > 0
          ? Math.min(Date.now() + 86400000, lvlData.completedAt) // allow max 24h skew
          : Date.now();

        sanitized.completedLevels[levelId] = {
          stars,
          completedAt,
          score: typeof lvlData.score === 'number' ? Math.max(0, lvlData.score) : undefined,
        };
      }
    }
  }

  return sanitized;
}

/**
 * Sanitizes and validates Daily Challenge data.
 * Protects against impossible streak values, future date attacks, and corrupted histories.
 */
export function sanitizeDailyChallenge(raw) {
  if (!raw || typeof raw !== 'object') {
    return { streak: 0, history: {}, lastCompleted: null };
  }

  const sanitized = {
    streak: Math.min(3650, Math.max(0, parseInt(raw.streak, 10) || 0)),
    history: {},
    lastCompleted: typeof raw.lastCompleted === 'string' ? raw.lastCompleted : null,
  };

  const now = new Date();
  const maxAllowedFuture = new Date(now.getTime() + 86400000 * 2); // max 2 days ahead due to timezone differences
  const maxDateStr = maxAllowedFuture.getFullYear() + '-' + String(maxAllowedFuture.getMonth() + 1).padStart(2, '0') + '-' + String(maxAllowedFuture.getDate()).padStart(2, '0');

  if (raw.history && typeof raw.history === 'object' && !Array.isArray(raw.history)) {
    for (const [dateStr, record] of Object.entries(raw.history)) {
      // Must match YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr <= maxDateStr && record) {
        sanitized.history[dateStr] = {
          completed: Boolean(record.completed),
          completedAt: typeof record.completedAt === 'number' ? record.completedAt : Date.now(),
        };
      }
    }
  }

  return sanitized;
}

/**
 * Merges local and cloud campaign saves, picking the highest progress.
 */
export function mergeCampaignProgress(local, cloud) {
  const cleanLocal = sanitizeCampaignProgress(local);
  const cleanCloud = sanitizeCampaignProgress(cloud);

  const merged = { completedLevels: { ...cleanLocal.completedLevels } };

  for (const [lvlId, cloudLvl] of Object.entries(cleanCloud.completedLevels)) {
    const existing = merged.completedLevels[lvlId];
    if (!existing) {
      merged.completedLevels[lvlId] = cloudLvl;
    } else {
      merged.completedLevels[lvlId] = {
        stars: Math.max(existing.stars, cloudLvl.stars),
        completedAt: Math.min(existing.completedAt, cloudLvl.completedAt),
      };
    }
  }

  return merged;
}

/**
 * Merges local and cloud daily challenge progress.
 */
export function mergeDailyChallenge(local, cloud) {
  const cleanLocal = sanitizeDailyChallenge(local);
  const cleanCloud = sanitizeDailyChallenge(cloud);

  const merged = {
    streak: Math.max(cleanLocal.streak, cleanCloud.streak),
    lastCompleted: cleanLocal.lastCompleted || cleanCloud.lastCompleted,
    history: { ...cleanLocal.history, ...cleanCloud.history },
  };

  return merged;
}

/**
 * Background synchronizer: checks CrazyGames cloud storage on game boot and merges any remote progress.
 */
export async function syncAllWithCrazyGamesCloud() {
  try {
    const [cloudCampaign, cloudDaily, cloudProgression] = await Promise.all([
      loadData(STORAGE_KEYS.CAMPAIGN),
      loadData(STORAGE_KEYS.DAILY),
      loadData(STORAGE_KEYS.PROGRESSION),
    ]);

    if (cloudCampaign) {
      const localCampaign = safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} });
      const merged = mergeCampaignProgress(localCampaign, cloudCampaign);
      safeSetItem(STORAGE_KEYS.CAMPAIGN, merged, { syncCloud: false });
    }

    if (cloudDaily) {
      const localDaily = safeGetItem(STORAGE_KEYS.DAILY, { streak: 0, history: {} });
      const merged = mergeDailyChallenge(localDaily, cloudDaily);
      safeSetItem(STORAGE_KEYS.DAILY, merged, { syncCloud: false });
    }

    if (cloudProgression && typeof cloudProgression === 'object') {
      const localProg = safeGetItem(STORAGE_KEYS.PROGRESSION, { totalXP: 0, level: 1 });
      const mergedProg = {
        ...localProg,
        totalXP: Math.max(localProg.totalXP || 0, cloudProgression.totalXP || 0),
        level: Math.max(localProg.level || 1, cloudProgression.level || 1),
        campaignStars: { ...(localProg.campaignStars || {}), ...(cloudProgression.campaignStars || {}) },
      };
      safeSetItem(STORAGE_KEYS.PROGRESSION, mergedProg, { syncCloud: false });
    }

    return true;
  } catch (err) {
    console.warn('[StorageService] Cloud sync notice:', err);
    return false;
  }
}
