import { memo } from 'react'

const Square = memo(function Square({
  value,
  multiplier,
  isWinningSquare,
  isShielded,
  isLocked,
  isFrozen,
  isBoosted,
  isTrapped,
  isBlackHoleTriggered,
  isPowerTargeting,
  isPowerTarget,
  powerTargetLabel,
  onSquareClick,
}) {
  const className = [
    'square',
    value ? 'square-filled' : '',
    value === 'X' ? 'x-mark-square' : '',
    value === 'O' ? 'o-mark-square' : '',
    isWinningSquare ? 'winning-square' : '',
    isShielded ? 'shielded-square' : '',
    isLocked ? 'locked-square' : '',
    isFrozen ? 'frozen-square' : '',
    isBoosted ? 'boosted-square' : '',
    isTrapped ? 'trapped-square' : '',
    isBlackHoleTriggered ? 'black-hole-triggered-square' : '',
    isPowerTargeting ? 'power-targeting-square' : '',
    isPowerTarget ? 'power-target-eligible' : '',
    isPowerTargeting && !isPowerTarget ? 'power-target-ineligible' : '',
  ].join(' ')

  return (
    <button
      className={className}
      onClick={onSquareClick}
      disabled={isLocked || isFrozen}
      aria-label={
        isFrozen
          ? 'Donmuş kare'
          : isPowerTarget
            ? `${powerTargetLabel ?? 'Güç'} için uygun kare`
            : undefined
      }
    >
      {multiplier && <span className="multiplier-badge">{multiplier}x</span>}
      {isBoosted && <span className="boost-badge" aria-label="Boostlu kare">⚡</span>}
      {isShielded && <span className="shield-badge">SHIELD</span>}
      {isTrapped && <span className="trap-badge">🕳️</span>}
      {isBlackHoleTriggered && (
        <span className="black-hole-badge" aria-label="Kara delik tetiklendi">
          🕳️
        </span>
      )}
      {isLocked && (
        <span className="shattered-glass-overlay" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="shattered-glass-svg">
            {/* Ana Derin Kırık Damarları */}
            <path
              d="M 38 0 Q 39 8, 41 12 Q 43 14, 38 18 Q 30 22, 28 26 Q 20 28, 18 35 Q 19 42, 10 46 Q 6 48, 0 49"
              className="crack-major"
            />
            <path
              d="M 28 26 Q 35 34, 38 42 Q 33 46, 32 50 Q 38 56, 44 58 Q 50 61, 51 68 Q 48 74, 52 78 Q 53 85, 47 88 Q 49 94, 48 100"
              className="crack-major"
            />
            <path
              d="M 51 68 Q 60 63, 68 62 Q 74 65, 75 74 Q 82 72, 85 78 Q 80 84, 82 89 Q 90 88, 100 90"
              className="crack-major"
            />
            <path
              d="M 80 0 Q 78 8, 80 14 Q 78 18, 88 18 Q 90 22, 89 30 Q 94 33, 98 32 Q 94 38, 98 44 Q 93 42, 90 48 Q 91 55, 100 58"
              className="crack-major"
            />

            {/* Orta Düzey Çatlak Dalları */}
            <path d="M 62 22 Q 65 29, 63 32 Q 70 35, 76 35 Q 82 32, 86 38 Q 78 40, 75 48 Q 76 56, 74 65" className="crack-mid" />
            <path d="M 10 46 Q 14 55, 16 64 Q 12 70, 15 76 Q 13 82, 18 84 Q 15 90, 10 93 Q 8 98, 7 100" className="crack-mid" />
            <path d="M 75 74 Q 78 82, 77 92 Q 81 96, 80 100" className="crack-mid" />
            <path d="M 41 12 Q 46 12, 52 10 Q 56 12, 60 14" className="crack-mid" />
            <path d="M 18 10 Q 20 16, 26 18 Q 28 17, 30 19" className="crack-mid" />

            {/* İnce Kılcal Çatlaklar (Fractal Capillaries) */}
            <path d="M 33 50 Q 28 54, 25 57" className="crack-fine" />
            <path d="M 38 72 Q 33 76, 36 84 Q 38 86, 36 89" className="crack-fine" />
            <path d="M 44 58 Q 48 54, 52 54" className="crack-fine" />
            <path d="M 64 88 Q 68 89, 72 88" className="crack-fine" />
            <path d="M 82 89 Q 88 88, 94 92" className="crack-fine" />
            <path d="M 18 35 Q 16 28, 12 24" className="crack-fine" />
            <path d="M 38 18 Q 36 12, 32 10" className="crack-fine" />
            <path d="M 80 14 Q 85 10, 92 7 Q 96 8, 98 4" className="crack-fine" />
            <path d="M 63 32 Q 58 35, 54 34" className="crack-fine" />
            <path d="M 90 48 Q 84 50, 78 48" className="crack-fine" />
          </svg>
        </span>
      )}
      {isFrozen && <span className="freeze-badge" aria-label="Donmuş kare">❄️</span>}
      <span className="square-value">{value}</span>
    </button>
  )
})

export default Square
