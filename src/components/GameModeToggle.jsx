export default function GameModeToggle({ gameMode, onGameModeChange }) {
  return (
    <div className="mode-toggle" aria-label="Oyun modu seçimi">
      <button
        className={gameMode === 'classic' ? 'mode-button active' : 'mode-button'}
        onClick={() => onGameModeChange('classic')}
      >
        Klasik
      </button>

      <button
        className={gameMode === 'arena' ? 'mode-button active' : 'mode-button'}
        onClick={() => onGameModeChange('arena')}
      >
        Arena
      </button>
    </div>
  )
}