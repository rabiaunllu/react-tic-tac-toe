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

  const startTime = context.currentTime + delay
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

export function playSound(effect) {
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
