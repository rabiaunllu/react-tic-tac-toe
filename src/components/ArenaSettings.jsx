import { useTranslation } from '../i18n'

export function BoostModeSetting({ boostMode, onChange, explained = false }) {
  const { language } = useTranslation()
  const isTr = language === 'tr'

  return (
    <div className={`arena-setting boost-mode-setting ${explained ? 'boost-mode-setting--explained' : ''}`}>
      <div className="boost-mode-heading">
        {explained && <span className="boost-mode-icon" aria-hidden="true">⚡</span>}
        <span>
          <strong>{explained ? (isTr ? 'Boost nasıl yerleşsin?' : 'How should Boost spawn?') : (isTr ? 'Boost modu' : 'Boost mode')}</strong>
          <small>
            {explained
              ? (isTr ? 'Boost, seçilen boş karenin puanını kazanan çizgide 2 katına çıkarır. Kullanmak sıranı geçirmez.' : 'Boost doubles the value of an empty cell in the winning line. Keep your turn.')
              : (isTr ? 'Boost hedefi rastgele seçilsin veya oyuncu belirlesin.' : 'Randomly selected or chosen by player.')}
          </small>
        </span>
      </div>

      <div className="boost-mode-options" aria-label={isTr ? 'Boost modu' : 'Boost mode'}>
        <button
          className={boostMode === 'random' ? 'active' : ''}
          type="button"
          onClick={() => onChange('random')}
        >
          <strong>{isTr ? 'Rastgele' : 'Random'}</strong>
          {explained && <small>{isTr ? 'Sistem boş bir kareyi gizlice seçer.' : 'System secretly picks an empty cell.'}</small>}
        </button>
        <button
          className={boostMode === 'manual' ? 'active' : ''}
          type="button"
          onClick={() => onChange('manual')}
        >
          <strong>{isTr ? 'Seçimli' : 'Manual'}</strong>
          {explained && <small>{isTr ? 'Boost karesini oyun sırasında sen seçersin.' : 'You pick the boost cell during play.'}</small>}
        </button>
      </div>
    </div>
  )
}

export default function ArenaSettings({
  settings,
  pendingSettings,
  onSettingsChange,
  onConfirmSettingsChange,
  onCancelSettingsChange,
}) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'

  function handleToggle(settingName) {
    onSettingsChange({
      ...settings,
      [settingName]: !settings[settingName],
    })
  }

  return (
    <section className="arena-settings" aria-label={t('arenaSettings.title')}>
      <div className="arena-settings-header">
        <span className="settings-section-label">⚡ {t('arenaSettings.title')}</span>
      </div>

      <div className="arena-setting-list">
        <div className="arena-setting-card">
          <div className="arena-setting-info">
            <span className="arena-setting-icon" aria-hidden="true">💣</span>
            <div className="arena-setting-texts">
              <strong>{t('arenaSettings.powersTitle')}</strong>
              <small>{isTr ? 'Bomba, kalkan, dondurma ve vampir güçleri' : 'Bomb, shield, freeze, and vampire powers'}</small>
            </div>
          </div>
          <button
            type="button"
            className={`cyber-toggle-switch ${settings.powersEnabled ? 'is-active' : ''}`}
            onClick={() => handleToggle('powersEnabled')}
            aria-pressed={settings.powersEnabled}
            aria-label={t('arenaSettings.powersTitle')}
          >
            <span className="cyber-toggle-track">
              <span className="cyber-toggle-thumb" />
            </span>
            <span className="cyber-toggle-label">
              {settings.powersEnabled ? (isTr ? 'AÇIK' : 'ON') : (isTr ? 'KAPALI' : 'OFF')}
            </span>
          </button>
        </div>

        <div className="arena-setting-card">
          <div className="arena-setting-info">
            <span className="arena-setting-icon" aria-hidden="true">✖️</span>
            <div className="arena-setting-texts">
              <strong>{t('arenaSettings.multipliersTitle')}</strong>
              <small>{isTr ? '2x ve 3x çarpan bonuslu kareler' : '2x and 3x score multiplier cells'}</small>
            </div>
          </div>
          <button
            type="button"
            className={`cyber-toggle-switch ${settings.multipliersEnabled ? 'is-active' : ''}`}
            onClick={() => handleToggle('multipliersEnabled')}
            aria-pressed={settings.multipliersEnabled}
            aria-label={t('arenaSettings.multipliersTitle')}
          >
            <span className="cyber-toggle-track">
              <span className="cyber-toggle-thumb" />
            </span>
            <span className="cyber-toggle-label">
              {settings.multipliersEnabled ? (isTr ? 'AÇIK' : 'ON') : (isTr ? 'KAPALI' : 'OFF')}
            </span>
          </button>
        </div>

        {pendingSettings && (
          <div className="settings-confirm-panel">
            <p>{t('arenaSettings.resetConfirm')}</p>
            <div className="settings-confirm-actions">
              <button type="button" onClick={onCancelSettingsChange}>
                {t('arenaSettings.resetCancel')}
              </button>
              <button
                className="confirm-reset-button"
                type="button"
                onClick={onConfirmSettingsChange}
              >
                {t('arenaSettings.resetApply')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
