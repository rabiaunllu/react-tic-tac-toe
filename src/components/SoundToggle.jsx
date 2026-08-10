import { useState } from 'react'
import { playSound, registerUserGesture, useSoundEnabled } from '../game/soundManager'

export default function SoundToggle({ children }) {
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

  return (
    <div className="app-settings">
      <button
        type="button"
        className="settings-icon-button"
        onClick={handleSettingsClick}
        aria-label="Ayarlar"
        aria-expanded={isOpen}
        title="Ayarlar"
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
              <span className="settings-popover-title">⚙ Ayarlar</span>
              <button
                type="button"
                className="settings-popover-close-btn"
                onClick={handleClose}
                aria-label="Kapat"
                title="Kapat"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              className={`sound-toggle ${enabled ? 'is-on' : 'is-off'}`}
              onClick={toggleSound}
              aria-pressed={enabled}
            >
              <span aria-hidden="true">{enabled ? '♪' : '×'}</span>
              <strong>{enabled ? 'Ses açık' : 'Ses kapalı'}</strong>
            </button>
            {children}
            <button
              type="button"
              className="settings-popover-done-btn"
              onClick={handleClose}
            >
              Tamam
            </button>
          </div>
        </>
      )}
    </div>
  )
}
