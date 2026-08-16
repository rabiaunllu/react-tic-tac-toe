import { memo } from 'react'

const EnergyShieldIcon = memo(function EnergyShieldIcon({
  size = 18,
  className = '',
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={`energy-shield-svg ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Cyan shield surface gradient */}
        <linearGradient id="shieldCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="45%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>

        {/* Shield highlight shine */}
        <linearGradient id="shieldShineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </linearGradient>

        {/* Border glow gradient */}
        <linearGradient id="shieldBorderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cffafe" />
          <stop offset="60%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#083344" />
        </linearGradient>
      </defs>

      {/* Outer Energy Glow Filter */}
      {/* Main Shield Body */}
      <path
        d="M 50 6 
           C 78 6, 94 14, 94 28 
           C 94 72, 68 104, 50 114 
           C 32 104, 6 72, 6 28 
           C 6 14, 22 6, 50 6 Z"
        fill="url(#shieldCyanGrad)"
        stroke="url(#shieldBorderGrad)"
        strokeWidth="3.5"
      />

      {/* Left Gloss Highlight */}
      <path
        d="M 50 9 
           C 30 9, 10 16, 10 28 
           C 10 68, 32 98, 50 108 
           L 50 9 Z"
        fill="url(#shieldShineGrad)"
      />

      {/* Central Ridge Highlight */}
      <line
        x1="50"
        y1="9"
        x2="50"
        y2="110"
        stroke="#e0f2fe"
        strokeWidth="1.8"
        strokeOpacity="0.85"
      />

      {/* Inner Energy Sparkle Stars */}
      <circle cx="50" cy="54" r="14" fill="none" stroke="#a5f3fc" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
      <polygon points="50,44 53,51 60,54 53,57 50,64 47,57 40,54 47,51" fill="#ffffff" opacity="0.9" />
    </svg>
  )
})

export default EnergyShieldIcon
