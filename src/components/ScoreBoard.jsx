import { memo } from 'react'

const ScoreBoard = memo(function ScoreBoard({ scores, scoreLabel = 'Skor', onResetScores }) {
  return (
    <section className="score-board" aria-label={`${scoreLabel} tablosu`}>
      <div className="score-card x-score">
        <span className="score-label">X {scoreLabel}</span>
        <strong>{scores.X}</strong>
      </div>

      <button className="score-reset-button" onClick={onResetScores}>
        {scoreLabel} sıfırla
      </button>

      <div className="score-card o-score">
        <span className="score-label">O {scoreLabel}</span>
        <strong>{scores.O}</strong>
      </div>
    </section>
  )
})

export default ScoreBoard
