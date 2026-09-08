import { useCallback, useState } from 'react'

export const SOUND_STORAGE_KEY = 'xo-arena-sound-enabled'

let audioContext = null
let hasUserGesture = false

function readStoredSoundEnabled() {
  if (typeof window === 'undefined') {
    return true
  }

  return window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
}

function getAudioContext() {
  if (typeof window === 'undefined' || !hasUserGesture) {
    return null
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext

  if (!AudioContextClass) {
    return null
  }

  audioContext ??= new AudioContextClass()
  return audioContext
}

function playTone({ frequency, duration, delay = 0, type = 'sine', volume = 0.04, slideTo }) {
  const context = getAudioContext()

  if (!context) {
    return
  }

  const startTime = Math.max(context.currentTime + delay, context.currentTime + 0.005)
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration)
  }

  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.02)

  oscillator.onended = () => {
    oscillator.disconnect()
    gainNode.disconnect()
  }
}

export function isSoundEnabled() {
  return readStoredSoundEnabled()
}

export function setSoundEnabled(isEnabled) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SOUND_STORAGE_KEY, isEnabled ? 'true' : 'false')
}

export function registerUserGesture() {
  hasUserGesture = true

  try {
    const context = getAudioContext()

    if (context?.state === 'suspended') {
      void context.resume()
    }
  } catch {
    // Audio support is optional; gameplay must continue silently if it fails.
  }
}

export function triggerHaptic(type) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return
  }
  try {
    if (type === 'move') navigator.vibrate(20)
    else if (type === 'click') navigator.vibrate(10)
    else if (type === 'bomb') navigator.vibrate([40, 30, 60])
    else if (type === 'blackhole') navigator.vibrate([60, 40, 80])
    else if (type === 'power') navigator.vibrate(30)
    else if (type === 'shield') navigator.vibrate(15)
    else if (type === 'freezeActivate') navigator.vibrate([20, 10, 20])
    else if (type === 'vampireDrain') navigator.vibrate([25, 15, 35])
    else if (type === 'nearMiss') navigator.vibrate([30, 20, 50])
    else if (type === 'streak') navigator.vibrate([50, 30, 50, 30, 80])
    else if (type === 'win') navigator.vibrate([80, 50, 80, 50, 120])
    else if (type === 'draw') navigator.vibrate([40, 40, 40])
  } catch {
    // Haptics supported optionally
  }
}

