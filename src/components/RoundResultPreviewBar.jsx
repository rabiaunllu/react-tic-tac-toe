import { memo } from 'react'
import { useTranslation } from '../i18n'
import { playSound, registerUserGesture } from '../game/soundManager'

const RoundResultPreviewBar = memo(function RoundResultPreviewBar({
  onNextRound,
  nextRoundLabel,
  isNextRoundDisabled = false,
  nextRoundTitle,
}) {
  const { t } = useTranslation()
  const resolvedLabel = nextRoundLabel ?? t('game.nextRound')

  if (!onNextRound) return null

  return (
    <aside className="round-result-preview round-result-preview-floating" aria-live="polite">
      <button
        type="button"
        className="round-result-preview-cta"
        onClick={() => {
          registerUserGesture()
          playSound('click')
          onNextRound()
        }}
        disabled={isNextRoundDisabled}
        title={nextRoundTitle}
      >
        <span>{resolvedLabel}</span>
        {!resolvedLabel.includes('➔') && <span aria-hidden="true">➔</span>}
      </button>
    </aside>
  )
})

export default RoundResultPreviewBar
