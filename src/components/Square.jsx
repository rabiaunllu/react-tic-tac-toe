export default function Square({
  value,
  multiplier,
  isWinningSquare,
  isShielded,
  isLocked,
  isBoosted,
  isTrapped,
  isBlackHoleTriggered,
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
    isBoosted ? 'boosted-square' : '',
    isTrapped ? 'trapped-square' : '',
    isBlackHoleTriggered ? 'black-hole-triggered-square' : '',
  ].join(' ')

  return (
    <button className={className} onClick={onSquareClick} aria-disabled={isLocked}>
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
        <span className="lock-badge">
          <span aria-hidden="true">!</span>
          <span>💥</span>
        </span>
      )}
      <span className="square-value">{value}</span>
    </button>
  )
}
