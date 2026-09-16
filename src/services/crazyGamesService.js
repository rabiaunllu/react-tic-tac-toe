/**
 * CrazyGames SDK v3 Service Wrapper
 * Provides safe, robust integration with the CrazyGames platform.
 * Gracefully falls back to no-op when running locally or on other platforms.
 */

import { setAdMuted } from '../game/soundManager.js'

export const ENABLE_CRAZYGAMES = true

let isSdkInitialized = false
let sdkInitializationPromise = null

/**
 * Returns true if the CrazyGames SDK v3 is fully initialized and ready to use.
 */
export function hasSdkInitialized() {
  return isSdkInitialized || Boolean(typeof window !== 'undefined' && window.CrazyGames?.SDK?.initialized)
}

/**
 * Initializes the CrazyGames SDK v3 if available in the window environment.
 */
export async function initCrazyGamesSdk() {
  if (!ENABLE_CRAZYGAMES) return false
  if (typeof window === 'undefined') return false
  if (hasSdkInitialized()) {
    isSdkInitialized = true
    return true
  }
  if (sdkInitializationPromise) return sdkInitializationPromise

  if (!window.CrazyGames?.SDK?.init) {
    return false
  }

  sdkInitializationPromise = window.CrazyGames.SDK.init()
    .then(() => {
      isSdkInitialized = true
      return true
    })
    .catch((error) => {
      sdkInitializationPromise = null
      isSdkInitialized = false
      console.warn('[CrazyGames] SDK initialization warning:', error)
      return false
    })

  return sdkInitializationPromise
}

let isGameplayRunning = false

/**
 * Call when active gameplay begins (e.g. game starts or round resumes).
 */
export async function gameplayStart() {
  if (!ENABLE_CRAZYGAMES) return
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
  if (!ENABLE_CRAZYGAMES) return
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

  let settled = false
  const finish = () => {
    if (settled) return
    settled = true
    setAdMuted(false)
    onAdFinished?.()
  }

  try {
    window.CrazyGames.SDK.ad.requestAd('rewarded', {
      adStarted: () => {
        setAdMuted(true)
        if (onAdStarted) onAdStarted()
      },
      adFinished: finish,
      adError: (error) => {
        setAdMuted(false)
        console.warn('[CrazyGames] Rewarded ad notice:', error)
        if (onAdError) onAdError(error)
        finish()
      },
    })
  } catch (error) {
    setAdMuted(false)
    console.warn('[CrazyGames] Rewarded ad request error:', error)
    if (onAdError) onAdError(error)
    finish()
  }
}

/**
 * Triggers CrazyGames "happytime" confetti animation on the portal header.
 * Use sparingly — only for major victories (win streaks, campaign completions, etc.)
 */
export function triggerHappytime() {
  if (!ENABLE_CRAZYGAMES || !hasSdkInitialized() || typeof window === 'undefined') return

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
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined') return

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
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined') return

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
 * For logged-in users, this syncs across devices.
 */
export async function saveData(key, value) {
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined') return false

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
  if (!ENABLE_CRAZYGAMES || typeof window === 'undefined') return null

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
  if (!ENABLE_CRAZYGAMES || !hasSdkInitialized() || typeof window === 'undefined') return null

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
  if (!ENABLE_CRAZYGAMES || !hasSdkInitialized() || typeof window === 'undefined') return null

  try {
    return window.CrazyGames?.SDK?.game?.getInviteParam?.(key) ?? null
  } catch (error) {
    console.warn('[CrazyGames] getInviteParam warning:', error)
    return null
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

/**
 * Updates the current multiplayer room status on CrazyGames platform.
 * Allows friends to join and enables platform-level invite features.
 * 
 * @param {Object} options
 * @param {string} options.roomId - Unique identifier for the room
 * @param {boolean} [options.isJoinable=true] - Whether other players can join
 * @param {Object} [options.inviteParams={}] - Parameters passed to players who accept invite
 */
export function updateRoom({ roomId, isJoinable = true, inviteParams = {} } = {}) {
  if (!ENABLE_CRAZYGAMES || !hasSdkInitialized() || typeof window === 'undefined') return

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
  if (!ENABLE_CRAZYGAMES || !hasSdkInitialized() || typeof window === 'undefined') return

  try {
    window.CrazyGames?.SDK?.game?.leftRoom?.()
  } catch (error) {
    console.warn('[CrazyGames] leftRoom warning:', error)
  }
}
