import { useEffect, useState } from 'react'
import { playSound } from '../game/soundManager';

export default function IntroAnimation({ onQuickPlay, onCustomize, language }) {
  const [showButtons, setShowButtons] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const isTr = language === 'tr';

  useEffect(() => {
    // Show quick play buttons after short smooth entrance (250ms)
    const btnTimer = setTimeout(() => setShowButtons(true), 250);
    
    // Auto fade out after 6 seconds
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 5500);

    // Call customize automatically after fade completes if no interaction
    const skipTimer = setTimeout(() => {
      onCustomize();
    }, 6000);

    return () => {
      clearTimeout(btnTimer);
      clearTimeout(fadeTimer);
      clearTimeout(skipTimer);
    };
  }, [onCustomize]);

  const handleQuickPlay = () => {
    playSound('click');
    setFadingOut(true);
    setTimeout(() => onQuickPlay(), 250);
  };

  const handleCustomize = () => {
    playSound('click');
    setFadingOut(true);
    setTimeout(() => onCustomize(), 250);
  };

  return (
    <div className={`intro-container ${fadingOut ? 'fade-out' : ''}`}>
      <button
        type="button"
        className="intro-skip-corner-btn"
        onClick={handleCustomize}
        aria-label={isTr ? 'Geç' : 'Skip'}
      >
        {isTr ? 'Geç ➔' : 'Skip ➔'}
      </button>

      <div className="intro-content">
        <div className="grid-animation">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="grid-cell">
              {i === 6 && <span className="power-icon p1">💣</span>}
              {i === 8 && <span className="power-icon p2">🛡️</span>}
              {i === 12 && <span className="multiplier">2x</span>}
              {i === 16 && <span className="power-icon p3">🕳️</span>}
              {i === 18 && <span className="power-icon p4">❄️</span>}
              {i === 14 && <span className="multiplier">3x</span>}
              {i === 22 && <span className="power-icon p5">🧛</span>}
            </div>
          ))}
        </div>
        
        <div className="title-container">
          <h1 className="neon-title">XO TACTIX</h1>
          <h2 className="neon-subtitle">
            {isTr ? 'Taktiksel Zeka & Strateji' : 'Strategic Mind Game'}
          </h2>
        </div>

        <div className={`action-buttons ${showButtons ? 'visible' : ''}`}>
          <button type="button" className="quick-play-btn" onClick={handleQuickPlay}>
            ⚡ {isTr ? 'Hızlı Oyna' : 'Quick Play'}
          </button>
          <button type="button" className="customize-btn" onClick={handleCustomize}>
            {isTr ? 'Ayarlar & Modlar ▸' : 'Settings & Modes ▸'}
          </button>
        </div>
      </div>

      <style>{`
        .intro-container {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, #0e172a 0%, #050711 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          z-index: 10000;
          padding: 16px;
          box-sizing: border-box;
          transition: opacity 0.6s ease-in-out;
        }

        .intro-container.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .intro-skip-corner-btn {
          position: absolute;
          top: 18px;
          right: 20px;
          z-index: 10;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.75);
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 20px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }

        .intro-skip-corner-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.35);
          transform: translateY(-1px);
        }

        .intro-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          max-height: 100%;
        }

        .grid-animation {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          width: min(200px, 34vh);
          height: min(200px, 34vh);
          margin-bottom: min(20px, 3vh);
          perspective: 1000px;
          transform: rotateX(20deg) scale(0);
          animation: grid-appear 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .grid-cell {
          background: rgba(0, 240, 255, 0.06);
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 6px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: inset 0 0 10px rgba(0, 240, 255, 0.12);
          animation: pulse-glow 2s infinite alternate ease-in-out;
          position: relative;
        }

        .power-icon {
          font-size: min(1.3rem, 4.5vw);
          position: absolute;
          opacity: 0;
        }

        .p1 { animation: fly-in-left 0.7s forwards 0.6s; }
        .p2 { animation: fly-in-right 0.7s forwards 0.8s; }
        .p3 { animation: fly-in-top 0.7s forwards 1.0s; }
        .p4 { animation: fly-in-bottom 0.7s forwards 1.2s; }
        .p5 { animation: fly-in-left 0.7s forwards 1.4s; }

        .multiplier {
          font-weight: 800;
          font-size: min(1.1rem, 3.5vw);
          color: #f59e0b;
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
          opacity: 0;
          animation: pop-in 0.4s forwards 1.5s;
        }

        .title-container {
          text-align: center;
          opacity: 0;
          animation: fade-in-up 1s forwards 1.6s;
        }

        .neon-title {
          font-size: clamp(2rem, 5.5vw, 3.4rem);
          font-weight: 900;
          color: #fff;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 3px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.8), 0 0 50px rgba(0, 240, 255, 0.4);
        }

        .neon-subtitle {
          font-size: clamp(0.85rem, 2.2vw, 1.05rem);
          color: #c084fc;
          margin: 6px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(192, 132, 252, 0.6);
        }

        .action-buttons {
          margin-top: min(24px, 4vh);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.4s, transform 0.4s;
        }

        .action-buttons.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .quick-play-btn {
          background: linear-gradient(135deg, #00f0ff 0%, #0284c7 100%);
          color: #030712;
          border: none;
          padding: 13px 36px;
          font-size: 1.05rem;
          font-weight: 900;
          border-radius: 999px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
          transition: transform 0.18s, box-shadow 0.18s;
        }

        .quick-play-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.8);
        }

        .quick-play-btn:active {
          transform: translateY(0);
        }

        .customize-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.88rem;
          cursor: pointer;
          font-weight: 600;
          letter-spacing: 0.8px;
          transition: color 0.18s;
          padding: 4px 8px;
        }

        .customize-btn:hover {
          color: #ffffff;
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.7);
        }

        @keyframes grid-appear {
          0% { transform: rotateX(60deg) scale(0); opacity: 0; }
          100% { transform: rotateX(20deg) scale(1); opacity: 1; }
        }

        @keyframes pulse-glow {
          0% { box-shadow: inset 0 0 6px rgba(0, 240, 255, 0.15); border-color: rgba(0, 240, 255, 0.25); }
          100% { box-shadow: inset 0 0 14px rgba(0, 240, 255, 0.45); border-color: rgba(0, 240, 255, 0.6); }
        }

        @keyframes fly-in-left {
          0% { transform: translateX(-150px) rotate(-360deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0); opacity: 1; }
        }

        @keyframes fly-in-right {
          0% { transform: translateX(150px) rotate(360deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0); opacity: 1; }
        }

        @keyframes fly-in-top {
          0% { transform: translateY(-150px) rotate(-360deg); opacity: 0; }
          100% { transform: translateY(0) rotate(0); opacity: 1; }
        }

        @keyframes fly-in-bottom {
          0% { transform: translateY(150px) rotate(360deg); opacity: 0; }
          100% { transform: translateY(0) rotate(0); opacity: 1; }
        }

        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
