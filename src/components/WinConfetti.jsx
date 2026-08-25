import { useEffect, useState } from 'react'

const COLORS = [
  '#38bdf8',
  '#f43f5e',
  '#fbbf24',
  '#a855f7',
  '#22c55e',
  '#ec4899',
  '#06b6d4',
]

export default function WinConfetti({ active = true, particleCount = 24, duration = 1600 }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!active) return undefined

    const timer = window.setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => window.clearTimeout(timer)
  }, [active, duration])

  if (!active || !isVisible) return null

  // Generate consistent celebratory sparks around the modal badge
  const sparks = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.2)
    const distance = 110 + (i % 4) * 35
    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * (distance * 0.75) - 30
    const rot = (i * 55) % 360
    const bg = COLORS[i % COLORS.length]
    const size = 8 + (i % 3) * 3
    const isRound = i % 3 === 0
    const delay = (i % 5) * 0.04

    return {
      id: i,
      style: {
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        '--rot': `${rot}deg`,
        '--bg': bg,
        '--size': `${size}px`,
        '--delay': `${delay}s`,
        borderRadius: isRound ? '50%' : '3px',
      },
    }
  })

  return (
    <div className="popup-confetti-emitter" aria-hidden="true">
      {sparks.map((spark) => (
        <span key={spark.id} className="popup-confetti-spark" style={spark.style} />
      ))}
    </div>
  )
}
