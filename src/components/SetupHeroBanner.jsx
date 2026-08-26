import { memo } from 'react'

const SetupHeroBanner = memo(function SetupHeroBanner({ compact = false }) {
  return (
    <div className={`hero-banner-container${compact ? ' hero-banner-container--compact' : ''}`}>
      {/* Clash Animation */}
      <div className="hero-clash-container">
        <div className="hero-symbol hero-symbol-x">X</div>
        <div className="hero-clash-glow"></div>
        <div className="hero-symbol hero-symbol-o">O</div>
      </div>
    </div>
  );
})

export default SetupHeroBanner
