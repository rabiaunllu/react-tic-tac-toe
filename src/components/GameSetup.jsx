import { useState } from 'react'

const boardOptions = [
  { size: 3, label: '3x3', description: 'Klasik hızlı oyun', winLength: 3 },
  { size: 4, label: '4x4', description: 'Dengeli arena', winLength: 3 },
  { size: 5, label: '5x5', description: 'Stratejik büyük tahta', winLength: 4 },
]

const classicTargets = [3, 5, 7, 9]
const arenaTargets = [15, 30, 50, 100]

export default function GameSetup({ onStartGame }) {
  const [boardSize, setBoardSize] = useState(3)
  const [gameMode, setGameMode] = useState('classic')
  const [opponentType, setOpponentType] = useState('human')
  const [targetValue, setTargetValue] = useState(5)
  const [isInfinite, setIsInfinite] = useState(false)

  const selectedBoard = boardOptions.find((board) => board.size === boardSize)
  const targetOptions = gameMode === 'classic' ? classicTargets : arenaTargets
  const targetLabel = gameMode === 'classic' ? 'Tur Sayısı' : 'Hedef Puan'

  function handleModeChange(nextMode) {
    setGameMode(nextMode)
    setTargetValue(nextMode === 'classic' ? 5 : 30)
    setIsInfinite(false)
  }

  function handleStartGame() {
    onStartGame({
      boardSize,
      winLength: selectedBoard.winLength,
      gameMode,
      targetType: gameMode === 'classic' ? 'rounds' : 'points',
      targetValue: isInfinite ? null : targetValue,
      isInfinite,
      opponentType,
    })
  }

  return (
    <main className="app-shell">
      <section className="game-card setup-card">
        <header className="game-header brand-header setup-brand-header">
          
          <h1>XO ARENA</h1>
          <p>Tahtanı seç. Modu kur. Rövanşa hazır ol.</p>
        </header>
<div className="setup-control-group setup-opponent-group">
  <span className="setup-control-label">OYUNCU MODU</span>

  <div className="setup-segment-grid setup-segment-grid--two">
    <button
      type="button"
      className={`setup-segment ${opponentType === 'human' ? 'is-selected' : ''}`}
      onClick={() => setOpponentType('human')}
      aria-pressed={opponentType === 'human'}
    >
      <span>PvP</span>
    </button>

    <button
      type="button"
      className={`setup-segment ${opponentType === 'ai' ? 'is-selected' : ''}`}
      onClick={() => setOpponentType('ai')}
      aria-pressed={opponentType === 'ai'}
    >
      <span>PvC</span>
    </button>
  </div>
</div>
        <div className="setup-group">
          <span className="setup-label">Izgara Boyutu</span>
          <div className="setup-options">
            {boardOptions.map((board) => (
              <button
                key={board.size}
                className={boardSize === board.size ? 'setup-option active' : 'setup-option'}
                type="button"
                onClick={() => setBoardSize(board.size)}
              >
                {board.label}
              </button>
            ))}
          </div>
          
        </div>

        <div className="setup-group">
          <span className="setup-label">Oyun Türü</span>
          <div className="setup-options">
            <button
              className={gameMode === 'classic' ? 'setup-option active' : 'setup-option'}
              type="button"
              onClick={() => handleModeChange('classic')}
            >
              Klasik
            </button>
            <button
              className={gameMode === 'arena' ? 'setup-option active' : 'setup-option'}
              type="button"
              onClick={() => handleModeChange('arena')}
            >
              Arena
            </button>
          </div>
        </div>

        <div className="setup-group">
          <span className="setup-label">{targetLabel}</span>
          <div className="setup-options target-options">
            {targetOptions.map((target) => (
              <button
                key={target}
                className={!isInfinite && targetValue === target ? 'setup-option active' : 'setup-option'}
                type="button"
                onClick={() => {
                  setTargetValue(target)
                  setIsInfinite(false)
                }}
              >
                {gameMode === 'classic' ? `${target} Tur` : `${target} Pts`}
              </button>
            ))}
            <button
              className={isInfinite ? 'setup-option active infinite-option' : 'setup-option infinite-option'}
              type="button"
              onClick={() => setIsInfinite(true)}
            >
              ∞
            </button>
          </div>
        </div>

        <div className={`setup-summary ${gameMode}`}>
          {gameMode === 'classic'
            ? `Klasik mod: ${isInfinite ? 'Sonsuz oyun' : `${targetValue} tur hedefi`}. Izgara ${selectedBoard.label}, ${selectedBoard.winLength} taş yan yana kazandırır.`
            : `Arena mod: ${isInfinite ? 'Sonsuz puan' : `${targetValue} puan hedefi`}. Izgara ${selectedBoard.label}, ${selectedBoard.winLength} taş yan yana kazandırır.`}
        </div>

        <button className="start-game-button" onClick={handleStartGame}>
          Oyuna Başla
        </button>

      </section>
    </main>
  )
}
