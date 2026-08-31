import { useEffect, useState } from 'react'
import { playSound, registerUserGesture } from '../game/soundManager'
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
  nextRoundLabel = 'Sonraki tur',
  isNextRoundDisabled = false,
  nextRoundTitle,
  menuConfirmTitle = 'Ayarlara dönülsün mü?',
  menuConfirmActionLabel = 'Ayarlara dön',
}) {
  const [isMenuConfirmOpen, setIsMenuConfirmOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

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
    resultMessage?.includes('hükmen')
  )
  const isMatchOver = Boolean(matchWinner) || isForfeitWin

  const heading = isForfeitWin
    ? 'HÜKMEN GALİBİYET'
    : isMatchOver
      ? 'MAÇ SONUCU'
      : `TUR ${roundNumber} SONUCU`

  const resultLabel = isForfeitWin
    ? '🏆 RAKİP OYUNDAN AYRILDI '
    : isDraw
      ? 'TUR BERABERE'
      : isMatchOver
        ? `${displayedWinner} MAÇI KAZANDI`
        : `${displayedWinner} TURU KAZANDI`

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
    const shareText = `🎮 XO ARENA ${heading}! ${resultLabel} (${p1Label}: ${p1ScoreVal} - ${p2Label}: ${p2ScoreVal}). Sen de meydan oku: ${window.location.href}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'XO ARENA Maç Sonucu',
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
            aria-label="Tahtayı gör"
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

        <div className="round-result-score" aria-label={`Skor ${p1ScoreVal} - ${p2ScoreVal}`}>
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
              <strong>Sen kazandın!</strong>
              <small>Rakip oyundan ayrıldığı için zafer senindir.</small>
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
            className="viral-share-btn"
            onClick={handleShareScore}
          >
            {isCopied ? '✓ Skormatik Kopyalandı!' : '📸 Skoru Paylaş'}
          </button>
        )}

        {isMenuConfirmOpen ? (
          <div className="round-result-confirm">
            <strong id="round-result-confirm-title">{menuConfirmTitle}</strong>

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
                Vazgeç
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
                {menuConfirmActionLabel}
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
                Yeni maç
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
                {nextRoundLabel}
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
              Menü
            </button>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
