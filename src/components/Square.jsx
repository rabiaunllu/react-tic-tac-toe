/*bir kare ileride sadece X/O göstermeyecek.
 Belki koruma simgesi, çarpan etiketi, patlama animasyonu, joker efekti veya boost gösterecek.
 O yüzden kareyi baştan ayrı component tutulur*/

export default function Square({
  value,
  multiplier,
  isWinningSquare,
  isShielded,
  isBoosted,
  onSquareClick,
}) {
  const className = [
    'square',
    value ? 'square-filled' : '',
    isWinningSquare ? 'winning-square' : '',
    isShielded ? 'shielded-square' : '',
    isBoosted ? 'boosted-square' : '',
  ].join(' ')

  return (
    <button className={className} onClick={onSquareClick}>
      {multiplier && <span className="multiplier-badge">{multiplier}x</span>}
      {isBoosted && <span className="boost-badge">⚡</span>}
      {isShielded && <span className="shield-badge">🛡️</span>}
      <span>{value}</span>
    </button>
  )
}
