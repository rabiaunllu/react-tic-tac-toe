export default function GameStatus({
  winner,
  isDraw,
  roundScore,
  resultMessage,
  loserMessage,
  matchWinner,
}) {
  if (matchWinner) {
    return null
  }

  if (winner && resultMessage) {
    const [icon, title, subtitle] = resultMessage

    return (
      <div className="status winner result-status round-result">
        <span className="result-icon">{icon}</span>
        <div className="result-copy">
          <strong>{winner} turu aldı</strong>
          <span>+{roundScore} puan</span>
          <small>{loserMessage || subtitle || title}</small>
        </div>
      </div>
    )
  }

  if (isDraw && resultMessage) {
    const [icon, title, subtitle] = resultMessage

    return (
      <div className="status draw result-status round-result">
        <span className="result-icon">{icon}</span>
        <div className="result-copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
      </div>
    )
  }

  if (isDraw) {
    return <div className="status draw">Berabere.</div>
  }

  return null
}
