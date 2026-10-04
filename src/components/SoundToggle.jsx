import { useState } from 'react'
import { playSound, registerUserGesture, useSoundEnabled } from '../game/soundManager'
import { useTranslation } from '../i18n'

export default function SoundToggle({ children }) {
  const { t, language, setLanguage } = useTranslation()
  const isTr = language === 'tr'
  const { enabled, isSdkMuted, toggleSound } = useSoundEnabled()
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
        <svg className="game-action-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
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

            <div className="settings-popover-section settings-sound-section">
              <button
                type="button"
                className={`settings-sound-btn ${enabled ? 'is-on' : 'is-off'}`}
                onClick={toggleSound}
                aria-pressed={enabled}
                disabled={isSdkMuted}
                title={isSdkMuted ? (isTr ? 'Platform tarafından susturuldu' : 'Muted by platform') : (enabled ? (isTr ? 'Sesi Kapat' : 'Mute') : (isTr ? 'Sesi Aç' : 'Unmute'))}
                aria-label={isSdkMuted ? (isTr ? 'Platform Susturdu' : 'Platform Muted') : (enabled ? (isTr ? 'Sesi Kapat' : 'Mute') : (isTr ? 'Sesi Aç' : 'Unmute'))}
              >
                <span className="sound-emoji-icon" aria-hidden="true">{enabled ? '🔊' : '🔇'}</span>
              </button>
            </div>

            <div className="settings-popover-section settings-lang-section">
              <span className="settings-section-label">
                <span className="settings-lang-globe" aria-hidden="true">🌐</span>
                <span>{isTr ? 'Dil' : 'Language'}</span>
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
          </div>
        </>
      )}
    </div>
  )
}
