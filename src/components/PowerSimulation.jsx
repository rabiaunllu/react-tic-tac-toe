import { useState, useEffect, useRef, useCallback } from 'react';
import CrystalSnowflake from './CrystalSnowflake';

const POWERS = [
  { id: 'bomba', icon: '💣', name: 'Bomba', desc: 'Rakibin korumasız taşını patlat!' },
  { id: 'kalkan', icon: '🛡️', name: 'Kalkan', desc: 'Kendi taşını koru! (Hamle hakkın devam eder)' },
  { id: 'boost', icon: '⚡', name: 'Boost', desc: 'Hücre çarpanını 2 katına çıkar! (Hamle hakkın devam eder)' },
  { id: 'karadelik', icon: '🕳️', name: 'Kara Delik', desc: 'Rakibin taşı koyunca yutulur!' },
  { id: 'joker', icon: '🃏', name: 'Joker', desc: 'Rakibin taşını kendi taşına çevir!' },
  { id: 'freeze', icon: '❄️', name: 'Freeze', desc: 'Boş kareyi kilitle! (Hamle hakkın devam eder)' },
  { id: 'vampir', icon: '🧛', name: 'Vampir', desc: 'Rakibin çarpanını kendi taşına taşı! (Hamle hakkın devam eder)' }
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

export default function PowerSimulation() {
  const [activePower, setActivePower] = useState('bomba');
  const [board, setBoard] = useState(Array(9).fill({ val: null, mult: null, effects: [], transientEffect: null }));
  const [winGlows, setWinGlows] = useState([]);
  const [beam, setBeam] = useState(null);
  
  const stepRef = useRef(0);
  const timerRef = useRef(null);

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
            {power.id === 'freeze' ? <CrystalSnowflake size="20px" /> : power.icon}
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