export function playSound(effect) {
  // Always trigger haptics for touch feedback
  triggerHaptic(effect)

  if (!readStoredSoundEnabled() || !hasUserGesture) {
    return
  }

  try {
    const context = getAudioContext()

    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume()
    }

    if (effect === 'move') {
      playTone({ frequency: 360, slideTo: 260, duration: 0.055, type: 'sine', volume: 0.022 })
      playTone({ frequency: 500, duration: 0.04, delay: 0.018, type: 'triangle', volume: 0.012 })
      return
    }

    if (effect === 'win') {
      playTone({ frequency: 392, duration: 0.075, type: 'sine', volume: 0.024 })
      playTone({ frequency: 523.25, duration: 0.085, delay: 0.07, type: 'triangle', volume: 0.028 })
      playTone({ frequency: 659.25, duration: 0.12, delay: 0.15, type: 'sine', volume: 0.03 })
      return
    }

    if (effect === 'draw') {
      playTone({ frequency: 330, slideTo: 294, duration: 0.105, type: 'sine', volume: 0.02 })
      playTone({ frequency: 247, duration: 0.09, delay: 0.08, type: 'triangle', volume: 0.014 })
      return
    }

    if (effect === 'power') {
      playTone({ frequency: 220, slideTo: 440, duration: 0.095, type: 'triangle', volume: 0.022 })
      playTone({ frequency: 587.33, duration: 0.065, delay: 0.065, type: 'sine', volume: 0.018 })
      return
    }

    if (effect === 'bomb') {
      playTone({ frequency: 128, slideTo: 72, duration: 0.105, type: 'triangle', volume: 0.034 })
      playTone({ frequency: 220, slideTo: 132, duration: 0.075, delay: 0.018, type: 'sine', volume: 0.022 })
      playTone({ frequency: 64, duration: 0.12, delay: 0.05, type: 'sine', volume: 0.018 })
      return
    }

    if (effect === 'blackhole') {
      playTone({ frequency: 360, slideTo: 92, duration: 0.16, type: 'sine', volume: 0.026 })
      playTone({ frequency: 180, slideTo: 68, duration: 0.14, delay: 0.035, type: 'triangle', volume: 0.018 })
      return
    }

    // ── Yeni ses efektleri ──────────────────────────────────────────────────

    // Kalkan aktifleştirme: kristal glissando (880 → 1760 Hz)
    if (effect === 'shield') {
      playTone({ frequency: 880, slideTo: 1760, duration: 0.055, type: 'sine', volume: 0.018 })
      playTone({ frequency: 1320, duration: 0.04, delay: 0.04, type: 'triangle', volume: 0.010 })
      return
    }

    // Freeze aktifleştirme: kısa noise burst hissi + kristal blip
    if (effect === 'freezeActivate') {
      playTone({ frequency: 1800, slideTo: 2400, duration: 0.03, type: 'triangle', volume: 0.014 })
      playTone({ frequency: 2000, duration: 0.02, delay: 0.025, type: 'sine', volume: 0.012 })
      playTone({ frequency: 1400, slideTo: 900, duration: 0.06, delay: 0.045, type: 'sine', volume: 0.010 })
      return
    }

    // Vampir emme: enerji sweep (200 → 800 Hz, belirgin yükseliş)
    if (effect === 'vampireDrain') {
      playTone({ frequency: 200, slideTo: 800, duration: 0.11, type: 'sine', volume: 0.022 })
      playTone({ frequency: 300, slideTo: 1000, duration: 0.09, delay: 0.03, type: 'triangle', volume: 0.014 })
      return
    }

    // Near-miss: dramatik düşüş (440 → 220 Hz) — 1 hamle kalsaydı kazanıyordun hissi
    if (effect === 'nearMiss') {
      playTone({ frequency: 440, slideTo: 220, duration: 0.14, type: 'sine', volume: 0.022 })
      playTone({ frequency: 330, slideTo: 165, duration: 0.12, delay: 0.06, type: 'triangle', volume: 0.014 })
      return
    }

    // Seri galibiyet (3+): majör arpej C5 → E5 → G5
    if (effect === 'streak') {
      playTone({ frequency: 523.25, duration: 0.07, type: 'sine', volume: 0.026 })         // C5
      playTone({ frequency: 659.25, duration: 0.08, delay: 0.065, type: 'sine', volume: 0.028 }) // E5
      playTone({ frequency: 783.99, duration: 0.10, delay: 0.135, type: 'triangle', volume: 0.030 }) // G5
      return
    }

    // Emote gönderme: kısa hoş pop/ding tonu
    if (effect === 'emote') {
      playTone({ frequency: 880, duration: 0.08, type: 'sine', volume: 0.025 })
      playTone({ frequency: 1320, duration: 0.1, delay: 0.04, type: 'sine', volume: 0.018 })
      return
    }

    if (effect === 'click') {
      playTone({ frequency: 420, duration: 0.026, type: 'sine', volume: 0.01 })
    }
  } catch {
    // Audio support is optional; gameplay must continue silently if it fails.
  }
}

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(readStoredSoundEnabled)

  const toggleSound = useCallback(() => {
    registerUserGesture()
    setEnabled((currentEnabled) => {
      const nextEnabled = !currentEnabled
      setSoundEnabled(nextEnabled)

      if (nextEnabled) {
        playSound('click')
      }

      return nextEnabled
    })
  }, [])

  return {
    enabled,
    toggleSound,
  }
}
