/**
 * CrazyGames SDK v3 Service Wrapper
 * Provides safe, robust integration with the CrazyGames platform.
 * Gracefully falls back to zero-overhead no-op when running on personal website (xotactix.me) or locally.
 * In the future, third-party ad networks (Google AdSense/AdMob) can easily plug into the non-CrazyGames branches.
 */

import { setAdMuted } from '../game/soundManager.js'

/**
 * Checks if the game is running inside the CrazyGames environment.
 * Evaluates dynamically to allow the exact same codebase to run cleanly on:
 * 1) CrazyGames (developer.crazygames.com, *.crazygames.com)
 * 2) Personal website (xotactix.me) - completely independent, 0 CrazyGames calls
 * 3) Local development (can test CrazyGames mode via ?platform=crazygames)
 */
export function isCrazyGamesEnvironment() {
  if (typeof window === 'undefined') return false

  const host = window.location.hostname || ''

  // 1. Explicit domain block: GitHub Pages, xotactix.me, and Azure MUST NEVER run CrazyGames or any ads
  if (host.includes('github.io') || host.includes('xotactix.me') || host.includes('azurewebsites.net')) {
    return false
  }

  // 2. Direct hostname check (e.g. developer.crazygames.com, games.crazygames.com)
  if (host.includes('crazygames')) return true

  // 3. Query param override for manual local testing only (?platform=crazygames)
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('platform') === 'crazygames') return true
  } catch {
    // ignore query parsing errors
  }

  // 4. Iframe referrer check (when embedded in an iframe on crazygames.com)
  try {
    if (window.parent && window.parent !== window) {
      const referrer = document.referrer || ''
      if (referrer.includes('crazygames')) return true
    }
  } catch {
    // cross-origin security may prevent reading iframe parent
  }

  return false
}

export const ENABLE_CRAZYGAMES = isCrazyGamesEnvironment()

let isSdkInitialized = false
let sdkInitializationPromise = null
let scriptLoadingPromise = null

/**
 * Dynamically injects the CrazyGames SDK v3 script only when in CrazyGames environment.
 * Prevents non-CrazyGames domains (like xotactix.me) from fetching external 3rd-party scripts.
 */
export function loadCrazyGamesScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.CrazyGames?.SDK) return Promise.resolve(true)
  if (scriptLoadingPromise) return scriptLoadingPromise

  scriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src*="crazygames-sdk"]')
    if (existingScript) {
      if (window.CrazyGames?.SDK) {
        resolve(true)
      } else {
        existingScript.addEventListener('load', () => resolve(true), { once: true })
        existingScript.addEventListener('error', () => resolve(false), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = (error) => {
      console.warn('[CrazyGames] Failed to load SDK script:', error)
      resolve(false)
    }
    document.head.appendChild(script)
  })

  return scriptLoadingPromise
}

/**
 * Returns true if the CrazyGames SDK v3 is fully initialized and ready to use.
 */
export function hasSdkInitialized() {
  return isSdkInitialized || Boolean(typeof window !== 'undefined' && window.CrazyGames?.SDK?.initialized)
}

/**
 * Initializes the CrazyGames SDK v3 if running in CrazyGames environment.
 */
export async function initCrazyGamesSdk() {
  if (!isCrazyGamesEnvironment()) return false
  if (typeof window === 'undefined') return false
  if (hasSdkInitialized()) {
    isSdkInitialized = true
    return true
  }
  if (sdkInitializationPromise) return sdkInitializationPromise

  sdkInitializationPromise = (async () => {
    const scriptLoaded = await loadCrazyGamesScript()
    if (!scriptLoaded || !window.CrazyGames?.SDK?.init) {
      return false
    }

    try {
      await window.CrazyGames.SDK.init()
      isSdkInitialized = true
      return true
    } catch (error) {
      sdkInitializationPromise = null
      isSdkInitialized = false
      console.warn('[CrazyGames] SDK initialization warning:', error)
      return false
    }
  })()

  return sdkInitializationPromise
}

let isGameplayRunning = false

/**
 * Call when active gameplay begins (e.g. game starts or round resumes).
 */
export async function gameplayStart() {
  if (!isCrazyGamesEnvironment()) return
  if (isGameplayRunning) return
  if (typeof window === 'undefined') return

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return
    await window.CrazyGames?.SDK?.game?.gameplayStart?.()
    isGameplayRunning = true
  } catch (error) {
    console.warn('[CrazyGames] gameplayStart warning:', error)
  }
}

/**
 * Call when gameplay ceases or pauses (e.g. returning to menu).
 */
export async function gameplayStop() {
  if (!isCrazyGamesEnvironment()) return
  if (!isGameplayRunning) return
  if (typeof window === 'undefined') return

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return
    await window.CrazyGames?.SDK?.game?.gameplayStop?.()
    isGameplayRunning = false
  } catch (error) {
    console.warn('[CrazyGames] gameplayStop warning:', error)
  }
}

/**
 * Requests a midgame ad from CrazyGames SDK.
 * On xotactix.me or standalone mode, instantly calls onAdFinished with zero delay.
 * (In future, Google AdSense for Games / H5 Ads can be triggered here).
 * 
 * @param {Object} options
 * @param {Function} [options.onAdStarted]
 * @param {Function} [options.onAdFinished]
 * @param {Function} [options.onAdError]
 */
