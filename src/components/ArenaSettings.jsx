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
            {settings.multipliersEnabled && (
        <div className="score-info-box">
          <strong>Puanlama nasıl çalışır?</strong>
          <p>
            Arena modunda çarpanlı hücreler açıksa kazanan çizgideki hücrelerin
            puanları toplanır. Normal hücre 1 puan, 2x hücre 2 puan, 3x hücre
            3 puan değerindedir.
          </p>
          <p className="score-example">
            Örnek: 3x + 2x + normal hücre = 6 puan.
          </p>
        </div>
      )}
    </section>
  )
}