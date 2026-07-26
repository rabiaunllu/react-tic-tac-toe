import { powerDefinitions } from '../game/powers'

export default function PowerPanel({
  currentPlayer,
  score = 0,
  scoreLabel = 'Skor',
  isActivePlayer = true,
  isPowersEnabled = true,
  powerCounts,
  activePower,
  boostMode,
  disabledPowers = {},
  onSelectPower,
  onUseRandomBoost,
}) {
  const selectedPower = powerDefinitions.find((power) => power.id === activePower)

  function handlePowerClick(powerId, isActive) {
    if (!isActivePlayer || !isPowersEnabled) {
      return
    }

    if (powerId === 'boost' && boostMode === 'random') {
      onUseRandomBoost()
      return
    }

    onSelectPower(isActive ? null : powerId)
  }

  return (
    <section
      className={`power-panel player-panel player-${currentPlayer.toLowerCase()} ${
        isActivePlayer ? 'active-player' : 'inactive-player'
      }`}
      aria-label={`${currentPlayer} oyuncusu paneli`}
    >
      <div className="player-panel-topline">
        <div className="player-identity">
          <span className="player-symbol">{currentPlayer}</span>
          <span className="player-name">Oyuncu {currentPlayer}</span>
        </div>
        <div className="player-score">
          <small>{scoreLabel}</small>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="power-panel-header">
        <span>{isPowersEnabled ? 'Güç seti' : 'Klasik mod'}</span>
        <small>
          {isPowersEnabled
            ? isActivePlayer
              ? activePower
                ? 'Aktif güç seçildi. Hedef kareye tıkla.'
                : 'Hamle sende. Güç seç veya taş koy.'
              : 'Rakibin hamlesi bekleniyor.'
            : isActivePlayer
              ? 'Hamle sende. En iyi çizgiyi kur.'
              : 'Sıranı bekle, tahtayı oku.'}
        </small>
      </div>

      {isPowersEnabled && isActivePlayer && selectedPower && (
        <div className="active-power-hint">
          {selectedPower.icon} {selectedPower.name} hazır: {selectedPower.description}
        </div>
      )}

      {isPowersEnabled && (
        <div className="power-list">
          {powerDefinitions.map((power) => {
            const count = powerCounts[power.id]
            const isActive = isActivePlayer && activePower === power.id
            const isDisabled = !isActivePlayer || count === 0 || disabledPowers[power.id]

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${power.name}: ${power.description}`}
                data-hint={disabledPowers[power.id] ? 'Hedef yok' : power.description}
                onClick={() => handlePowerClick(power.id, isActive)}
              >
                <span className="power-icon">{power.icon}</span>
                <span className="power-name">{power.name}</span>
                <span className="power-count">{count}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
