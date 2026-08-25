import { getAvailablePowerDefinitions, getPowerDefinitions } from '../game/powers'
import { playSound, registerUserGesture } from '../game/soundManager'
import CrystalSnowflake from './CrystalSnowflake'
import EnergyShieldIcon from './EnergyShieldIcon'

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
  hasUsedPowerThisTurn = false,
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

  function renderPowerIcon(power) {
    if (power.id === 'freeze') {
      return <CrystalSnowflake className="power-crystal-icon" />
    }
    if (power.id === 'shield') {
      return <EnergyShieldIcon className="power-shield-icon" size={19} />
    }
    return power.icon
  }

  function handlePowerClick(powerId, isActive) {
    registerUserGesture()
    if (!canInteract || !isPowersEnabled || hasUsedPowerThisTurn) {
      return
    }

    playSound(isActive ? 'click' : 'power')

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
              ? hasUsedPowerThisTurn
                ? '🔒 Güç kullanıldı! Şimdi tahtaya normal taşını koy.'
                : activePower
                  ? 'Aktif güç seçildi. Hedef kareye tıkla.'
                  : 'Hamle sende. Güç seç veya taş koy.'
              : 'Rakibin hamlesi bekleniyor.'
            : isActivePlayer
              ? 'Hamle sende. En iyi çizgiyi kur.'
              : 'Sıranı bekle, tahtayı oku.')}
        </small>
      </div>

      {isPowersEnabled && canInteract && !hasUsedPowerThisTurn && selectedPower && (
        <div className="active-power-hint">
          {renderPowerIcon(selectedPower)} <strong>{selectedPower.name}</strong> — {selectedPower.description}
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
                  {powerId === 'freeze' ? <span className="reward-freeze-opt"><CrystalSnowflake className="reward-crystal-icon" /> Dondur</span> : '🧛 Vampir'}
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
            const isDisabled = !canInteract || count === 0 || hasUsedPowerThisTurn

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${power.name}: ${power.description}`}
                data-hint={hasUsedPowerThisTurn ? 'Bu tur güç kilitli' : power.description}
                title={
                  count === 0
                    ? 'Bu güç bitti.'
                    : hasUsedPowerThisTurn
                      ? 'Bu turda zaten bir güç kullandın. Lütfen taşını koy.'
                      : power.description
                }
                onClick={() => handlePowerClick(power.id, isActive)}
              >
                <span className="power-icon">{renderPowerIcon(power)}</span>
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
            const isDisabled = !canInteract || count === 0 || hasUsedPowerThisTurn

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${power.name}: ${power.description}`}
                data-hint={hasUsedPowerThisTurn ? 'Bu tur güç kilitli' : power.description}
                title={
                  count === 0
                    ? 'Bu güç bitti.'
                    : hasUsedPowerThisTurn
                      ? 'Bu turda zaten bir güç kullandın. Lütfen taşını koy.'
                      : power.description
                }
                onClick={() => handlePowerClick(power.id, isActive)}
              >
                <span className="power-icon">{renderPowerIcon(power)}</span>
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
