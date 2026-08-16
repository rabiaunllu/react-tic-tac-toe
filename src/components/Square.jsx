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
        <span className="lock-badge" aria-label="Bomba etkisi">
          <span aria-hidden="true">✦</span>
        </span>
      )}
      {isFrozen && <span className="freeze-badge" aria-label="Donmuş kare">❄️</span>}
      <span className="square-value">{value}</span>
    </button>
  )
})

export default Square
