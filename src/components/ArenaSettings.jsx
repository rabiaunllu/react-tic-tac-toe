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
  const { t } = useTranslation()

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
        <label className="arena-setting">
          <span className="arena-setting-name">{t('arenaSettings.powersTitle')}</span>
          <input
            type="checkbox"
            checked={settings.powersEnabled}
            onChange={() => handleToggle('powersEnabled')}
          />
        </label>

        <label className="arena-setting">
          <span className="arena-setting-name">{t('arenaSettings.multipliersTitle')}</span>
          <input
            type="checkbox"
            checked={settings.multipliersEnabled}
            onChange={() => handleToggle('multipliersEnabled')}
          />
        </label>

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
