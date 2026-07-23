import Square from './Square'
//9 elemanlı squares dizisini geziyor ve her eleman için bir Square oluşturuyor.

export default function Board({ squares, multipliers, onSquareClick }) {
  return (
    <div className="board">
      {squares.map((square, index) => (
        <Square
          key={index}
          value={square}
          multiplier={multipliers[index]}
          onSquareClick={() => onSquareClick(index)}
        />
      ))}
    </div>
  )
}