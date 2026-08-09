import { useEffect, useState } from 'react'
import { playSound, registerUserGesture } from '../game/soundManager'
import WinConfetti from './WinConfetti'

export default function RoundResultModal({
  roundNumber,
  winner,
  isDraw,
  matchWinner,
  scores,
  scoreLabel,
  resultMessage,
  loserMessage,
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
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [adCountdown, setAdCountdown] = useState(3)
  const [pendingAction, setPendingAction] = useState(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const displayedWinner = matchWinner ?? winner
  const isMatchOver = Boolean(matchWinner)

  const heading = isMatchOver
    ? 'MAÇ SONUCU'
    : `TUR ${roundNumber} SONUCU`

  const resultLabel = isDraw
    ? 'TUR BERABERE'
    : isMatchOver
      ? `${displayedWinner} MAÇI KAZANDI`
      : `${displayedWinner} TURU KAZANDI`

  const symbol = isDraw ? '=' : displayedWinner
  const symbolModifier = isDraw
    ? 'draw'
    : displayedWinner.toLowerCase()

  // Interstitial Ad Trigger logic (Every 3 completed matches/rounds)
  function triggerActionWithAdCheck(actionFn) {
    if (typeof window === 'undefined') {
      actionFn()
      return
    }
    const currentCount = parseInt(window.sessionStorage.getItem('xo-arena-match-count') || '0', 10) + 1
    window.sessionStorage.setItem('xo-arena-match-count', currentCount.toString())

    // Show Interstitial Ad on every 3rd match
    if (currentCount % 3 === 0) {
      setPendingAction(() => actionFn)
      setShowAdOverlay(true)
      setAdCountdown(3)
    } else {
      actionFn()
    }
  }

  useEffect(() => {
    if (!showAdOverlay) return undefined
    const timer = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowAdOverlay(false)
          if (pendingAction) pendingAction()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showAdOverlay, pendingAction])

  async function handleShareScore() {
    registerUserGesture()
    playSound('click')
    const shareText = `🎮 XO ARENA ${heading}! ${resultLabel} (${scores.X} - ${scores.O}). Sen de meydan oku: ${window.location.href}`

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
      {!isDraw && <WinConfetti active={true} particleCount={80} duration={3000} />}

      {/* ── Interstitial Ad Simulation Overlay ── */}
      {showAdOverlay && (
        <div className="interstitial-ad-overlay">
          <div className="interstitial-ad-card">
            <span className="ad-badge">REKLAM (AdMob Entegrasyonu)</span>
            <h3>XO ARENA</h3>
            <p>Oyun sponsor reklamı...</p>
            <div className="ad-countdown">
              Reklam sonlanıyor: <strong>{adCountdown}s</strong>
            </div>
          </div>
        </div>
      )}

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

        <div className="round-result-score" aria-label={`Skor ${scores.X} - ${scores.O}`}>
          <div>
            <strong>{scores.X}</strong>
            <span>X {scoreLabel}</span>
          </div>

          <span aria-hidden="true">VS</span>

          <div>
            <strong>{scores.O}</strong>
            <span>O {scoreLabel}</span>
          </div>
        </div>

        <div className="round-result-message" id="round-result-message">
          {resultMessage && <strong>{resultMessage}</strong>}
          {loserMessage && <small>{loserMessage}</small>}
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
                onClick={() => triggerActionWithAdCheck(onNewMatch)}
                autoFocus
              >
                Yeni maç
              </button>
            ) : (
              <button
                type="button"
                onClick={() => triggerActionWithAdCheck(onNextRound)}
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
  )
}