export function requestMidgameAd({ onAdStarted, onAdFinished, onAdError } = {}) {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined' || !window.CrazyGames?.SDK?.ad?.requestAd) {
    if (onAdFinished) onAdFinished()
    return
  }

  let settled = false
  const finish = () => {
    if (settled) return
    settled = true
    setAdMuted(false)
    onAdFinished?.()
  }

  try {
    window.CrazyGames.SDK.ad.requestAd('midgame', {
      adStarted: () => {
        setAdMuted(true)
        onAdStarted?.()
      },
      adFinished: finish,
      adError: (error) => {
        setAdMuted(false)
        console.warn('[CrazyGames] Midgame ad notice:', error)
        onAdError?.(error)
        finish()
      },
    })
  } catch (error) {
    setAdMuted(false)
    console.warn('[CrazyGames] Midgame ad request error:', error)
    finish()
  }
}

/**
 * Requests a rewarded ad from CrazyGames SDK.
 * On xotactix.me or standalone mode, immediately calls onAdFinished so players enjoy features freely.
 * (In future, Google AdSense rewarded ads can easily be wired here).
 *
 * @param {Object} options
 * @param {Function} [options.onAdStarted]
 * @param {Function} [options.onAdFinished]
 * @param {Function} [options.onAdError]
 */
export function requestRewardedAd({ onAdStarted, onAdFinished, onAdError } = {}) {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined' || !window.CrazyGames?.SDK?.ad?.requestAd) {
    // Standalone / personal web mode: grant reward immediately
    if (onAdFinished) onAdFinished()
    return
  }

  let settled = false
  const finish = () => {
    if (settled) return
    settled = true
    setAdMuted(false)
    onAdFinished?.()
  }

  const fail = (error) => {
    if (settled) return
    settled = true
    setAdMuted(false)
    if (onAdError) onAdError(error)
  }

  try {
    window.CrazyGames.SDK.ad.requestAd('rewarded', {
      adStarted: () => {
        setAdMuted(true)
        if (onAdStarted) onAdStarted()
      },
      adFinished: finish,
      adError: (error) => {
        console.warn('[CrazyGames] Rewarded ad notice:', error)
        fail(error)
      },
    })
  } catch (error) {
    console.warn('[CrazyGames] Rewarded ad request error:', error)
    fail(error)
  }
}

/**
 * Triggers CrazyGames "happytime" confetti animation on the portal header.
 */
export function triggerHappytime() {
  if (!isCrazyGamesEnvironment() || !hasSdkInitialized() || typeof window === 'undefined') return

  try {
    window.CrazyGames?.SDK?.game?.happytime?.()
  } catch (error) {
    console.warn('[CrazyGames] happytime warning:', error)
  }
}

/**
 * Signals the start of internal asset loading.
 */
export async function loadingStart() {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined') return

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return
    await window.CrazyGames?.SDK?.game?.loadingStart?.()
  } catch (error) {
    console.warn('[CrazyGames] loadingStart warning:', error)
  }
}

/**
 * Signals that internal asset loading is complete.
 */
export async function loadingStop() {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined') return

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return
    await window.CrazyGames?.SDK?.game?.loadingStop?.()
  } catch (error) {
    console.warn('[CrazyGames] loadingStop warning:', error)
  }
}

/**
 * Saves data using CrazyGames SDK cloud storage.
 */
export async function saveData(key, value) {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined') return false

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return false
    await window.CrazyGames?.SDK?.data?.setItem?.(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn('[CrazyGames] saveData warning:', error)
    return false
  }
}

/**
 * Loads data from CrazyGames SDK cloud storage.
 */
export async function loadData(key) {
  if (!isCrazyGamesEnvironment() || typeof window === 'undefined') return null

  try {
    await initCrazyGamesSdk()
    if (!hasSdkInitialized()) return null
    const raw = await window.CrazyGames?.SDK?.data?.getItem?.(key)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('[CrazyGames] loadData warning:', error)
    return null
  }
}

/**
 * Generates a shareable invite link for multiplayer rooms.
 */
export function getInviteLink(params) {
  if (!isCrazyGamesEnvironment() || !hasSdkInitialized() || typeof window === 'undefined') return null

  try {
    return window.CrazyGames?.SDK?.game?.inviteLink?.(params) ?? null
  } catch (error) {
    console.warn('[CrazyGames] inviteLink warning:', error)
    return null
  }
}

/**
 * Gets invite link parameter when opened via CrazyGames invite.
 */
export function getInviteParam(key) {
  if (!isCrazyGamesEnvironment() || !hasSdkInitialized() || typeof window === 'undefined') return null

  try {
    return window.CrazyGames?.SDK?.game?.getInviteParam?.(key) ?? null
  } catch (error) {
    console.warn('[CrazyGames] getInviteParam warning:', error)
    return null
  }
}

/**
 * Updates the current multiplayer room status on CrazyGames platform.
 */
export function updateRoom({ roomId, isJoinable = true, inviteParams = {} } = {}) {
  if (!isCrazyGamesEnvironment() || !hasSdkInitialized() || typeof window === 'undefined') return

  try {
    window.CrazyGames?.SDK?.game?.updateRoom?.({
      roomId: String(roomId),
      isJoinable: Boolean(isJoinable),
      inviteParams,
    })
  } catch (error) {
    console.warn('[CrazyGames] updateRoom warning:', error)
  }
}

/**
 * Signals to CrazyGames platform that the player has left the multiplayer room.
 */
export function leftRoom() {
  if (!isCrazyGamesEnvironment() || !hasSdkInitialized() || typeof window === 'undefined') return

  try {
    window.CrazyGames?.SDK?.game?.leftRoom?.()
  } catch (error) {
    console.warn('[CrazyGames] leftRoom warning:', error)
  }
}
