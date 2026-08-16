/**
 * AI Web Worker
 * AI hesaplamalarını ana thread'den ayırarak UI kilitlenmesini önler.
 * App.jsx'teki setTimeout simülasyonu bu worker üzerinden yönetilir.
 */
import { getAdaptiveAiMove, getArenaAiPowerAction } from './aiPlayer.js'

self.onmessage = function (event) {
  const { type, payload } = event.data

  if (type === 'ADAPTIVE_MOVE') {
    const move = getAdaptiveAiMove(payload)
    self.postMessage({ type: 'ADAPTIVE_MOVE_RESULT', move })
    return
  }

  if (type === 'ARENA_POWER_ACTION') {
    const action = getArenaAiPowerAction(payload)
    self.postMessage({ type: 'ARENA_POWER_ACTION_RESULT', action })
    return
  }
}
