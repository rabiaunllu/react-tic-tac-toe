export default function ArenaSettings({ settings, onSettingsChange }) {
  function handleToggle(settingName) {
    onSettingsChange({
      ...settings,
      [settingName]: !settings[settingName],
    })
  }

  return (
    <section className="arena-settings" aria-label="Arena ayarları">
      <div>
        <h2>Arena Ayarları</h2>
        <p>Oyunu ne kadar kaotik istediğini buradan seç.</p>
      </div>

      <div className="arena-setting-list">
        <label className="arena-setting">
          <span>
            <strong>Özel güçler</strong>
            <small>Bomba, kalkan, joker ve çarpan gücü.</small>
          </span>

          <input
            type="checkbox"
            checked={settings.powersEnabled}
            onChange={() => handleToggle('powersEnabled')}
          />
        </label>

        <label className="arena-setting">
          <span>
            <strong>Çarpanlı hücreler</strong>
            <small>2x ve 3x kareler puanı etkiler.</small>
          </span>

          <input
            type="checkbox"
            checked={settings.multipliersEnabled}
            onChange={() => handleToggle('multipliersEnabled')}
          />
        </label>
      </div>
    </section>
  )
}