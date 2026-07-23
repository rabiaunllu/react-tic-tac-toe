export default function GameStatus({
  winner,
  isDraw,
  xIsNext,
  roundScore,
  resultMessage,
  loserMessage,
}) {
  if (winner && resultMessage) {
    const [icon, title, subtitle] = resultMessage
    const loser = winner === 'X' ? 'O' : 'X'

    return (
      <div className="status winner result-status">
        <span className="result-icon">{icon}</span>
        <span>
          Kazanan: {winner}. +{roundScore} puan aldı.
        </span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
        {loserMessage && <small>{loser} için not: {loserMessage}</small>}
      </div>
    )
  }

  if (isDraw && resultMessage) {
    const [icon, title, subtitle] = resultMessage

    return (
      <div className="status draw result-status">
        <span className="result-icon">{icon}</span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
    )
  }

  if (isDraw) {
    return <div className="status draw">Berabere.</div>
  }

  return <div className="status">Sıradaki oyuncu: {xIsNext ? 'X' : 'O'}</div>
}