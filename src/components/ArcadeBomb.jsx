import { memo } from 'react'

const ArcadeBomb = memo(function ArcadeBomb({
  className = '',
  size = '100%',
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 140 160"
      width={size}
      height={size}
      className={`arcade-bomb-svg ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Spherical Metallic Dark Body Gradient */}
        <radialGradient id="bombBodyGrad" cx="38%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="35%" stopColor="#1e293b" />
          <stop offset="85%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        {/* Gloss Specular Highlight */}
        <linearGradient id="bombGlossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Fuse Spark Core Gradient */}
        <radialGradient id="sparkCoreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>

        {/* Metal Neck Gradient */}
        <linearGradient id="neckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="30%" stopColor="#475569" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* 1. Curved S-Shaped Burning Rope Fuse */}
      <path
        d="M 70,72 C 70,42 98,46 92,26 C 88,14 74,18 64,12"
        fill="none"
        stroke="#d97706"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 70,72 C 70,42 98,46 92,26 C 88,14 74,18 64,12"
        fill="none"
        stroke="#fde68a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 2"
      />

      {/* 2. Sizzling Fuse Tip Starburst Spark */}
      <g transform="translate(62, 10)" className="fuse-spark-group">
        {/* Outer Sharp Orange Spark Spikes */}
        <polygon
          points="
            0,-16 4,-5 15,-10 7,-1 16,3 6,6 11,15 1,8 
            -4,16 -5,6 -15,9 -7,0 -16,-4 -6,-5 -10,-14 -1,-7
          "
          fill="#ea580c"
        />
        {/* Mid Bright Yellow Spark Star */}
        <polygon
          points="
            0,-11 3,-3 11,-7 5,-1 11,2 4,4 7,11 1,5 
            -3,11 -3,4 -11,6 -5,0 -11,-3 -4,-4 -7,-10 -1,-5
          "
          fill="#facc15"
        />
        {/* White-Hot Center Flash */}
        <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
      </g>

      {/* 3. Spherical Iron Bomb Body */}
      <circle cx="70" cy="108" r="46" fill="url(#bombBodyGrad)" />

      {/* 4. Cylindrical Metal Neck Collar */}
      <rect x="58" y="62" width="24" height="12" rx="3" fill="url(#neckGrad)" stroke="#0f172a" strokeWidth="1" />
      <ellipse cx="70" cy="62" rx="12" ry="3.5" fill="#475569" />

      {/* 5. Crescent Gloss Specular Reflections (Right and Rim) */}
      <path
        d="M 88,78 C 104,90 108,114 96,134 C 92,120 90,96 82,86 Z"
        fill="url(#bombGlossGrad)"
      />
      <ellipse cx="98" cy="92" rx="4" ry="7" transform="rotate(30 98 92)" fill="#ffffff" opacity="0.6" />
      <ellipse cx="106" cy="104" rx="2.5" ry="4" transform="rotate(30 106 104)" fill="#ffffff" opacity="0.5" />
    </svg>
  )
})

export default ArcadeBomb
