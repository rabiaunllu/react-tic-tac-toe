import { useState } from 'react'
import { playSound, registerUserGesture, useSoundEnabled } from '../game/soundManager'
import { useTranslation } from '../i18n'

export default function SoundToggle({ children }) {
  const { t, language, setLanguage } = useTranslation()
  const isTr = language === 'tr'
  const { enabled, toggleSound } = useSoundEnabled()
  const [isOpen, setIsOpen] = useState(false)

  function handleSettingsClick() {
    registerUserGesture()
    playSound('click')
    setIsOpen((currentIsOpen) => !currentIsOpen)
  }

  function handleClose() {
    registerUserGesture()
    playSound('click')
    setIsOpen(false)
  }

  function handleLanguageChange(lang) {
    if (lang === language) return
    registerUserGesture()
    playSound('click')
    setLanguage(lang)
  }

  return (
    <div className="app-settings">
      <button
        type="button"
        className="settings-icon-button"
        onClick={handleSettingsClick}
        aria-label={isTr ? 'Ayarlar' : 'Settings'}
        aria-expanded={isOpen}
        title={isTr ? 'Ayarlar' : 'Settings'}
      >
        <span aria-hidden="true">⚙</span>
      </button>

      {isOpen && (
        <>
          <div
            className="settings-backdrop"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className={`settings-popover ${children ? 'settings-popover--expanded' : ''}`}>
            <div className="settings-popover-header">
              <span className="settings-popover-title">⚙ {isTr ? 'Ayarlar' : 'Settings'}</span>
              <button
                type="button"
                className="settings-popover-close-btn"
                onClick={handleClose}
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className="settings-popover-section">
              <button
                type="button"
                className={`sound-toggle ${enabled ? 'is-on' : 'is-off'}`}
                onClick={toggleSound}
                aria-pressed={enabled}
              >
                <span aria-hidden="true">{enabled ? '♪' : '×'}</span>
                <strong>{enabled ? (isTr ? 'Ses açık' : 'Sound ON') : (isTr ? 'Ses kapalı' : 'Sound OFF')}</strong>
              </button>
            </div>

            <div className="settings-popover-section settings-lang-section">
              <span className="settings-section-label">
                <span className="settings-lang-globe" aria-hidden="true">🌐</span>
                <span>{isTr ? 'Dil Seçimi' : 'Language'}</span>
              </span>
              <div className="settings-lang-pills" role="group" aria-label={isTr ? 'Dil seçimi' : 'Language selection'}>
                <button
                  type="button"
                  className={`settings-lang-pill ${isTr ? 'is-active' : ''}`}
                  onClick={() => handleLanguageChange('tr')}
                  aria-pressed={isTr}
                >
                  Türkçe
                </button>
                <button
                  type="button"
                  className={`settings-lang-pill ${!isTr ? 'is-active' : ''}`}
                  onClick={() => handleLanguageChange('en')}
                  aria-pressed={!isTr}
                >
                  English
                </button>
              </div>
            </div>

            {children}

            <button
              type="button"
              className="settings-popover-done-btn"
              onClick={handleClose}
            >
              {isTr ? 'Tamam' : 'Done'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
