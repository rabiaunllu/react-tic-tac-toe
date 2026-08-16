import { memo } from 'react'

const CrystalSnowflake = memo(function CrystalSnowflake({
  className = '',
  size = '100%',
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`crystal-snowflake-svg ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Ice Highlights and Shading Gradients */}
        <linearGradient id="iceFacetBright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#bbf2f6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
        </linearGradient>

        <linearGradient id="iceFacetDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#034d82" />
        </linearGradient>

        <linearGradient id="iceFacetMid" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="60%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>

        <linearGradient id="iceGemCenter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Single Crystalline Arm Definition */}
        <g id="crystalArm">
          {/* Main Stem - Left facet (shadow) */}
          <polygon points="100,100 95,90 94,30 100,15 100,100" fill="url(#iceFacetDeep)" />
          {/* Main Stem - Right facet (highlight) */}
          <polygon points="100,100 105,90 106,30 100,15 100,100" fill="url(#iceFacetBright)" />

          {/* Arrow Tip Crystal Top */}
          <polygon points="100,8 92,24 100,15" fill="url(#iceFacetMid)" />
          <polygon points="100,8 108,24 100,15" fill="url(#iceFacetBright)" />
          <polygon points="100,15 92,24 100,32" fill="url(#iceFacetDeep)" />
          <polygon points="100,15 108,24 100,32" fill="url(#iceFacetMid)" />

          {/* Upper Chevron / Branch Left */}
          <polygon points="95,45 68,26 76,22 96,38" fill="url(#iceFacetBright)" />
          <polygon points="95,45 68,26 72,34 95,50" fill="url(#iceFacetDeep)" />

          {/* Upper Chevron / Branch Right */}
          <polygon points="105,45 132,26 124,22 104,38" fill="url(#iceFacetMid)" />
          <polygon points="105,45 132,26 128,34 105,50" fill="url(#iceFacetBright)" />

          {/* Lower Chevron / Branch Left */}
          <polygon points="95,68 58,46 66,42 96,60" fill="url(#iceFacetBright)" />
          <polygon points="95,68 58,46 62,54 95,74" fill="url(#iceFacetDeep)" />

          {/* Lower Chevron / Branch Right */}
          <polygon points="105,68 142,46 134,42 104,60" fill="url(#iceFacetMid)" />
          <polygon points="105,68 142,46 138,54 105,74" fill="url(#iceFacetBright)" />

          {/* Inner Facet Diamond */}
          <polygon points="100,60 90,75 100,90 100,60" fill="url(#iceFacetDeep)" />
          <polygon points="100,60 110,75 100,90 100,60" fill="url(#iceFacetBright)" />
        </g>
      </defs>

      {/* 6 Symmetrical Rotations for 60 deg crystal symmetry */}
      <use href="#crystalArm" />
      <use href="#crystalArm" transform="rotate(60 100 100)" />
      <use href="#crystalArm" transform="rotate(120 100 100)" />
      <use href="#crystalArm" transform="rotate(180 100 100)" />
      <use href="#crystalArm" transform="rotate(240 100 100)" />
      <use href="#crystalArm" transform="rotate(300 100 100)" />

      {/* Central 3D Faceted Diamond Star */}
      <polygon points="100,75 118,90 125,100 118,110 100,125 82,110 75,100 82,90" fill="url(#iceFacetDeep)" />
      <polygon points="100,75 110,95 100,100 90,95" fill="url(#iceFacetBright)" />
      <polygon points="125,100 105,108 100,100 105,92" fill="url(#iceFacetMid)" />
      <polygon points="100,125 90,105 100,100 110,105" fill="url(#iceFacetDeep)" />
      <polygon points="75,100 95,92 100,100 95,108" fill="url(#iceFacetBright)" />
      <circle cx="100" cy="100" r="5" fill="url(#iceGemCenter)" />
    </svg>
  )
})

export default CrystalSnowflake
