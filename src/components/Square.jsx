export default function Square({
  value,
  multiplier,
  isWinningSquare,
  isShielded,
  isLocked,
  isBoosted,
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
  ].join(' ')

  return (
    <button className={className} onClick={onSquareClick} aria-disabled={isLocked}>
      {multiplier && <span className="multiplier-badge">{multiplier}x</span>}
      {isBoosted && <span className="boost-badge" aria-label="Boostlu kare">⚡</span>}
      {isShielded && <span className="shield-badge">SHIELD</span>}
      {isLocked && (
        <span className="lock-badge">
          <span aria-hidden="true">💥</span>
          <span>KİLİTLİ</span>
        </span>
      )}
      <span className="square-value">{value}</span>
    </button>
  )
}
