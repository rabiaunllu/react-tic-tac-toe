import { useEffect, useState } from 'react'
import { playSound, registerUserGesture } from '../game/soundManager'
import { useTranslation } from '../i18n'
import WinConfetti from './WinConfetti'
import { shareOrDownloadVictoryCard } from '../utils/victoryCard'

export default function RoundResultModal({
  roundNumber,
  winner,
  winningSymbol = winner,
  mySymbol = null,
  isDraw,
  matchWinner,
  isForfeit = false,
  isTimeout = false,
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
  campaignLevel = null,
  dailyChallenge = null,
  dailyReward = 0,
  missionStars = 0,
  missionCompleted = false,
  missionAttempted = false,
  onNextLevel = null,
  hasNextLevel = false,
  missionFailure = null,
  moves = 0,
}) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)

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
  const isMyVictory = mySymbol
    ? winningSymbol === mySymbol || (!winningSymbol && matchWinner === player1Name)
    : true
  const isTimeoutWin = Boolean(
    isTimeout ||
    (typeof resultMessage === 'string' && (
      resultMessage.includes('Süresi Bitti') ||
      resultMessage.includes('Süren Bitti') ||
      resultMessage.includes('Timed Out') ||
      resultMessage.includes('Time Is Up')
    ))
  )
  const isForfeitWin = Boolean(
    !isTimeoutWin && (
      isForfeit ||
      (typeof resultMessage === 'string' && (
        resultMessage.includes('ayrıldı') ||
        resultMessage.includes('Pes Etti') ||
        resultMessage.includes('çekildi') ||
        resultMessage.includes('Hükmen') ||
        resultMessage.includes('hükmen') ||
        resultMessage.includes('forfeit') ||
        resultMessage.includes('left')
      ))
    )
  )
  const isMatchOver = Boolean(matchWinner) || isForfeitWin
  const isSameAction = Boolean(!onMenu || !onNewMatch || onMenu === onNewMatch)
  const showMenuButton = isMatchOver ? (!isSameAction && Boolean(onMenu)) : Boolean(onMenu)
  const isSingleAction = !showMenuButton

  const heading = isForfeitWin
    ? (isMyVictory ? (isTr ? 'HÜKMEN GALİBİYET' : 'FORFEIT VICTORY') : (isTr ? 'HÜKMEN MAĞLUBİYET' : 'FORFEIT DEFEAT'))
    : isTimeoutWin
      ? (isMatchOver ? (isTr ? 'MAÇ BİTTİ (SÜRE AŞIMI)' : 'MATCH OVER (TIME OUT)') : (isTr ? 'SÜRE BİTTİ' : 'TIME OUT'))
      : isMatchOver
        ? (isTr ? 'MAÇ SONUCU' : 'MATCH RESULT')
        : (isTr ? `TUR ${roundNumber} SONUCU` : `ROUND ${roundNumber} RESULT`)

  const getTimeoutLabel = () => {
    if (typeof resultMessage === 'string' && resultMessage.trim()) {
      return resultMessage.startsWith('⏰') ? resultMessage : `⏰ ${resultMessage}`
    }
    return isTr ? '⏰ SÜRE AŞIMI' : '⏰ TIME OUT'
  }

  const resultLabel = isTimeoutWin
    ? getTimeoutLabel()
    : isForfeitWin
      ? (isMyVictory ? (isTr ? '🏆 RAKİP OYUNDAN AYRILDI' : '🏆 OPPONENT FORFEITED') : (isTr ? '⚠️ BAĞLANTI ZAMAN AŞIMI' : '⚠️ CONNECTION TIMED OUT'))
      : isDraw
        ? (isTr ? 'TUR BERABERE' : 'ROUND DRAW')
        : isMatchOver
          ? (isTr ? `${displayedWinner} MAÇI KAZANDI` : `${displayedWinner} WON THE MATCH`)
          : (isTr ? `${displayedWinner} TURU KAZANDI` : `${displayedWinner} WON THE ROUND`)

  const symbol = isTimeoutWin ? '⏰' : isForfeitWin ? (isMyVictory ? '🏆' : '⚠️') : isDraw ? '=' : (winningSymbol || '🏆')
  const symbolModifier = isTimeoutWin
    ? (winningSymbol?.toLowerCase() || 'draw')
    : isForfeitWin
      ? (isMyVictory ? (winningSymbol?.toLowerCase() || 'x') : 'draw')
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
    setIsGeneratingCard(true)

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
      ? (isMyVictory ? (isTr ? 'Hükmen Galibiyet!' : 'Forfeit Victory!') : (isTr ? 'Hükmen Mağlubiyet!' : 'Forfeit Defeat!'))
      : isDraw
        ? (isTr ? 'Tur Berabere!' : 'Round Draw!')
        : isMatchOver
          ? (isTr ? `${displayedWinner} Şampiyon!` : `${displayedWinner} Won the Match!`)
          : (isTr ? `${displayedWinner} Turu Kazandı!` : `${displayedWinner} Won the Round!`)

    const shareLines = [
      `⚡ XO TACTIX ${resultEmoji}`,
      `${modeEmoji} Mod: ${modeLabel} (${boardLabel})`,
      `🎮 ${resultLine}`,
      `📊 Skor: ${p1ScoreVal} - ${p2ScoreVal} ${streakText}`.trim(),
      `🆚 ${opponentLabel}`,
      ``,
      isTr ? `👉 Sen de dene / meydan oku:` : `👉 Challenge me now:`,
      window.location.href,
    ]

    const shareText = shareLines.join('\n')

    try {
      // 1. Generate & Share/Download high-res Esports Victory Card
      await shareOrDownloadVictoryCard({
        winner: displayedWinner,
        winningSymbol,
        isDraw,
        isMatchOver,
        p1Name: player1Name || (isTr ? 'Oyuncu 1' : 'Player 1'),
        p2Name: player2Name || (isTr ? 'Oyuncu 2' : 'Player 2'),
        p1Score: p1ScoreVal,
        p2Score: p2ScoreVal,
        gameMode,
        boardSize,
        winStreak,
        isTr,
      })
    } catch {
      // Continue to clipboard copy
    } finally {
      setIsGeneratingCard(false)
    }

    // 2. Also copy formatted duel text to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText)
      } catch {
        // Ignore clipboard permission errors
      }
    }

    playSound('streak')
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  return (
    <div className="round-result-overlay" role="presentation">
      <div className="round-result-modal-wrapper">
        {!isDraw && isMyVictory && <WinConfetti active={true} />}

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
            aria-label={isTr ? 'Tahtayı İncele' : 'Inspect Board'}
            title={isTr ? 'Tahtayı incelemek için kapat' : 'Close to inspect board'}
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

        {campaignLevel || dailyChallenge ? (
          <div className="round-result-mission-stats">
            <div className="mission-stat-item">
              <span>{isTr ? 'HAMLE' : 'MOVES'}</span>
              <strong className="mission-stat-moves">{moves ?? 1}</strong>
            </div>
            {campaignLevel && (
              <div className="mission-stat-item">
                <span>{isTr ? 'YILDIZ' : 'STARS'}</span>
                <strong className="mission-stat-stars">
                  {isMyVictory && missionCompleted
                    ? `${'★'.repeat(Math.max(1, missionStars))}${'☆'.repeat(Math.max(0, 3 - missionStars))}`
                    : '☆☆☆'}
                </strong>
              </div>
            )}
            {dailyChallenge && (
              <div className="mission-stat-item">
                <span>{isTr ? 'ÖDÜL' : 'REWARD'}</span>
                <strong style={{ color: isMyVictory && missionCompleted ? '#4ade80' : '#fbbf24' }}>
                  {isMyVictory && missionCompleted
                    ? (dailyChallenge.isPractice
                        ? (isTr ? '🎯 Pratik' : '🎯 Practice')
                        : `+${dailyReward} TP`)
                    : (isTr ? '0 Puan' : '0 Pts')}
                </strong>
              </div>
            )}
            <div className="mission-stat-item">
              <span>{isTr ? 'DURUM' : 'STATUS'}</span>
              <strong style={{ color: isMyVictory && missionCompleted ? '#38bdf8' : '#f43f5e', fontSize: '15px' }}>
                {isMyVictory && missionCompleted ? (isTr ? 'BAŞARILI' : 'PASSED') : (isTr ? 'BAŞARISIZ' : 'FAILED')}
              </strong>
            </div>
          </div>
        ) : (
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
        )}

        <div className="round-result-message" id="round-result-message">
          {isForfeitWin ? (
            <>
              <strong>{isMyVictory ? t('modals.roundResult.forfeitWinTitle') : t('modals.roundResult.forfeitLossTitle')}</strong>
              <small>{isMyVictory ? t('modals.roundResult.forfeitWinDesc') : t('modals.roundResult.forfeitLossDesc')}</small>
            </>
          ) : !isDraw && !isMyVictory ? (
            <>
              <strong>💀 {isTr ? 'Bu tur kaçtı.' : 'Round lost.'}</strong>
              <small>{loserMessage || (isTr ? 'Rövanş şart oldu.' : 'Rematch is calling.')}</small>
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

        {campaignLevel && !isDraw && isMyVictory && missionCompleted && (
          <div className="mission-result-reward mission-result-reward--campaign">
            <strong>{isTr ? 'Bulmaca seferi tamamlandı' : 'Puzzle quest complete'}</strong>
            <span>{'★'.repeat(Math.max(1, missionStars))}{'☆'.repeat(Math.max(0, 3 - missionStars))}</span>
          </div>
        )}

        {dailyChallenge && !isDraw && isMyVictory && missionCompleted && (
          <div className="mission-result-reward mission-result-reward--daily">
            <strong>{dailyChallenge.isPractice ? (isTr ? 'Alıştırma tamamlandı' : 'Practice complete') : (isTr ? 'Günün görevi tamamlandı' : 'Daily challenge complete')}</strong>
            <span>
              {dailyChallenge.isPractice
                ? (isTr ? 'Harika pratik! Günlük serin ve ödülün korundu.' : 'Great practice! Daily streak & reward secured.')
                : (isTr ? `+${dailyReward} TP · Seri korundu` : `+${dailyReward} XP · Streak secured`)}
            </span>
          </div>
        )}

        {(campaignLevel || dailyChallenge) && !isDraw && isMyVictory && missionAttempted && !missionCompleted && (
          <div className="mission-result-reward mission-result-reward--failed">
            <strong>{isTr ? 'Görev koşulu tamamlanmadı' : 'Mission condition not met'}</strong>
            <span>
              {missionFailure
                ? (isTr ? missionFailure.messageTr : missionFailure.messageEn)
                : (isTr ? 'Bu galibiyet ödül veya seri kazandırmadı.' : 'This win did not grant the reward or streak.')}
            </span>
          </div>
        )}

        {/* ── Social Victory Share Button ── */}
        {!isMenuConfirmOpen && (
          <button
            type="button"
            className={`viral-share-btn ${isCopied ? 'viral-share-btn--copied' : ''}`}
            onClick={handleShareScore}
            disabled={isGeneratingCard}
          >
            {isGeneratingCard
              ? (isTr ? '⏳ Hazırlanıyor...' : '⏳ Generating...')
              : isCopied
                ? t('modals.roundResult.socialShareCopied')
                : t('modals.roundResult.socialShareBtn')}
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
          <div className={`round-result-actions ${isSingleAction ? 'round-result-actions--single' : ''}`}>
            {campaignLevel && isMyVictory && missionCompleted && hasNextLevel && onNextLevel ? (
              <button
                type="button"
                className="round-result-btn--viral"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  onNextLevel()
                }}
                autoFocus
              >
                {isTr ? 'SONRAKİ SEVİYE ➔' : 'NEXT LEVEL ➔'}
              </button>
            ) : isMatchOver ? (
              <button
                type="button"
                className="round-result-btn--viral"
                onClick={() => {
                  registerUserGesture()
                  playSound('click')
                  if (onNewMatch) {
                    onNewMatch()
                  } else {
                    onMenu()
                  }
                }}
                autoFocus
              >
                {t('common.newMatchViral')}
              </button>
            ) : (
              <button
                type="button"
                className="round-result-btn--viral"
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

            {showMenuButton && (
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
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
