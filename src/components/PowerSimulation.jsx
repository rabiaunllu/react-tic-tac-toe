import { useState, useEffect, useRef, useCallback } from 'react';
import CrystalSnowflake from './CrystalSnowflake';
import EnergyShieldIcon from './EnergyShieldIcon';
import ExplosionBlast from './ExplosionBlast';
import { useTranslation } from '../i18n';

const POWER_CONFIGS = [
  { id: 'bomba', key: 'bomb', icon: '💣' },
  { id: 'kalkan', key: 'shield', icon: <EnergyShieldIcon size={18} /> },
  { id: 'karadelik', key: 'trap', icon: '🕳️' },
  { id: 'freeze', key: 'freeze', icon: <CrystalSnowflake size="18px" /> },
  { id: 'vampir', key: 'vampire', icon: '🧛' },
];

const INITIAL_CELL = {
  val: null,
  mult: null,
  isShielded: false,
  isLocked: false,
  isFrozen: false,
  isTrapped: false,
  isBlackHoleTriggered: false,
  isBombExploding: false,
  isVampireSource: false,
  isVampireTarget: false,
  transientEffect: null,
};

const SCENARIOS = {
  bomba: [
    { type: 'PATCH', idx: 0, patch: { val: 'X' } },
    { type: 'PATCH', idx: 4, patch: { val: 'O' } },
    { type: 'PATCH', idx: 2, patch: { val: 'X' } },
    { type: 'PATCH', idx: 8, patch: { val: 'O' } },
    { type: 'PATCH', idx: 4, patch: { isBombExploding: true } },
    { type: 'PATCH', idx: 4, patch: { val: null, isBombExploding: false, isLocked: true } },
    { type: 'PATCH', idx: 7, patch: { val: 'O' } },
    { type: 'PATCH', idx: 1, patch: { val: 'X' } },
    { type: 'WIN', indices: [0, 1, 2] }
  ],
  kalkan: [
    { type: 'PATCH', idx: 4, patch: { val: 'X' } },
    { type: 'PATCH', idx: 0, patch: { val: 'O' } },
    { type: 'PATCH', idx: 4, patch: { isShielded: true, transientEffect: 'psim-deflect' } },
    { type: 'PATCH', idx: 2, patch: { val: 'X' } },
    { type: 'PATCH', idx: 6, patch: { val: 'O' } },
    { type: 'PATCH', idx: 8, patch: { val: 'X' } },
    { type: 'WIN', indices: [2, 4, 8] }
  ],
  karadelik: [
    { type: 'PATCH', idx: 0, patch: { val: 'X' } },
    { type: 'PATCH', idx: 4, patch: { val: 'O' } },
    { type: 'PATCH', idx: 8, patch: { isTrapped: true } },
    { type: 'PATCH', idx: 8, patch: { isBlackHoleTriggered: true, isTrapped: false } },
    { type: 'PATCH', idx: 8, patch: { isTrapped: false, isBlackHoleTriggered: false, val: null } },
    { type: 'PATCH', idx: 2, patch: { val: 'X' } },
    { type: 'PATCH', idx: 6, patch: { val: 'O' } },
    { type: 'PATCH', idx: 1, patch: { val: 'X' } },
    { type: 'WIN', indices: [0, 1, 2] }
  ],
  freeze: [
    { type: 'PATCH', idx: 0, patch: { val: 'X' } },
    { type: 'PATCH', idx: 4, patch: { val: 'O' } },
    { type: 'PATCH', idx: 8, patch: { isFrozen: true, transientEffect: 'psim-shake' } },
    { type: 'PATCH', idx: 2, patch: { val: 'X' } },
    { type: 'PATCH', idx: 6, patch: { val: 'O' } },
    { type: 'PATCH', idx: 8, patch: { isFrozen: false } },
    { type: 'PATCH', idx: 1, patch: { val: 'X' } },
    { type: 'WIN', indices: [0, 1, 2] }
  ],
  vampir: [
    { type: 'PATCH', idx: 0, patch: { val: 'X', mult: 1 } },
    { type: 'PATCH', idx: 4, patch: { val: 'O', mult: 3 } },
    { type: 'VAMPIR_BEAM', from: 4, to: 0 },
    { type: 'PATCH_MULTI', updates: [
      { idx: 4, patch: { mult: 1, isVampireSource: false } },
      { idx: 0, patch: { mult: 3, isVampireTarget: false } }
    ] },
    { type: 'PATCH', idx: 2, patch: { val: 'X' } },
    { type: 'PATCH', idx: 6, patch: { val: 'O' } },
    { type: 'PATCH', idx: 1, patch: { val: 'X' } },
    { type: 'WIN', indices: [0, 1, 2] }
  ]
};

