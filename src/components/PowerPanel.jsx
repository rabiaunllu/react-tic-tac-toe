import { getAvailablePowerDefinitions, getPowerDefinitions } from '../game/powers'

export default function PowerPanel({
  currentPlayer,
  playerName,
  score = 0,
  scoreLabel = 'Skor',
  isActivePlayer = true,
  canInteract = isActivePlayer,
  isPowersEnabled = true,
  powerCounts,
  activePower,
  boostMode,
  disabledPowers = {},
  onSelectPower,
  onUseRandomBoost,
  powerOptions,
  extraPowerIds = [],
  rewardedPack,
  statusText,
}) {
  const basePowers = getAvailablePowerDefinitions(powerOptions)
  const extraPowers = getPowerDefinitions(extraPowerIds)
  const availablePowers = [...basePowers, ...extraPowers]
  const selectedPower = availablePowers.find((power) => power.id === activePower)
  function handlePowerClick(powerId, isActive) {
    if (!canInteract || !isPowersEnabled) {
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
          <span className="player-name">{playerName ?? `Oyuncu ${currentPlayer}`}</span>
          {rewardedPack && (
            <button
              type="button"
              className={`reward-pack-button ${rewardedPack.claimed ? 'claimed' : ''}`}
              disabled={rewardedPack.disabled || rewardedPack.isRewarding}
              onClick={rewardedPack.onToggle}
              aria-expanded={rewardedPack.isPickerOpen}
              aria-label={rewardedPack.claimed ? 'Sürpriz paket alındı' : 'Sürpriz paketi aç'}
            >
              <span aria-hidden="true">{rewardedPack.claimed ? '✓' : '🎁'}</span>
            </button>
          )}
        </div>
        <div className="player-score">
          <small>{scoreLabel}</small>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="power-panel-header">
        {!isPowersEnabled && <span>Klasik mod</span>}
        <small>
          {statusText ?? (isPowersEnabled
            ? isActivePlayer
              ? activePower
                ? 'Aktif güç seçildi. Hedef kareye tıkla.'
                : 'Hamle sende. Güç seç veya taş koy.'
              : 'Rakibin hamlesi bekleniyor.'
            : isActivePlayer
              ? 'Hamle sende. En iyi çizgiyi kur.'
              : 'Sıranı bekle, tahtayı oku.')}
        </small>
      </div>

      {isPowersEnabled && canInteract && selectedPower && (
        <div className="active-power-hint">
          {selectedPower.icon} {selectedPower.name} hazır: {selectedPower.description}
        </div>
      )}

      {rewardedPack && (rewardedPack.isPickerOpen || rewardedPack.message) && (
        <div className="reward-pack-popover" aria-live="polite">
          {rewardedPack.message && <p>{rewardedPack.message}</p>}
          {rewardedPack.isPickerOpen && (
            <div className="rewarded-power-options" aria-label="Paket güç seçimi">
              <span></span>
              {rewardedPack.powerIds.map((powerId) => (
                <button key={powerId} type="button" onClick={() => rewardedPack.onClaim(powerId)}>
                  {powerId === 'joker' ? '🃏 Joker' : powerId === 'freeze' ? '❄️ Freeze' : '🧛 Vampir'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isPowersEnabled && (
        <div className="power-list">
          {basePowers.map((power) => {
            const count = powerCounts[power.id]
            const isActive = canInteract && activePower === power.id
            const isDisabled = !canInteract || count === 0 || disabledPowers[power.id]

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${power.name}: ${power.description}`}
                data-hint={disabledPowers[power.id] ? 'Hedef yok' : power.description}
                title={
                  count === 0
                    ? 'Bu güç bitti.'
                    : disabledPowers[power.id]
                      ? 'Bu hedef için uygun kare yok.'
                      : power.description
                }
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

      {isPowersEnabled && extraPowers.length > 0 && (
        <div className="power-list rewarded-power-list">
          {extraPowers.map((power) => {
            const count = powerCounts[power.id]
            const isActive = canInteract && activePower === power.id
            const isDisabled = !canInteract || count === 0 || disabledPowers[power.id]

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${power.name}: ${power.description}`}
                data-hint={disabledPowers[power.id] ? 'Hedef yok' : power.description}
                title={count === 0 ? 'Bu güç bitti.' : power.description}
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
