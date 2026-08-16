import { memo } from 'react'

const ExplosionBlast = memo(function ExplosionBlast({
  className = '',
  size = '100%',
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={`explosion-blast-svg ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Starburst Fire Spikes Gradient */}
        <radialGradient id="starburstFireGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>

        {/* Smoke Cloud Puffs Gradient */}
        <radialGradient id="smokePuffGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="55%" stopColor="#451a03" />
          <stop offset="90%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#0c0a09" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Dark Fiery Smoke Puffs at Top / Surrounding */}
      <g className="blast-smoke-puffs" fill="url(#smokePuffGrad)">
        <circle cx="80" cy="30" r="18" />
        <circle cx="60" cy="38" r="14" />
        <circle cx="102" cy="36" r="15" />
        <circle cx="42" cy="52" r="12" />
        <circle cx="120" cy="50" r="12" />
      </g>

      {/* 2. Main Central Starburst Explosion Blast (From User Reference) */}
      {/* Outer 16-point Sharp Orange/Red Fire Spikes */}
      <polygon
        points="
          80,8 86,48 126,18 98,58 148,46 108,74 154,98 106,96 136,138 
          90,110 80,154 70,110 24,138 54,96 6,98 52,74 12,46 62,58 34,18 74,48
        "
        fill="url(#starburstFireGrad)"
        filter="drop-shadow(0 0 10px rgba(249, 115, 22, 0.9))"
      />

      {/* Mid 12-point Bright Gold/Yellow Star Spikes */}
      <polygon
        points="
          80,24 88,56 120,38 98,68 134,80 96,90 118,122 84,102 
          80,136 76,102 42,122 64,90 26,80 62,68 40,38 72,56
        "
        fill="#facc15"
      />

      {/* Inner White-Hot Star Flash Core */}
      <polygon
        points="
          80,44 86,66 108,54 94,74 116,80 94,86 108,106 86,94 
          80,116 74,94 52,106 66,86 44,80 66,74 52,54 74,66
        "
        fill="#ffffff"
      />
      <circle cx="80" cy="80" r="14" fill="#ffffff" />

      {/* 3. Orbiting Mini Starburst Sparks (Matching image around the main blast) */}
      {/* Top-Right Spark Star */}
      <g transform="translate(136, 42) scale(0.48)">
        <polygon
          points="0,-24 7,-8 24,-14 12,-1 24,6 9,10 16,24 2,13 -6,24 -8,9 -24,14 -11,0 -24,-6 -9,-9 -15,-23 -2,-11"
          fill="#ea580c"
        />
        <polygon
          points="0,-16 5,-5 16,-9 8,0 16,4 6,7 10,16 1,9 -4,16 -5,6 -16,9 -7,0 -16,-4 -6,-6 -10,-15 -1,-7"
          fill="#facc15"
        />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>

      {/* Top-Left Spark Star */}
      <g transform="translate(24, 38) scale(0.42)">
        <polygon
          points="0,-24 7,-8 24,-14 12,-1 24,6 9,10 16,24 2,13 -6,24 -8,9 -24,14 -11,0 -24,-6 -9,-9 -15,-23 -2,-11"
          fill="#ea580c"
        />
        <polygon
          points="0,-16 5,-5 16,-9 8,0 16,4 6,7 10,16 1,9 -4,16 -5,6 -16,9 -7,0 -16,-4 -6,-6 -10,-15 -1,-7"
          fill="#facc15"
        />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>

      {/* Bottom-Left Spark Star */}
      <g transform="translate(26, 120) scale(0.38)">
        <polygon
          points="0,-24 7,-8 24,-14 12,-1 24,6 9,10 16,24 2,13 -6,24 -8,9 -24,14 -11,0 -24,-6 -9,-9 -15,-23 -2,-11"
          fill="#ea580c"
        />
        <polygon
          points="0,-16 5,-5 16,-9 8,0 16,4 6,7 10,16 1,9 -4,16 -5,6 -16,9 -7,0 -16,-4 -6,-6 -10,-15 -1,-7"
          fill="#facc15"
        />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>

      {/* Bottom-Right Spark Star */}
      <g transform="translate(138, 122) scale(0.38)">
        <polygon
          points="0,-24 7,-8 24,-14 12,-1 24,6 9,10 16,24 2,13 -6,24 -8,9 -24,14 -11,0 -24,-6 -9,-9 -15,-23 -2,-11"
          fill="#ea580c"
        />
        <polygon
          points="0,-16 5,-5 16,-9 8,0 16,4 6,7 10,16 1,9 -4,16 -5,6 -16,9 -7,0 -16,-4 -6,-6 -10,-15 -1,-7"
          fill="#facc15"
        />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>
    </svg>
  )
})

export default ExplosionBlast
