/*bir kare ileride sadece X/O göstermeyecek.
 Belki koruma simgesi, çarpan etiketi, patlama animasyonu, joker efekti gösterecek. 
 O yüzden kareyi baştan ayrı component tutulur*/

export default function Square({ value, multiplier, onSquareClick }) {
  return (
    <button className={`square ${value ? 'square-filled' : ''}`} onClick={onSquareClick}>
      {multiplier && <span className="multiplier-badge">{multiplier}x</span>}
      <span>{value}</span>
    </button>
  )
}