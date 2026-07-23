import { powerDefinitions } from '../game/powers'

export default function PowerPanel({ currentPlayer, powerCounts, activePower, onSelectPower }) {
  const selectedPower = powerDefinitions.find((power) => power.id === activePower)

  return (
    <section className="power-panel" aria-label={`${currentPlayer} oyuncusu güçleri`}>
      <div className="power-panel-header">
        <span>{currentPlayer} güçleri</span>
        <small>
          {activePower ? 'Aktif güç seçildi. Hedef kareye tıkla.' : 'Güç seç, sonra hedef kareye tıkla.'}
        </small>
      </div>

      {selectedPower && (
        <div className="active-power-hint">
          {selectedPower.icon} {selectedPower.name} hazır: {selectedPower.description}
        </div>
      )}

      <div className="power-list">
        {powerDefinitions.map((power) => {
          const count = powerCounts[power.id]
          const isActive = activePower === power.id
          const isDisabled = count === 0

          return (
            <button
              key={power.id}
              className={`power-button ${isActive ? 'active' : ''}`}
              disabled={isDisabled}
              title={power.description}
              onClick={() => onSelectPower(isActive ? null : power.id)}
            >
              <span className="power-icon">{power.icon}</span>
              <span className="power-name">{power.name}</span>
              <span className="power-count">{count}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}