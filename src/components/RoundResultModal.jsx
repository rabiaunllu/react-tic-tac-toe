import { useEffect, useState } from 'react'
import { playSound, registerUserGesture } from '../game/soundManager'
import { useTranslation } from '../i18n'
import WinConfetti from './WinConfetti'

export default function RoundResultModal({
  roundNumber,
  winner,
  winningSymbol = winner,
  isDraw,
  matchWinner,
  isForfeit = false,
  scores,
  scoreLabel,
  resultMessage,
  loserMessage,
  player1Name,
  player2Name,
  onNextRound,
  onNewMatch,
  onMenu,
  onClose,
  nextRoundLabel,
  isNextRoundDisabled = false,
  nextRoundTitle,
  menuConfirmTitle,
  menuConfirmActionLabel,
  gameMode = 'classic',
  boardSize = 3,
  winStreak = 0,
  opponentType = 'human',
}) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const resolvedNextRoundLabel = nextRoundLabel ?? t('common.nextRound')
  const resolvedMenuConfirmTitle = menuConfirmTitle ?? t('modals.confirmMenuTitle')
  const resolvedMenuConfirmAction = menuConfirmActionLabel ?? t('modals.confirmMenuAction')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const displayedWinner = matchWinner ?? winner
  const isForfeitWin = Boolean(
    isForfeit ||
    resultMessage?.includes('ayrıldı') ||
    resultMessage?.includes('Pes Etti') ||
    resultMessage?.includes('çekildi') ||
    resultMessage?.includes('Hükmen') ||
    resultMessage?.includes('hükmen') ||
    resultMessage?.includes('forfeit') ||
    resultMessage?.includes('left')
  )
  const isMatchOver = Boolean(matchWinner) || isForfeitWin

  const heading = isForfeitWin
    ? (isTr ? 'HÜKMEN GALİBİYET' : 'FORFEIT VICTORY')
    : isMatchOver
      ? (isTr ? 'MAÇ SONUCU' : 'MATCH RESULT')
      : (isTr ? `TUR ${roundNumber} SONUCU` : `ROUND ${roundNumber} RESULT`)

  const resultLabel = isForfeitWin
    ? (isTr ? '🏆 RAKİP OYUNDAN AYRILDI' : '🏆 OPPONENT FORFEITED')
    : isDraw
      ? (isTr ? 'TUR BERABERE' : 'ROUND DRAW')
      : isMatchOver
        ? (isTr ? `${displayedWinner} MAÇI KAZANDI` : `${displayedWinner} WON THE MATCH`)
        : (isTr ? `${displayedWinner} TURU KAZANDI` : `${displayedWinner} WON THE ROUND`)

  const symbol = isForfeitWin ? '🏆' : isDraw ? '=' : (winningSymbol || '🏆')
  const symbolModifier = isForfeitWin
    ? 'x'
    : isDraw
      ? 'draw'
      : (winningSymbol?.toLowerCase() || 'x')

  const p1ScoreVal = scores?.p1 ?? scores?.X ?? 0
  const p2ScoreVal = scores?.p2 ?? scores?.O ?? 0
  const p1Label = player1Name ? `${player1Name}` : `X ${scoreLabel}`
  const p2Label = player2Name ? `${player2Name}` : `O ${scoreLabel}`

  async function handleShareScore() {
    registerUserGesture()
    playSound('click')

    const modeEmoji = gameMode === 'arena' ? '⚔️' : '🎯'
    const modeLabel = isTr
      ? (gameMode === 'arena' ? 'Arena' : 'Klasik')
      : (gameMode === 'arena' ? 'Arena' : 'Classic')

    const boardLabel = `${boardSize}x${boardSize}`

    const opponentLabel = opponentType === 'ai'
      ? 'Bot'
      : opponentType === 'online'
        ? (isTr ? 'Online Rakip' : 'Online Opponent')
        : (isTr ? 'Yerel 2P' : 'Local 2P')

    const streakText = winStreak > 1
      ? (isTr ? `(${winStreak} Galibiyet Serisi! 🔥)` : `(${winStreak} Win Streak! 🔥)`)
      : ''

    const resultEmoji = isDraw ? '🤝' : isMatchOver ? '🏆' : '⚡'
    const resultLine = isForfeitWin
      ? (isTr ? 'Hükmen Galibiyet!' : 'Forfeit Victory!')
      : isDraw
        ? (isTr ? 'Tur Berabere!' : 'Round Draw!')
        : isMatchOver
          ? (isTr ? `${displayedWinner} Şampiyon!` : `${displayedWinner} Won the Match!`)
          : (isTr ? `${displayedWinner} Turu Kazandı!` : `${displayedWinner} Won the Round!`)

    const shareLines = [
      `⚡ XO ARENA ${resultEmoji}`,
      `${modeEmoji} Mod: ${modeLabel} (${boardLabel})`,
      `🎮 ${resultLine}`,
      `📊 Skor: ${p1ScoreVal} - ${p2ScoreVal} ${streakText}`.trim(),
      `🆚 ${opponentLabel}`,
      ``,
      isTr ? `👉 Sen de dene / meydan oku:` : `👉 Challenge me now:`,
      window.location.href,
    ]

    const shareText = shareLines.join('\n')

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: isTr ? 'XO ARENA Maç Sonucu' : 'XO ARENA Match Result',
          text: shareText,
          url: window.location.href,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  return (
    <div className="round-result-overlay" role="presentation">
      <div className="round-result-modal-wrapper">
        {!isDraw && <WinConfetti active={true} />}

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
        {onClose && !isMenuConfirmOpen && (
          <button
            type="button"
            className="round-result-close"
            aria-label={t('game.watchBoard')}
            onClick={() => {
              registerUserGesture()
              playSound('click')
              onClose()
            }}
          >
            ×
          </button>
        )}
        <span className="round-result-eyebrow">{heading}</span>

        <span
          className="round-result-symbol"
          aria-hidden="true"
        >
          {symbol}
        </span>

        <h2 id="round-result-title">{resultLabel}</h2>

        <div className="round-result-score" aria-label={`${isTr ? 'Skor' : 'Score'} ${p1ScoreVal} - ${p2ScoreVal}`}>
          <div>
            <strong>{p1ScoreVal}</strong>
            <span>{p1Label}</span>
          </div>

          <span aria-hidden="true">VS</span>

          <div>
            <strong>{p2ScoreVal}</strong>
            <span>{p2Label}</span>
          </div>
        </div>

        <div className="round-result-message" id="round-result-message">
          {isForfeitWin ? (
            <>
              <strong>{t('modals.roundResult.forfeitWinTitle')}</strong>
              <small>{t('modals.roundResult.forfeitWinDesc')}</small>
            </>
          ) : Array.isArray(resultMessage) ? (
            <>
              <strong>{resultMessage[0]} {resultMessage[1]}</strong>
              {resultMessage[2] && <small>{resultMessage[2]}</small>}
            </>
          ) : (
            <>
              {resultMessage && <strong>{resultMessage}</strong>}
              {loserMessage && <small>{loserMessage}</small>}
            </>
          )}
        </div>

        {/* ── Social Victory Share Button ── */}
        {!isMenuConfirmOpen && (
          <button
            type="button"
            className={`viral-share-btn ${isCopied ? 'viral-share-btn--copied' : ''}`}
            onClick={handleShareScore}
          >
            {isCopied ? t('modals.roundResult.socialShareCopied') : t('modals.roundResult.socialShareBtn')}
          </button>
        )}

        {isMenuConfirmOpen ? (
          <div className="round-result-confirm">
            <strong id="round-result-confirm-title">{resolvedMenuConfirmTitle}</strong>

            <div className="round-result-actions round-result-confirm-actions">
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  setIsMenuConfirmOpen(false)
                }}
                autoFocus
              >
                {t('common.cancel')}
              </button>

              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  onMenu()
                }}
              >
                {resolvedMenuConfirmAction}
              </button>
            </div>
          </div>
        ) : (
          <div className="round-result-actions">
            {isMatchOver ? (
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  onNewMatch()
                }}
                autoFocus
              >
                {t('common.newMatch')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  onNextRound()
                }}
                disabled={isNextRoundDisabled}
                title={nextRoundTitle}
                autoFocus={!isNextRoundDisabled}
              >
                {resolvedNextRoundLabel}
              </button>
            )}

            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                registerUserGesture()
                playSound('click')

                if (isMatchOver) {
                  onMenu()
                  return
                }

                setIsMenuConfirmOpen(true)
              }}
            >
              {t('common.mainMenu')}
            </button>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
