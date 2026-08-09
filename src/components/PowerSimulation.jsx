import { useState, useEffect, useRef, useCallback } from 'react';

const POWERS = [
  { id: 'bomba', icon: '💣', name: 'Bomba', desc: 'Rakibin korumasız taşını patlat!' },
  { id: 'kalkan', icon: '🛡️', name: 'Kalkan', desc: 'Kendi taşını saldırılardan koru!' },
  { id: 'boost', icon: '⚡', name: 'Boost', desc: 'Hücre çarpanını 2 katına çıkar!' },
  { id: 'karadelik', icon: '🕳️', name: 'Kara Delik', desc: 'Rakibin taşı koyunca yutulur!' },
  { id: 'joker', icon: '🃏', name: 'Joker', desc: 'Rakibin taşını kendi taşına çevir!' },
  { id: 'freeze', icon: '❄️', name: 'Freeze', desc: 'Boş kareyi bir hamle boyunca kilitle!' },
  { id: 'vampir', icon: '🧛', name: 'Vampir', desc: 'Rakibin çarpanını kendi taşına taşı!' }
];

const SCENARIOS = {
  bomba: [
    { type: 'SET', idx: 0, val: 'X' },
    { type: 'SET', idx: 4, val: 'O' },
    { type: 'SET', idx: 2, val: 'X' },
    { type: 'SET', idx: 6, val: 'O' },
    { type: 'EFFECT', idx: 4, effect: 'psim-explode' },
    { type: 'SET', idx: 4, val: null },
    { type: 'SET', idx: 4, val: 'X' }
  ],
  kalkan: [
    { type: 'SET', idx: 4, val: 'X' },
    { type: 'ADD_EFFECT', idx: 4, effect: 'psim-shield' },
    { type: 'EFFECT', idx: 4, effect: 'psim-deflect' },
    { type: 'SET', idx: 0, val: 'O' },
    { type: 'SET', idx: 1, val: 'X' }
  ],
  boost: [
    { type: 'SET', idx: 0, val: 'X', mult: '1x' },
    { type: 'SET', idx: 4, val: 'O' },
    { type: 'SET', idx: 1, val: 'X', mult: '1x' },
    { type: 'SET_MULT', idx: 1, mult: '2x', effect: 'psim-boost-glow' },
    { type: 'SET', idx: 6, val: 'O' },
    { type: 'SET', idx: 2, val: 'X' },
    { type: 'WIN', indices: [0, 1, 2] }
  ],
  karadelik: [
    { type: 'SET', idx: 0, val: 'X' },
    { type: 'SET', idx: 4, val: 'O' },
    { type: 'ADD_EFFECT', idx: 8, effect: 'psim-trap' },
    { type: 'SET', idx: 8, val: 'O' },
    { type: 'EFFECT', idx: 8, effect: 'psim-sucked' },
    { type: 'SET', idx: 8, val: null },
    { type: 'SET', idx: 1, val: 'X' }
  ],
  joker: [
    { type: 'SET', idx: 0, val: 'X' },
    { type: 'SET', idx: 4, val: 'O' },
    { type: 'SET', idx: 2, val: 'X' },
    { type: 'SET', idx: 1, val: 'O' },
    { type: 'EFFECT', idx: 4, effect: 'psim-morph' },
    { type: 'SET', idx: 4, val: 'X' }
  ],
  freeze: [
    { type: 'SET', idx: 4, val: 'X' },
    { type: 'SET', idx: 0, val: 'O' },
    { type: 'ADD_EFFECT', idx: 8, effect: 'psim-frozen' },
    { type: 'EFFECT', idx: 8, effect: 'psim-shake' },
    { type: 'SET', idx: 2, val: 'O' },
    { type: 'REMOVE_EFFECT', idx: 8, effect: 'psim-frozen' }
  ],
  vampir: [
    { type: 'SET', idx: 0, val: 'X', mult: '1x' },
    { type: 'SET', idx: 4, val: 'O', mult: '3x' },
    { type: 'VAMPIR', from: 4, to: 0 },
    { type: 'SET', idx: 4, val: 'O', mult: '1x' },
    { type: 'SET', idx: 0, val: 'X', mult: '3x' },
    { type: 'SET', idx: 2, val: 'O' }
  ]
};