export default function PowerSimulation() {
  const { t, language } = useTranslation();
  const isTr = language === 'tr';

  const powers = POWER_CONFIGS.map((item) => ({
    ...item,
    name: t(`powers.${item.key}.name`),
    desc: t(`powers.${item.key}.desc`),
  }));

  const [activePower, setActivePower] = useState('bomba');
  const [board, setBoard] = useState(Array(9).fill(null).map(() => ({ ...INITIAL_CELL })));
  const [winGlows, setWinGlows] = useState([]);
  const [beamCoords, setBeamCoords] = useState(null);
  
  const stepRef = useRef(0);
  const timerRef = useRef(null);

  const resetSimulation = useCallback(() => {
    setBoard(Array(9).fill(null).map(() => ({ ...INITIAL_CELL })));
    setWinGlows([]);
    setBeamCoords(null);
    stepRef.current = 0;
  }, []);

  const advanceRef = useRef(null);

  const advanceScenario = useCallback(() => {
    const scenario = SCENARIOS[activePower];
    if (stepRef.current >= scenario.length) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        resetSimulation();
        timerRef.current = setTimeout(() => advanceRef.current?.(), 500);
      }, 2200);
      return;
    }

    const action = scenario[stepRef.current];
    stepRef.current++;

    setBoard(prev => {
      const newBoard = prev.map(cell => ({ ...cell, transientEffect: null }));

      if (action.type === 'PATCH') {
        newBoard[action.idx] = {
          ...newBoard[action.idx],
          ...action.patch,
        };
      } else if (action.type === 'PATCH_MULTI') {
        action.updates.forEach(({ idx, patch }) => {
          newBoard[idx] = { ...newBoard[idx], ...patch };
        });
        setBeamCoords(null);
      } else if (action.type === 'VAMPIR_BEAM') {
        const srcRow = Math.floor(action.from / 3);
        const srcCol = action.from % 3;
        const tgtRow = Math.floor(action.to / 3);
        const tgtCol = action.to % 3;
        setBeamCoords({
          x1: ((srcCol + 0.5) / 3) * 100,
          y1: ((srcRow + 0.5) / 3) * 100,
          x2: ((tgtCol + 0.5) / 3) * 100,
          y2: ((tgtRow + 0.5) / 3) * 100,
        });
        newBoard[action.from] = { ...newBoard[action.from], isVampireSource: true };
        newBoard[action.to] = { ...newBoard[action.to], isVampireTarget: true };
      } else if (action.type === 'WIN') {
        setWinGlows(action.indices);
      }

      return newBoard;
    });

    timerRef.current = setTimeout(() => advanceRef.current?.(), 750);
  }, [activePower, resetSimulation]);

  useEffect(() => {
    advanceRef.current = advanceScenario;
  }, [advanceScenario]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        clearTimeout(timerRef.current);
      } else {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => advanceRef.current?.(), 400);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      resetSimulation();
      timerRef.current = setTimeout(() => advanceRef.current?.(), 400);
    }, 20);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(timerRef.current);
    };
  }, [activePower, resetSimulation]);

  const handlePowerClick = (id) => {
    if (activePower !== id) {
      setActivePower(id);
    }
  };

  const activePowerInfo = powers.find(p => p.id === activePower);

  return (
    <div className="psim-container">
      <div className="psim-powers-row">
        {powers.map(power => (
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
        {beamCoords && (
          <svg
            className="vampire-siphon-svg-overlay"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="psimVampireBeamGrad"
                x1={`${beamCoords.x1}%`}
                y1={`${beamCoords.y1}%`}
                x2={`${beamCoords.x2}%`}
                y2={`${beamCoords.y2}%`}
              >
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f43f5e" stopOpacity="1" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.95" />
              </linearGradient>
              <filter id="psimVampireGlow" x="-20%" y="-20%" width="140%" height="140%">
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
              stroke="url(#psimVampireBeamGrad)"
              filter="url(#psimVampireGlow)"
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

        {board.map((cell, idx) => {
          const isWin = winGlows.includes(idx);
          const classes = [
            'psim-cell',
            cell.isShielded ? 'shielded-square' : '',
            cell.isLocked ? 'locked-square' : '',
            cell.isFrozen ? 'frozen-square' : '',
            cell.isTrapped ? 'trapped-square' : '',
            cell.isBlackHoleTriggered ? 'black-hole-triggered-square' : '',
            cell.isBombExploding ? 'bomb-exploding-square' : '',
            cell.isVampireSource ? 'vampire-source-square' : '',
            cell.isVampireTarget ? 'vampire-target-square' : '',
            cell.transientEffect,
            isWin ? 'winning-square psim-win-glow' : ''
          ].filter(Boolean).join(' ');

          return (
            <div key={idx} className={classes}>
              {cell.mult && <span className="multiplier-badge">{cell.mult}x</span>}

              {cell.isShielded && (
                <>
                  <span className="shield-icon-badge" aria-label={isTr ? 'Korumalı taş' : 'Shielded mark'}>
                    <EnergyShieldIcon size={14} />
                  </span>
                  <span className="shield-energy-aura" aria-hidden="true">
                    <span className="shield-orbital-ring ring-1" />
                    <span className="shield-orbital-ring ring-2" />
                  </span>
                </>
              )}

              {cell.isTrapped && <span className="trap-badge" aria-hidden="true">🕳️</span>}

              {cell.isBlackHoleTriggered && (
                <span className="black-hole-badge" aria-label={isTr ? 'Kara delik tetiklendi' : 'Black hole triggered'}>
                  🕳️
                </span>
              )}

              {cell.isBombExploding && (
                <span className="bomb-explosion-overlay" aria-hidden="true">
                  <ExplosionBlast className="bomb-blast-graphic" />
                </span>
              )}

              {cell.isLocked && !cell.isBombExploding && (
                <span className="shattered-glass-overlay" aria-hidden="true">
                  <svg viewBox="0 0 100 100" className="shattered-glass-svg">
                    <path d="M 38 0 Q 39 8, 41 12 Q 43 14, 38 18 Q 30 22, 28 26 Q 20 28, 18 35 Q 19 42, 10 46 Q 6 48, 0 49" className="crack-major" />
                    <path d="M 28 26 Q 35 34, 38 42 Q 33 46, 32 50 Q 38 56, 44 58 Q 50 61, 51 68 Q 48 74, 52 78 Q 53 85, 47 88 Q 49 94, 48 100" className="crack-major" />
                    <path d="M 51 68 Q 60 63, 68 62 Q 74 65, 75 74 Q 82 72, 85 78 Q 80 84, 82 89 Q 90 88, 100 90" className="crack-major" />
                    <path d="M 80 0 Q 78 8, 80 14 Q 78 18, 88 18 Q 90 22, 89 30 Q 94 33, 98 32 Q 94 38, 98 44 Q 93 42, 90 48 Q 91 55, 100 58" className="crack-major" />
                    <path d="M 62 22 Q 65 29, 63 32 Q 70 35, 76 35 Q 82 32, 86 38 Q 78 40, 75 48 Q 76 56, 74 65" className="crack-mid" />
                    <path d="M 10 46 Q 14 55, 16 64 Q 12 70, 15 76 Q 13 82, 18 84 Q 15 90, 10 93 Q 8 98, 7 100" className="crack-mid" />
                    <path d="M 75 74 Q 78 82, 77 92 Q 81 96, 80 100" className="crack-mid" />
                    <path d="M 41 12 Q 46 12, 52 10 Q 56 12, 60 14" className="crack-mid" />
                    <path d="M 18 10 Q 20 16, 26 18 Q 28 17, 30 19" className="crack-mid" />
                    <path d="M 33 50 Q 28 54, 25 57" className="crack-fine" />
                    <path d="M 38 72 Q 33 76, 36 84 Q 38 86, 36 89" className="crack-fine" />
                    <path d="M 44 58 Q 48 54, 52 54" className="crack-fine" />
                    <path d="M 64 88 Q 68 89, 72 88" className="crack-fine" />
                    <path d="M 82 89 Q 88 88, 94 92" className="crack-fine" />
                  </svg>
                </span>
              )}

              {cell.isFrozen && (
                <span className="frozen-crystal-overlay" aria-hidden="true">
                  <CrystalSnowflake className="frozen-crystal-graphic" />
                </span>
              )}

              {cell.isVampireSource && <span className="vampire-drain-pulse" aria-hidden="true" />}
              {cell.isVampireTarget && <span className="vampire-absorb-burst" aria-hidden="true" />}

              {cell.val && (
                <span className={`psim-val-${cell.val}`}>
                  {cell.val}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="psim-desc">
        {activePowerInfo && (
          <p className="psim-desc-text">
            <strong className="psim-desc-name">{activePowerInfo.name}:</strong>{' '}
            <span className="psim-desc-body">{activePowerInfo.desc}</span>
          </p>
        )}
      </div>
    </div>
  );
}
