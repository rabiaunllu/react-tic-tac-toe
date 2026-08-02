import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function HowToPlay({ gameConfig, gameMode, arenaSettings, onClose }) {
  const lockedScrollYRef = useRef(null)
  const targetText = gameConfig.isInfinite
    ? 'Sonsuz mod aktif. Skor birikir, maç kazananı belirlenmez.'
    : gameMode === 'classic'
      ? `${gameConfig.targetValue} tur kazanan maçı kazanır.`
      : `${gameConfig.targetValue} puana ilk ulaşan maçı kazanır.`

  useEffect(() => {
    if (lockedScrollYRef.current === null) {
      lockedScrollYRef.current = window.scrollY
    }

    const scrollY = lockedScrollYRef.current
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousWidth = document.body.style.width
    const previousDocumentOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.width = previousWidth
      document.documentElement.style.overflow = previousDocumentOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.scrollTo(0, scrollY)
    }
  }, [onClose])

  return createPortal(
    <div className="how-to-play-modal" role="presentation" onClick={onClose}>
      <div
        className="how-to-play-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="how-to-play-header">
          <div>
            <span className="eyebrow">KURALLAR</span>
            <h2 id="how-to-play-title">Nasıl oynanır?</h2>
          </div>

          <button type="button" className="panel-close-button" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="how-to-play-content">
          <div className="rule-section">
            <h3>Temel amaç</h3>
            <p>
              Sırayla X ve O yerleştir. {gameConfig.boardSize}x{gameConfig.boardSize}
              tahtada {gameConfig.winLength} taşı yan yana getiren turu alır.
            </p>
          </div>

          <div className="rule-section">
            <h3>Maç hedefi</h3>
            <p>{targetText}</p>
          </div>

          <div className="rule-section">
            <h3>Klasik mod</h3>
            <p>Güç ve çarpan yok. Kazanan her tur için 1 puan alır.</p>
          </div>

          <div className="rule-section">
            <h3>Arena mod</h3>
            <p>Çarpanlı hücreler ve özel güçler oyuna ekstra risk katar.</p>

            {gameMode === 'arena' && (
              <ul>
                <li>Çarpanlar: {arenaSettings.multipliersEnabled ? 'Açık' : 'Kapalı'}</li>
                <li>Özel güçler: {arenaSettings.powersEnabled ? 'Açık' : 'Kapalı'}</li>
                <li>
                  Boost modu:{' '}
                  {arenaSettings.boostMode === 'random' ? 'Rastgele' : 'Seçimli'}
                </li>
              </ul>
            )}
          </div>

          <div className="rule-section">
            <h3>Özel güçler</h3>
            <ul>
              <li><strong>💣 Bomba:</strong> Dolu ve kalkansız bir taşı siler.</li>
              <li><strong>🛡️ Kalkan:</strong> Kendi taşını bombaya karşı korur.</li>
              <li><strong>🃏 Joker:</strong> Rakibin taşını kendi taşına çevirir.</li>
              <li><strong>⚡ Boost:</strong> Bir hücreyi ekstra puanlı yapar.</li>
            </ul>
          </div>

          <div className="rule-section">
            <h3>Online oyun</h3>
            <p>Oda koduyla farklı cihazlardan oynama sonraki geliştirme aşamasında.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
