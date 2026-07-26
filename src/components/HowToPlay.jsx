export default function HowToPlay({ gameConfig, gameMode, arenaSettings, onClose }) {
  const targetText = gameConfig.isInfinite
    ? 'Sonsuz mod aktif. Skor birikir ama maç kazananı belirlenmez.'
    : gameMode === 'classic'
      ? `${gameConfig.targetValue} round kazanan maçı kazanır.`
      : `${gameConfig.targetValue} puana ilk ulaşan maçı kazanır.`

  return (
    <div className="how-to-play-panel">
      <div className="how-to-play-header">
        <div>
          <span className="eyebrow">KURALLAR</span>
          <h2>Nasıl oynanır?</h2>
        </div>

        <button type="button" className="panel-close-button" onClick={onClose}>
          Kapat
        </button>
      </div>

      <div className="rule-section">
        <h3>Temel Amaç</h3>
        <p>
          Oyuncular sırayla X ve O yerleştirir. {gameConfig.boardSize}x{gameConfig.boardSize}
          tahtada kazanmak için {gameConfig.winLength} taşı yan yana getirmen gerekir.
        </p>
      </div>

      <div className="rule-section">
        <h3>Maç Hedefi</h3>
        <p>{targetText}</p>
      </div>

      <div className="rule-section">
        <h3>Klasik Mod</h3>
        <p>
          Klasik modda özel güçler ve çarpanlar yoktur. Kazanan her round için 1 puan alır.
        </p>
      </div>

      <div className="rule-section">
        <h3>Arena Mod</h3>
        <p>
          Arena modda çarpanlı hücreler ve özel güçler oyunu daha stratejik hale getirir.
        </p>

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
        <h3>Özel Güçler</h3>
        <ul>
          <li><strong>Bomba:</strong> Dolu ve kalkansız bir taşı siler.</li>
          <li><strong>Kalkan:</strong> Kendi taşını bombaya karşı korur.</li>
          <li><strong>Joker:</strong> Rakibin taşını kendi taşına çevirir</li>
          <li><strong>Boost:</strong> Bir hücreyi ekstra puanlı hale getirir.</li>
        </ul>
      </div>

      <div className="rule-section">
        <h3>Online Oyun</h3>
        <p>
          Oda koduyla farklı cihazlardan oynama özelliği sonraki geliştirme aşamasında eklenecek.
        </p>
      </div>
    </div>
  )
}