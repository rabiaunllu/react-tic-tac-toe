/*bir kare ileride sadece X/O göstermeyecek.
 Belki koruma simgesi, çarpan etiketi, patlama animasyonu, joker efekti gösterecek. 
 O yüzden kareyi baştan ayrı component tutulur*/

export default function Square({
  value,
  multiplier,
  isWinningSquare,
  isShielded,
  onSquareClick,
}) {
  const className = [
    'square',
    value ? 'square-filled' : '',
    isWinningSquare ? 'winning-square' : '',
    isShielded ? 'shielded-square' : '',
  ].join(' ')

  return (
    <button className={className} onClick={onSquareClick}>
      {multiplier && <span className="multiplier-badge">{multiplier}x</span>}
      {isShielded && <span className="shield-badge">🛡️</span>}
      <span>{value}</span>
    </button>
  )
}