import { useState } from 'react'
import { playSound, registerUserGesture, useSoundEnabled } from '../game/soundManager'

export default function SoundToggle() {
  const { enabled, toggleSound } = useSoundEnabled()
  const [isOpen, setIsOpen] = useState(false)

  function handleSettingsClick() {
    registerUserGesture()
    playSound('click')
    setIsOpen((currentIsOpen) => !currentIsOpen)
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
        <div className="settings-popover">
          <button
            type="button"
            className={`sound-toggle ${enabled ? 'is-on' : 'is-off'}`}
            onClick={toggleSound}
            aria-pressed={enabled}
          >
            <span aria-hidden="true">{enabled ? '♪' : '×'}</span>
            <strong>{enabled ? 'Ses açık' : 'Ses kapalı'}</strong>
          </button>
        </div>
      )}
    </div>
  )
}
