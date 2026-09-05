import { memo } from 'react'
import { useTranslation } from '../i18n'

const RoundResultPreviewBar = memo(function RoundResultPreviewBar({
  onNextRound,
  nextRoundLabel,
  isNextRoundDisabled = false,
  nextRoundTitle,
  statusMessage,
}) {
  const { t } = useTranslation()
  const resolvedLabel = nextRoundLabel ?? t('game.nextRound')
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
        {resolvedLabel}
      </button>
    </section>
  )
})

export default RoundResultPreviewBar
