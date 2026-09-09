import { memo } from 'react'
import { useTranslation } from '../i18n'

const GameStatus = memo(function GameStatus({
  winner,
  isDraw,
  resultMessage,
  loserMessage,
  matchWinner,
  isAiThinking,
}) {
  const { t } = useTranslation()

  if (matchWinner) {
    return null
  }

  if (winner && resultMessage) {
    const [icon, title, subtitle] = resultMessage

    return (
      <div className="status winner result-status round-result">
        <span className="result-icon">{icon}</span>
        <div className="result-copy">
          <strong>{t('game.tookRound', { player: winner })}</strong>
          <small>{loserMessage || (icon === '⏰' ? title : subtitle) || title}</small>
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
    return <div className="status draw">{t('game.drawText')}</div>
  }

  if (isAiThinking) {
    return (
      <div className="status ai-thinking" aria-live="polite" aria-label={t('game.aiThinkingAria')}>
        <span className="ai-thinking-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
        {t('game.aiThinkingText')}
      </div>
    )
  }

  return null
})

export default GameStatus
