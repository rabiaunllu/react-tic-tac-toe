import { memo } from 'react'

const RoundResultPreviewBar = memo(function RoundResultPreviewBar({
  onNextRound,
  nextRoundLabel = 'Sonraki Tur',
  isNextRoundDisabled = false,
  nextRoundTitle,
  statusMessage,
}) {
  return (
    <section
      className={`round-result-preview${statusMessage ? '' : ' round-result-preview--action-only'}`}
      aria-live="polite"
    >
      {statusMessage && (
        <div className="round-result-preview-copy">
          <small>{statusMessage}</small>
        </div>
      )}

      <button
        type="button"
        onClick={onNextRound}
        disabled={isNextRoundDisabled}
        title={nextRoundTitle}
      >
        {nextRoundLabel}
      </button>
    </section>
  )
})

export default RoundResultPreviewBar
