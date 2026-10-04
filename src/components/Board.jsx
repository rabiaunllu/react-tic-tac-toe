import { memo, useCallback, useRef } from 'react'
import Square from './Square'

const Board = memo(function Board({
  boardSize,
  squares,
  multipliers,
  winningLine,
  shieldedSquares,
  lockedSquares,
  frozenSquares = [],
  visibleBoostedSquares,
  traps = [],
  currentPlayer,
  topPlayerSymbol = 'X',
  bottomPlayerSymbol = 'O',
  visibleTrapOwner = currentPlayer,
  blackHoleEventIndex,
  bombEventIndex,
  vampireTransferEvent = null,
  powerTargetIndexes = null,
  powerTargetLabel,
  onSquareClick,
  shakeClass = '',
  lastPlacedIndex = null,
  activePower = null,
  isAiThinking = false,
}) {
  const onSquareClickRef = useRef(onSquareClick)
  onSquareClickRef.current = onSquareClick

  const handleStableSquareClick = useCallback((index) => {
    onSquareClickRef.current?.(index)
  }, [])

  const supportedBoardSizes = [3, 4, 5]
  const safeBoardSize = supportedBoardSizes.includes(boardSize) ? boardSize : 3

  const isTopActive = Boolean(currentPlayer && currentPlayer === topPlayerSymbol)
  const isBottomActive = Boolean(currentPlayer && currentPlayer === bottomPlayerSymbol)
  const topColorClass = topPlayerSymbol === 'O' ? 'turn-bridge--o' : 'turn-bridge--x'
  const bottomColorClass = bottomPlayerSymbol === 'X' ? 'turn-bridge--x' : 'turn-bridge--o'

  const isVampireActive = Boolean(
    vampireTransferEvent &&
      vampireTransferEvent.sourceIndex !== undefined &&
      vampireTransferEvent.targetIndex !== undefined
  )

  let beamCoords = null
  if (isVampireActive) {
    const srcRow = Math.floor(vampireTransferEvent.sourceIndex / safeBoardSize)
    const srcCol = vampireTransferEvent.sourceIndex % safeBoardSize
    const tgtRow = Math.floor(vampireTransferEvent.targetIndex / safeBoardSize)
    const tgtCol = vampireTransferEvent.targetIndex % safeBoardSize

    beamCoords = {
      x1: ((srcCol + 0.5) / safeBoardSize) * 100,
      y1: ((srcRow + 0.5) / safeBoardSize) * 100,
      x2: ((tgtCol + 0.5) / safeBoardSize) * 100,
      y2: ((tgtRow + 0.5) / safeBoardSize) * 100,
    }
  }

  // Power-based target outline color for micro-interaction D2
  const powerColorMap = {
    bomb: 'var(--power-bomb-color, #ef4444)',
    shield: 'var(--power-shield-color, #60a5fa)',
    trap: 'var(--power-trap-color, #a855f7)',
    freeze: 'var(--power-freeze-color, #22d3ee)',
    vampire: 'var(--power-vampire-color, #c084fc)',
    boost: 'var(--power-boost-color, #fbbf24)',
  }
  const activePowerColor = activePower ? powerColorMap[activePower] : null

  return (
    <div
      className={`board board-size-${safeBoardSize}${shakeClass ? ` ${shakeClass}` : ''}${
        isAiThinking ? ' board-ai-thinking' : ''
      }${activePower ? ` board-targeting-${activePower}` : ''}`}
      style={activePowerColor ? { '--current-power-color': activePowerColor } : undefined}
    >
      {/* D3: Dynamic Turn Bridge — Sırası gelen oyuncunun panel yönünde ve sembol renginde parlar */}
      <div
        className={`turn-bridge turn-bridge--top ${topColorClass} ${isTopActive ? 'active' : ''}`}
        aria-hidden="true"
      />
      <div
        className={`turn-bridge turn-bridge--bottom ${bottomColorClass} ${isBottomActive ? 'active' : ''}`}
        aria-hidden="true"
      />
      {squares.map((square, index) => {
        const visibleTrap = traps.find(
          (trap) => trap.index === index && trap.owner === visibleTrapOwner
        )
        const isBlackHoleTriggered = blackHoleEventIndex === index
        const isBombExploding = bombEventIndex === index
        const isPowerTargeting = Array.isArray(powerTargetIndexes)
        const isPowerTarget = isPowerTargeting && powerTargetIndexes.includes(index)
        const isVampireSource = isVampireActive && vampireTransferEvent.sourceIndex === index
        const isVampireTarget = isVampireActive && vampireTransferEvent.targetIndex === index

        return (
          <Square
            key={index}
            index={index}
            boardSize={safeBoardSize}
            value={square}
            multiplier={multipliers[index]}
            isWinningSquare={winningLine?.includes(index)}
            isShielded={shieldedSquares.includes(index)}
            isLocked={lockedSquares.includes(index)}
            isFrozen={frozenSquares.includes(index)}
            isBoosted={visibleBoostedSquares.includes(index)}
            isTrapped={Boolean(visibleTrap)}
            isBlackHoleTriggered={isBlackHoleTriggered}
            isBombExploding={isBombExploding}
            isVampireSource={isVampireSource}
            isVampireTarget={isVampireTarget}
            isPowerTargeting={isPowerTargeting}
            isPowerTarget={isPowerTarget}
            activePower={activePower}
            powerTargetLabel={powerTargetLabel}
            isLastPlaced={index === lastPlacedIndex}
            onSquareClick={handleStableSquareClick}
          />
        )
      })}

      {isVampireActive && beamCoords && (
        <svg
          className="vampire-siphon-svg-overlay"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="vampireBeamGrad"
              x1={`${beamCoords.x1}%`}
              y1={`${beamCoords.y1}%`}
              x2={`${beamCoords.x2}%`}
              y2={`${beamCoords.y2}%`}
            >
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity="1" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.95" />
            </linearGradient>
            <filter id="vampireGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <line
            x1={`${beamCoords.x1}%`}
            y1={`${beamCoords.y1}%`}
            x2={`${beamCoords.x2}%`}
            y2={`${beamCoords.y2}%`}
            className="vampire-beam-line"
            filter="url(#vampireGlow)"
          />
          <circle
            cx={`${beamCoords.x1}%`}
            cy={`${beamCoords.y1}%`}
            r="3.5"
            className="vampire-source-orb"
          />
          <circle
            cx={`${beamCoords.x2}%`}
            cy={`${beamCoords.y2}%`}
            r="4"
            className="vampire-target-orb"
          />
        </svg>
      )}
    </div>
  )
})

export default Board
