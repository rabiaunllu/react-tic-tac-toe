/**
 * CrazyGames SDK v3 Service Wrapper
 * Provides safe, robust integration with the CrazyGames platform.
 * Gracefully falls back to no-op when running locally or on other platforms.
 */

export const ENABLE_CRAZYGAMES = true

let isSdkInitialized = false
let isSdkInitializing = false

/**
 * Initializes the CrazyGames SDK v3 if available in the window environment.
 */
export async function initCrazyGamesSdk() {
  if (!ENABLE_CRAZYGAMES) return
  if (typeof window === 'undefined') return
  if (isSdkInitialized || isSdkInitializing) return

  if (!window.CrazyGames?.SDK) {
    return
  }

  isSdkInitializing = true
  try {
    await window.CrazyGames.SDK.init()
    isSdkInitialized = true
  } catch (error) {
    console.warn('[CrazyGames] SDK initialization warning:', error)
  } finally {
    isSdkInitializing = false
  }
}

/**
 * Call when active gameplay begins (e.g. game starts or round resumes).
 */
export async function gameplayStart() {
  if (!ENABLE_CRAZYGAMES) return
  if (typeof window === 'undefined' || !window.CrazyGames?.SDK?.game?.gameplayStart) {
    return
  }

  try {
    await window.CrazyGames.SDK.game.gameplayStart()
  } catch (error) {
    console.warn('[CrazyGames] gameplayStart warning:', error)
  }
}

/**
 * Call when gameplay ceases or pauses (e.g. returning to menu).
 */
export async function gameplayStop() {
  if (!ENABLE_CRAZYGAMES) return
  if (typeof window === 'undefined' || !window.CrazyGames?.SDK?.game?.gameplayStop) {
    return
  }

  try {
    await window.CrazyGames.SDK.game.gameplayStop()
  } catch (error) {
    console.warn('[CrazyGames] gameplayStop warning:', error)
  }
}

/**
 * Requests a midgame ad from CrazyGames SDK.
 * SDK automatically manages ad frequency (e.g. max once every 3 minutes).
 * When ENABLE_CRAZYGAMES is false, immediately calls onAdFinished without ads.
 * 
 * @param {Object} options
 * @param {Function} [options.onAdStarted] - Called when the ad begins (pause audio/game)
 * @param {Function} [options.onAdFinished] - Called when ad ends (resume audio/game)
 * @param {Function} [options.onAdError] - Called if ad fails or is skipped
 */
export function requestMidgameAd({ onAdStarted, onAdFinished, onAdError } = {}) {
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined' || !window.CrazyGames?.SDK?.ad?.requestAd) {
    if (onAdFinished) onAdFinished()
    return
  }

  try {
    window.CrazyGames.SDK.ad.requestAd('midgame', {
      adStarted: () => {
        if (onAdStarted) onAdStarted()
      },
      adFinished: () => {
        if (onAdFinished) onAdFinished()
      },
      adError: (error) => {
        console.warn('[CrazyGames] Midgame ad notice:', error)
        if (onAdError) onAdError(error)
        if (onAdFinished) onAdFinished()
      },
    })
  } catch (error) {
    console.warn('[CrazyGames] Midgame ad request error:', error)
    if (onAdFinished) onAdFinished()
  }
}

/**
 * Requests a rewarded ad from CrazyGames SDK.
 * Players choose to watch a video voluntarily in exchange for unlocking themes/powers.
 *
 * @param {Object} options
 * @param {Function} [options.onAdStarted] - Called when video starts (pause audio)
 * @param {Function} [options.onAdFinished] - Called when video finishes successfully (grant reward)
 * @param {Function} [options.onAdError] - Called if video fails to load or user closes early
 */
export function requestRewardedAd({ onAdStarted, onAdFinished, onAdError } = {}) {
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined' || !window.CrazyGames?.SDK?.ad?.requestAd) {
    // Dev/fallback environment: simulate watched ad
    if (onAdFinished) onAdFinished()
    return
  }

  try {
    window.CrazyGames.SDK.ad.requestAd('rewarded', {
      adStarted: () => {
        if (onAdStarted) onAdStarted()
      },
      adFinished: () => {
        if (onAdFinished) onAdFinished()
      },
      adError: (error) => {
        console.warn('[CrazyGames] Rewarded ad notice:', error)
        if (onAdError) onAdError(error)
      },
    })
  } catch (error) {
    console.warn('[CrazyGames] Rewarded ad request error:', error)
    if (onAdError) onAdError(error)
  }
}

/**
 * Checks if the game is running inside CrazyGames environment.
 */
export function isCrazyGamesEnvironment() {
  if (!ENABLE_CRAZYGAMES) return false
  if (typeof window === 'undefined') return false
  const host = window.location.hostname || ''
  return host.includes('crazygames') || Boolean(window.CrazyGames?.SDK)
}
