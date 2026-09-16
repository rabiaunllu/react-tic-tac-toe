import { memo } from 'react'
import { useTranslation } from '../i18n'
import { playSound, registerUserGesture } from '../game/soundManager'

const RoundResultPreviewBar = memo(function RoundResultPreviewBar({
  onNextRound,
  nextRoundLabel,
  isNextRoundDisabled = false,
  nextRoundTitle,
  onNewMatch,
  newMatchLabel,
  onMenu,
  menuLabel,
  onNextLevel,
  nextLevelLabel,
  onReopenResult,
  reopenLabel,
  statusMessage,
}) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const resolvedNextRoundLabel = nextRoundLabel ?? t('game.nextRound')
  const resolvedNewMatchLabel = newMatchLabel ?? (isTr ? '🔄 Yeni Maç' : '🔄 New Match')
  const resolvedMenuLabel = menuLabel ?? (isTr ? '🏠 Menü' : '🏠 Menu')
  const resolvedReopenLabel = reopenLabel ?? (isTr ? '📊 Sonuç Kartı' : '📊 View Result')
  const resolvedNextLevelLabel = nextLevelLabel ?? (isTr ? 'Sonraki Seviye ➔' : 'Next Level ➔')

  return (
    <section
      className={`round-result-preview${statusMessage ? '' : ' round-result-preview--action-only'}`}
      aria-live="polite"
    >
      {statusMessage && (
        <div className="round-result-preview-copy">
          <strong>{statusMessage}</strong>
          <small>{isTr ? 'Kazanan çizgi tahtada parlıyor.' : 'Winning line is highlighted.'}</small>
        </div>
      )}

      <div className="round-result-preview-actions">
        {onReopenResult && (
          <button
            type="button"
            className="round-result-preview-btn round-result-preview-btn--reopen"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onReopenResult()
            }}
          >
            {resolvedReopenLabel}
          </button>
        )}

        {onNextLevel && (
          <button
            type="button"
            className="round-result-preview-btn round-result-preview-btn--primary"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onNextLevel()
            }}
          >
            {resolvedNextLevelLabel}
          </button>
        )}

        {onNewMatch && (
          <button
            type="button"
            className="round-result-preview-btn round-result-preview-btn--primary"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onNewMatch()
            }}
          >
            {resolvedNewMatchLabel}
          </button>
        )}

        {onNextRound && (
          <button
            type="button"
            className="round-result-preview-btn round-result-preview-btn--primary"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onNextRound()
            }}
            disabled={isNextRoundDisabled}
            title={nextRoundTitle}
          >
            {resolvedNextRoundLabel}
          </button>
        )}

        {onMenu && (
          <button
            type="button"
            className="round-result-preview-btn round-result-preview-btn--secondary"
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onMenu()
            }}
          >
            {resolvedMenuLabel}
          </button>
        )}
      </div>
    </section>
  )
})

export default RoundResultPreviewBar
