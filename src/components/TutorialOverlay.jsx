import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TRANSLATIONS = {
  en: {
    step1: "Place your mark on the board",
    step2: "Score multipliers! Land on 2x or 3x cells for bonus points",
    step3: "Use powers to gain tactical advantage!",
    step4: "💣 Bomb destroys enemy pieces, 🛡️ Shield protects yours",
    step5: "Complete the line to score points. First to target wins!",
    skip: "Skip Tutorial",
    next: "Next ▸",
    complete: "Tutorial complete! You are ready to battle! ✅"
  },
  tr: {
    step1: "İşaretini tahtadaki boş bir kareye koy",
    step2: "Skor çarpanları! Bonus puanlar için 2x veya 3x hücrelerine yerleş",
    step3: "Taktiksel üstünlük kurmak için güçlerini kullan!",
    step4: "💣 Bomba rakip taşı yok eder, 🛡️ Kalkan seninkileri korur",
    step5: "Puan kazanmak için sırayı tamamla. Hedefe ilk ulaşan kazanır!",
    skip: "Eğitimi Geç",
    next: "İleri ▸",
    complete: "Eğitim tamamlandı! Savaşa hazırsın! ✅"
  }
};

export default function TutorialOverlay({ step, onNextStep, onSkip, language }) {
  const [targetRect, setTargetRect] = useState(null);
  const [hasCompleted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('xo-tutorial-complete'));
  });

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    if (step === 6) {
      localStorage.setItem('xo-tutorial-complete', 'true');
      const timer = setTimeout(() => {
        if (onSkip) onSkip();
      }, 2200);
      return () => clearTimeout(timer);
    }
    
    // Attempt to find target element to highlight
    const selectors = {
      1: ['.game-board', '.board', '.grid'],
      2: ['.multiplier', '.multiplier-badge', '.bonus', '.board-cell[data-multiplier]'],
      3: ['.power-panel', '.powers', '.power-container', '.game-powers'],
      4: ['.bomb-icon', '.shield-icon', '.power-btn', '.power-item'],
      5: ['.score-display', '.score', '.scores', '.player-score']
    };

    const findAndSetTarget = () => {
      const stepSelectors = selectors[step];
      if (stepSelectors) {
        for (const selector of stepSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);
            return;
          }
        }
      }
      setTargetRect(null);
    };

    const timer = setTimeout(findAndSetTarget, 100);
    window.addEventListener('resize', findAndSetTarget);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findAndSetTarget);
    };
  }, [step, onSkip]);

  if (hasCompleted && step !== 6) return null;

  const getStepText = () => {
    switch (step) {
      case 1: return t.step1;
      case 2: return t.step2;
      case 3: return t.step3;
      case 4: return t.step4;
      case 5: return t.step5;
      case 6: return t.complete;
      default: return '';
    }
  };

  const spotlightStyle = targetRect ? {
    position: 'fixed',
    top: `${Math.max(4, targetRect.top - 8)}px`,
    left: `${Math.max(4, targetRect.left - 8)}px`,
    width: `${targetRect.width + 16}px`,
    height: `${targetRect.height + 16}px`,
    borderRadius: '16px',
    boxShadow: '0 0 0 9999px rgba(5, 7, 18, 0.88), 0 0 20px rgba(0, 240, 255, 0.6) inset',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'none',
    zIndex: 9998,
    border: '2px solid #00f0ff',
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '0px',
    height: '0px',
    boxShadow: '0 0 0 9999px rgba(5, 7, 18, 0.88)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'none',
    zIndex: 9998
  };

  // Safe clamped tooltip placement
  let tooltipTop = '50%';
  if (targetRect && typeof window !== 'undefined') {
    const isBottomHalf = targetRect.top > window.innerHeight / 2;
    const computedTop = isBottomHalf ? targetRect.top - 150 : targetRect.bottom + 20;
    tooltipTop = `${Math.max(16, Math.min(window.innerHeight - 160, computedTop))}px`;
  }

  const modalContent = (
    <div className="tutorial-overlay-container">
      <div style={spotlightStyle} className="tutorial-spotlight" />
      
      <div className="tutorial-tooltip" style={{ top: tooltipTop }}>
        <p className="tutorial-text">{getStepText()}</p>
        
        {step < 6 && (
          <div className="tutorial-actions">
            <button
              type="button"
              className="tutorial-skip-btn"
              onClick={() => {
                localStorage.setItem('xo-tutorial-complete', 'true');
                if (onSkip) onSkip();
              }}
            >
              {t.skip}
            </button>
            <button type="button" className="tutorial-next-btn" onClick={onNextStep}>
              {t.next}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .tutorial-overlay-container {
          position: fixed;
          inset: 0;
          z-index: 9997;
          pointer-events: auto;
          overflow: hidden;
        }

        .tutorial-spotlight {
          animation: pulseSpotlight 2.2s infinite ease-in-out;
        }

        @keyframes pulseSpotlight {
          0%, 100% { border-color: #00f0ff; }
          50% { border-color: #38bdf8; box-shadow: 0 0 0 9999px rgba(5, 7, 18, 0.88), 0 0 28px rgba(0, 240, 255, 0.9) inset; }
        }

        .tutorial-tooltip {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.96);
          border: 1.5px solid #00f0ff;
          border-radius: 18px;
          padding: 18px 22px;
          width: min(340px, 90vw);
          box-sizing: border-box;
          text-align: center;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.25);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 9999;
          transition: top 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: tooltipFadeIn 0.25s ease-out;
        }

        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .tutorial-text {
          color: #f8fafc;
          font-size: 1rem;
          margin: 0 0 16px 0;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
          line-height: 1.45;
          font-weight: 600;
        }

        .tutorial-actions {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .tutorial-skip-btn {
          flex: 1;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.85rem;
          transition: all 0.18s;
        }

        .tutorial-skip-btn:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: #ef4444;
          color: #ffffff;
        }

        .tutorial-next-btn {
          flex: 1.2;
          background: linear-gradient(135deg, #00f0ff 0%, #0284c7 100%);
          border: none;
          color: #030712;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 800;
          font-size: 0.9rem;
          letter-spacing: 0.5px;
          transition: all 0.18s;
          box-shadow: 0 4px 16px rgba(0, 240, 255, 0.35);
        }

        .tutorial-next-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 240, 255, 0.55);
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
