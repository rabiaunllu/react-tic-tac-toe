import { memo } from 'react'
import { useTranslation } from '../i18n'

const GameStatus = memo(function GameStatus({
  winner,
  isDraw,
  matchWinner,
  isAiThinking,
}) {
  const { t } = useTranslation()

  if (matchWinner || winner || isDraw) {
    return null
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