const STYLES = `
  .psim-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: system-ui, -apple-system, sans-serif;
    color: #fff;
    padding: 1rem;
    max-width: 400px;
    margin: 0 auto;
    background: #080a14;
    border-radius: 12px;
  }
  
  .psim-powers-row {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .psim-power-btn {
    background: #151a30;
    border: 1px solid #2a3052;
    border-radius: 20px;
    padding: 8px 12px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  
  .psim-power-btn:hover {
    background: #1d2442;
  }
  
  .psim-power-btn.active {
    border-color: #12f5dc;
    box-shadow: 0 0 10px rgba(18,245,220,0.4);
    transform: translateY(-2px);
    background: #1a2744;
  }
  
  .psim-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 20px;
    background: #1c223c;
    padding: 6px;
    border-radius: 12px;
  }
  
  .psim-cell {
    width: 48px;
    height: 48px;
    background: #0c0f1c;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: bold;
    position: relative;
    border: 1px solid #232a48;
    box-sizing: border-box;
  }
  
  .psim-val-X {
    color: #8cf2ff;
    text-shadow: 0 0 8px rgba(140,242,255,0.6);
  }
  
  .psim-val-O {
    color: #ff8fc5;
    text-shadow: 0 0 8px rgba(255,143,197,0.6);
  }
  
  .psim-desc {
    text-align: center;
    font-size: 14px;
    color: #a0a8cc;
    min-height: 24px;
  }
  
  .psim-mult {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #2a3052;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 4px;
    color: #ffd700;
  }
  
  .psim-win-badge {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffaa00;
    color: #fff;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
    z-index: 10;
    box-shadow: 0 0 10px #ffaa00;
    animation: psim-badge-in 0.3s forwards;
  }
  
  @keyframes psim-badge-in {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  /* Animations */
  @keyframes psim-anim-explode {
    0% { transform: scale(1); background: #0c0f1c; }
    50% { transform: scale(1.3); background: #ff4444; box-shadow: 0 0 20px #ff4444; }
    100% { transform: scale(0); opacity: 0; }
  }
  .psim-explode {
    animation: psim-anim-explode 0.6s forwards;
  }
  
  .psim-shield {
    box-shadow: inset 0 0 15px rgba(50,205,50,0.5);
    border-color: #32cd32;
  }
  
  @keyframes psim-anim-deflect {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); box-shadow: inset 0 0 30px rgba(50,205,50,0.9); }
    100% { transform: scale(1); }
  }
  .psim-deflect {
    animation: psim-anim-deflect 0.5s;
  }
  
  @keyframes psim-anim-boost {
    0% { filter: brightness(1); }
    50% { filter: brightness(2); transform: scale(1.2); text-shadow: 0 0 15px #ffd700; }
    100% { filter: brightness(1); }
  }
  .psim-boost-glow {
    animation: psim-anim-boost 0.6s forwards;
  }
  
  .psim-trap {
    background: radial-gradient(circle, #2a0845 0%, #0c0f1c 70%);
    box-shadow: inset 0 0 10px #61045f;
  }
  
  @keyframes psim-anim-sucked {
    0% { transform: scale(1) rotate(0deg); opacity: 1; }
    100% { transform: scale(0) rotate(360deg); opacity: 0; }
  }
  .psim-sucked {
    animation: psim-anim-sucked 0.6s forwards;
  }
  
  @keyframes psim-anim-morph {
    0% { filter: hue-rotate(0deg); }
    50% { filter: hue-rotate(180deg); transform: scale(1.2); }
    100% { filter: hue-rotate(360deg); }
  }
  .psim-morph {
    animation: psim-anim-morph 0.7s forwards;
  }
  
  .psim-frozen {
    background: rgba(173,216,230,0.2);
    border-color: #add8e6;
    box-shadow: inset 0 0 10px rgba(173,216,230,0.5);
  }
  
  @keyframes psim-anim-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .psim-shake {
    animation: psim-anim-shake 0.4s;
  }
  
  .psim-win-glow {
    background: rgba(255,170,0,0.2);
    box-shadow: 0 0 15px rgba(255,170,0,0.5);
    z-index: 1;
  }
  
  .psim-vamp-beam {
    position: absolute;
    width: 2px;
    background: #ff0055;
    box-shadow: 0 0 8px #ff0055;
    z-index: 5;
    transform-origin: top left;
    animation: psim-anim-beam 0.6s forwards;
  }
  
  @keyframes psim-anim-beam {
    0% { opacity: 0; }
    50% { opacity: 1; filter: brightness(1.5); }
    100% { opacity: 0; }
  }
`;

