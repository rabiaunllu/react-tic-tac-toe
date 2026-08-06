import { useEffect, useState } from 'react'

export default function RoundResultModal({
  roundNumber,
  winner,
  isDraw,
  matchWinner,
  scores,
  scoreLabel,
  resultMessage,
  loserMessage,
  onNextRound,
  onNewMatch,
  onMenu,
}) {
    const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
    useEffect(() => {
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  return () => {
    document.body.style.overflow = previousOverflow
  }
}, [])
  const displayedWinner = matchWinner ?? winner
  const isMatchOver = Boolean(matchWinner)

  const heading = isMatchOver
    ? 'MAÇ SONUCU'
    : `TUR ${roundNumber} SONUCU`

  const resultLabel = isDraw
    ? 'TUR BERABERE'
    : isMatchOver
      ? `${displayedWinner} MAÇI KAZANDI`
      : `${displayedWinner} TURU KAZANDI`

  const symbol = isDraw ? '=' : displayedWinner
  const symbolModifier = isDraw
    ? 'draw'
    : displayedWinner.toLowerCase()

  return (
    <div className="round-result-overlay" role="presentation">
      <section
        className={`round-result-card round-result-card--${symbolModifier}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
  isMenuConfirmOpen
    ? 'round-result-confirm-title'
    : 'round-result-title'
}
        aria-describedby={
  isMenuConfirmOpen
    ? undefined
    : 'round-result-message'
}
      >
        <span className="round-result-eyebrow">{heading}</span>

        <span
          className="round-result-symbol"
          aria-hidden="true"
        >
          {symbol}
        </span>

        <h2 id="round-result-title">{resultLabel}</h2>

        <div className="round-result-score" aria-label={`Skor ${scores.X} - ${scores.O}`}>
          <div>
            <strong>{scores.X}</strong>
            <span>X {scoreLabel}</span>
          </div>

          <span aria-hidden="true">VS</span>

          <div>
            <strong>{scores.O}</strong>
            <span>O {scoreLabel}</span>
          </div>
        </div>

        <div className="round-result-message" id="round-result-message">
          {resultMessage && <strong>{resultMessage}</strong>}
          {loserMessage && <small>{loserMessage}</small>}
        </div>

       {isMenuConfirmOpen ? (
  <div className="round-result-confirm">
    <strong id="round-result-confirm-title">
      Ayarlara dönülsün mü?
    </strong>

    <div className="round-result-actions round-result-confirm-actions">
      <button
        type="button"
        onClick={() => setIsMenuConfirmOpen(false)}
        autoFocus
      >
        Vazgeç
      </button>

      <button
        type="button"
        className="danger-action"
        onClick={onMenu}
      >
        Ayarlara dön
      </button>
    </div>
  </div>
) : (
  <div className="round-result-actions">
    {isMatchOver ? (
      <button type="button" onClick={onNewMatch} autoFocus>
        Yeni maç
      </button>
    ) : (
      <button type="button" onClick={onNextRound} autoFocus>
        Sonraki tur
      </button>
    )}

    <button
      type="button"
      className="secondary-action"
      onClick={() => {
        if (isMatchOver) {
          onMenu()
          return
        }

        setIsMenuConfirmOpen(true)
      }}
    >
      Menü
    </button>
  </div>
)}
      </section>
    </div>
  )
}
