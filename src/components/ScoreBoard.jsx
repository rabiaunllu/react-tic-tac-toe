export default function ScoreBoard({ scores, onResetScores }) {
  return (
    <section className="score-board" aria-label="Skor tablosu">
      <div className="score-card x-score">
        <span className="score-label">X</span>
        <strong>{scores.X}</strong>
      </div>

      <button className="score-reset-button" onClick={onResetScores}>
        Skoru sıfırla
      </button>

      <div className="score-card o-score">
        <span className="score-label">O</span>
        <strong>{scores.O}</strong>
      </div>
    </section>
  )
}