export default function PowerSimulation() {
  const [activePower, setActivePower] = useState('bomba');
  const [board, setBoard] = useState(Array(9).fill({ val: null, mult: null, effects: [], transientEffect: null }));
  const [winGlows, setWinGlows] = useState([]);
  const [beam, setBeam] = useState(null);
  
  const stepRef = useRef(0);
  const timerRef = useRef(null);

  // Inject CSS
  useEffect(() => {
    const styleId = 'psim-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }
    // No cleanup so it persists if unmounted/remounted, or you can clean it up.
  }, []);

  const resetSimulation = useCallback(() => {
    setBoard(Array(9).fill({ val: null, mult: null, effects: [], transientEffect: null }));
    setWinGlows([]);
    setBeam(null);
    stepRef.current = 0;
  }, []);

  const advanceScenario = useCallback(() => {
    const scenario = SCENARIOS[activePower];
    if (stepRef.current >= scenario.length) {
      // Loop with delay
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        resetSimulation();
        timerRef.current = setTimeout(advanceScenario, 500);
      }, 2000);
      return;
    }

    const action = scenario[stepRef.current];
    stepRef.current++;

    setBoard(prev => {
      const newBoard = [...prev];
      
      // Reset transient effects from prev step
      for (let i = 0; i < 9; i++) {
        newBoard[i] = { ...newBoard[i], transientEffect: null };
      }
      setBeam(null);

      if (action.type === 'SET') {
        newBoard[action.idx] = { ...newBoard[action.idx], val: action.val };
        if (action.mult !== undefined) newBoard[action.idx].mult = action.mult;
      }
      else if (action.type === 'EFFECT') {
        newBoard[action.idx] = { ...newBoard[action.idx], transientEffect: action.effect };
      }
      else if (action.type === 'ADD_EFFECT') {
        const effs = [...newBoard[action.idx].effects, action.effect];
        newBoard[action.idx] = { ...newBoard[action.idx], effects: effs };
      }
      else if (action.type === 'REMOVE_EFFECT') {
        const effs = newBoard[action.idx].effects.filter(e => e !== action.effect);
        newBoard[action.idx] = { ...newBoard[action.idx], effects: effs };
      }
      else if (action.type === 'SET_MULT') {
        newBoard[action.idx] = { ...newBoard[action.idx], mult: action.mult, transientEffect: action.effect };
      }
      else if (action.type === 'WIN') {
        setWinGlows(action.indices);
      }
      else if (action.type === 'VAMPIR') {
        // Just visual beam
        setBeam({ from: action.from, to: action.to });
      }

      return newBoard;
    });

    timerRef.current = setTimeout(advanceScenario, 700);
  }, [activePower, resetSimulation]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    resetSimulation();
    timerRef.current = setTimeout(advanceScenario, 500);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [activePower, advanceScenario, resetSimulation]);

  const handlePowerClick = (id) => {
    if (activePower !== id) {
      setActivePower(id);
    }
  };

  const activePowerInfo = POWERS.find(p => p.id === activePower);

  // Render beam for vampir
  const renderBeam = () => {
    if (!beam) return null;
    // rough calculation for a 3x3 grid assuming each cell is 48px + 6px gap = 54px total
    const getPos = (idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      return { x: col * 54 + 24, y: row * 54 + 24 }; // center of cell
    };
    const p1 = getPos(beam.from);
    const p2 = getPos(beam.to);
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return (
      <div 
        className="psim-vamp-beam" 
        style={{
          left: `${p1.x}px`,
          top: `${p1.y}px`,
          width: `${length}px`,
          transform: `rotate(${angle}deg)`
        }} 
      />
    );
  };

  return (
    <div className="psim-container">
      <div className="psim-powers-row">
        {POWERS.map(power => (
          <button
            key={power.id}
            className={`psim-power-btn ${activePower === power.id ? 'active' : ''}`}
            onClick={() => handlePowerClick(power.id)}
            title={power.name}
          >
            {power.icon}
          </button>
        ))}
      </div>
      
      <div className="psim-board" style={{ position: 'relative' }}>
        {renderBeam()}
        {board.map((cell, idx) => {
          const isWin = winGlows.includes(idx);
          const classes = [
            'psim-cell',
            ...cell.effects,
            cell.transientEffect,
            isWin ? 'psim-win-glow' : ''
          ].filter(Boolean).join(' ');

          return (
            <div key={idx} className={classes}>
              {cell.val && (
                <span className={`psim-val-${cell.val}`}>
                  {cell.val}
                </span>
              )}
              {cell.mult && (
                <div className="psim-mult">{cell.mult}</div>
              )}
              {isWin && idx === winGlows[1] && (
                <div className="psim-win-badge">6 puan!</div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="psim-desc">
        {activePowerInfo && <strong>{activePowerInfo.name}:</strong>} {activePowerInfo?.desc}
      </div>
    </div>
  );
}
