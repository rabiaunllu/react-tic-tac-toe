import { memo } from 'react'
import { getAvailablePowerDefinitions, getPowerDefinitions } from '../game/powers'
import { playSound, registerUserGesture } from '../game/soundManager'
import { useTranslation } from '../i18n'
import CrystalSnowflake from './CrystalSnowflake'
import EnergyShieldIcon from './EnergyShieldIcon'

function getShortPowerSummary(powerId, isTr) {
  switch (powerId) {
    case 'bomb':
      return isTr ? 'Karedeki taşı patlatır' : 'Destroys mark'
    case 'shield':
      return isTr ? 'Taşını korur' : 'Protects mark'
    case 'freeze':
      return isTr ? 'Kareyi 1 tur dondurur' : 'Freezes cell'
    case 'trap':
      return isTr ? 'Gizli tuzak kurar' : 'Sets trap'
    case 'vampire':
      return isTr ? 'Çarpanı çeker' : 'Steals multiplier'
    case 'boost':
      return isTr ? 'Boş kareye 2x puan ekler' : '+2x cell value'
    default:
      return ''
  }
}

const PowerPanel = memo(function PowerPanel({
  currentPlayer,
  playerName,
  score = 0,
  scoreLabel,
  showScore = true,
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
  timeLimit = 0,
  timeLeft = 0,
  isWarning = false,
}) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const displayScoreLabel = scoreLabel ?? t('common.score')
  const basePowers = getAvailablePowerDefinitions(powerOptions)
  const extraPowers = getPowerDefinitions(extraPowerIds)
  const availablePowers = [...basePowers, ...extraPowers.filter((power) => (
    !basePowers.some((basePower) => basePower.id === power.id)
  ))]

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
      aria-label={`${currentPlayer} ${isTr ? 'oyuncusu paneli' : 'player panel'}`}
    >
      <div className="player-panel-topline">
        <div className="player-identity">
          <span className="player-symbol">{currentPlayer}</span>
          <span className="player-name">{playerName ?? (isTr ? `Oyuncu ${currentPlayer}` : `Player ${currentPlayer}`)}</span>
          {timeLimit > 0 && (
            <div className={`panel-timer-badge ${isActivePlayer ? 'active' : 'idle'} ${isActivePlayer && isWarning ? 'warning' : ''}`}>
              <span className="panel-timer-digits">
                {isActivePlayer ? `${Math.ceil(Math.max(0, timeLeft))}s` : `${timeLimit}s`}
              </span>
            </div>
          )}
          {rewardedPack && (
            <button
              type="button"
              className={`reward-pack-button ${rewardedPack.claimed ? 'claimed' : ''}`}
              disabled={rewardedPack.disabled || rewardedPack.isRewarding}
              onClick={rewardedPack.onToggle}
              aria-expanded={rewardedPack.isPickerOpen}
              aria-label={rewardedPack.claimed ? t('game.rewardGiftClaimed') : t('game.rewardGiftOpen')}
            >
              <span aria-hidden="true">{rewardedPack.claimed ? '✓' : '🎁'}</span>
            </button>
          )}
        </div>
        {showScore && (
          <div className="player-score">
            <small>{displayScoreLabel}</small>
            <strong>{score}</strong>
          </div>
        )}
      </div>

      {timeLimit > 0 && (
        <div className="panel-timer-track">
          <div
            className={`panel-timer-fill ${isActivePlayer ? 'active' : 'idle'} ${isActivePlayer && isWarning ? 'warning' : ''}`}
            style={{
              width: isActivePlayer ? `${Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100))}%` : '100%',
            }}
          />
        </div>
      )}

      {statusText && (
        <div className="power-panel-status">
          <small>{statusText}</small>
        </div>
      )}

      {rewardedPack && (rewardedPack.isPickerOpen || rewardedPack.message) && (
        <div className="reward-pack-popover" aria-live="polite">
          {rewardedPack.message && <p>{rewardedPack.message}</p>}
          {rewardedPack.isPickerOpen && (
            <div className="rewarded-power-options" aria-label={isTr ? 'Paket güç seçimi' : 'Reward power choice'}>
              <span></span>
              {rewardedPack.powerIds.map((powerId) => (
                <button key={powerId} type="button" onClick={() => rewardedPack.onClaim(powerId)}>
                  {powerId === 'freeze' ? <span className="reward-freeze-opt"><CrystalSnowflake className="reward-crystal-icon" /> {t('powers.freeze.name')}</span> : `🧛 ${t('powers.vampire.name')}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isPowersEnabled && (
        <div className={`power-list ${isActivePlayer && activePower ? 'has-active-power' : ''}`}>
          {availablePowers.map((power) => {
            const count = powerCounts[power.id]
            const isActive = canInteract && activePower === power.id
            const isDisabled = !canInteract || count === 0 || hasUsedPowerThisTurn
            const powerName = t(`powers.${power.id}.name`) || power.name
            const shortHint = getShortPowerSummary(power.id, isTr)

            return (
              <button
                key={power.id}
                className={`power-button ${isActive ? 'active' : ''}`}
                disabled={isDisabled}
                aria-label={`${powerName} (${count}): ${shortHint}`}
                title={`${powerName} (${count}): ${shortHint}`}
                onClick={() => handlePowerClick(power.id, isActive)}
              >
                <span className="power-icon">{renderPowerIcon(power)}</span>
                <span className="power-name">{powerName}</span>
                {count > 1 ? (
                  <span className="power-count" aria-hidden="true">x{count}</span>
                ) : count === 0 ? (
                  <span className="power-depleted-dot" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
})

export default PowerPanel
