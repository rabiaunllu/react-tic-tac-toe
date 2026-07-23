export default function ArenaSettings({
  settings,
  pendingSettings,
  onSettingsChange,
  onConfirmSettingsChange,
  onCancelSettingsChange,
}) {
  function handleToggle(settingName) {
    onSettingsChange({
      ...settings,
      [settingName]: !settings[settingName],
    })
  }

  function handleBoostModeChange(boostMode) {
    onSettingsChange({
      ...settings,
      boostMode,
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
            <small>Bomba, kalkan, joker ve boost gücü.</small>
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

         {settings.powersEnabled && (
          <div className="arena-setting boost-mode-setting">
            <span>
              <strong>Boost modu</strong>
              <small>Boost hedefi rastgele seçilsin veya oyuncu belirlesin.</small>
            </span>

            <div className="boost-mode-options" aria-label="Boost modu">
              <button
                className={settings.boostMode === 'random' ? 'active' : ''}
                type="button"
                onClick={() => handleBoostModeChange('random')}
              >
                Rastgele
              </button>
              <button
                className={settings.boostMode === 'manual' ? 'active' : ''}
                type="button"
                onClick={() => handleBoostModeChange('manual')}
              >
                Seçimli
              </button>
            </div>
          </div>
        )}
        
        {pendingSettings && (
          <div className="settings-confirm-panel">
            <p>Bu değişiklik mevcut oyunu sıfırlayacak. Devam edilsin mi?</p>
            <div className="settings-confirm-actions">
              <button type="button" onClick={onCancelSettingsChange}>
                Vazgeç
              </button>
              <button
                className="confirm-reset-button"
                type="button"
                onClick={onConfirmSettingsChange}
              >
                Sıfırla ve uygula
              </button>
            </div>
          </div>
        )}
      </div>

      {settings.multipliersEnabled && (
        <div className="score-info-box">
          <strong>Puanlama nasıl çalışır?</strong>
          <p>
            Arena modunda çarpanlı hücreler açıksa kazanan çizgideki hücrelerin
            puanları toplanır. Normal hücre 1 puan, 2x hücre 2 puan, 3x hücre
            3 puan değerindedir. Boostlu hücre kendi puanını 2 katına çıkarır.
          </p>
          <p className="score-example">
            Örnek: boostlu 3x + 2x + normal hücre = 9 puan.
          </p>
        </div>
      )}
    </section>
  )
}
