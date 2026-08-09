import { useEffect } from 'react';

const cssStyles = `
  .hero-banner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    background: transparent;
    overflow: hidden;
    width: 100%;
  }

  .hero-banner-container--compact {
    padding: 0.5rem 1rem;
  }

  /* Clash Animation Container */
  .hero-clash-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hero-banner-container--compact .hero-clash-container {
    height: 70px;
    max-width: 280px;
  }

  .hero-symbol {
    font-family: 'Orbitron', system-ui, sans-serif;
    font-size: 5.5rem;
    font-weight: 900;
    position: absolute;
    line-height: 1;
    animation-duration: 3s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
  }

  .hero-banner-container--compact .hero-symbol {
    font-size: 3.2rem;
  }

  .hero-symbol-x {
    color: #8cf2ff;
    text-shadow: 0 0 10px #8cf2ff, 0 0 20px #8cf2ff, 0 0 40px #8cf2ff;
    animation-name: hero-slide-right;
    left: 15%;
  }

  .hero-symbol-o {
    color: #ff8fc5;
    text-shadow: 0 0 10px #ff8fc5, 0 0 20px #ff8fc5, 0 0 40px #ff8fc5;
    animation-name: hero-slide-left;
    right: 15%;
  }

  .hero-clash-glow {
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 30px 20px rgba(255, 255, 255, 0.9), 0 0 60px 40px #c084fc;
    opacity: 0;
    animation: hero-glow-burst 3s infinite ease-in-out;
    z-index: 0;
  }

  .hero-banner-container--compact .hero-clash-glow {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 20px 12px rgba(255, 255, 255, 0.8), 0 0 40px 24px #c084fc;
  }

  .hero-symbol-x, .hero-symbol-o {
    z-index: 1;
  }

  @keyframes hero-slide-right {
    0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
    40% { transform: translateX(70px) scale(1.1); opacity: 1; }
    50% { transform: translateX(95px) scale(1.2); opacity: 1; }
    60% { transform: translateX(70px) scale(1.1); opacity: 1; }
  }

  @keyframes hero-slide-left {
    0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
    40% { transform: translateX(-70px) scale(1.1); opacity: 1; }
    50% { transform: translateX(-95px) scale(1.2); opacity: 1; }
    60% { transform: translateX(-70px) scale(1.1); opacity: 1; }
  }

  @keyframes hero-glow-burst {
    0%, 45%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(2.2); }
    60% { opacity: 0.6; transform: scale(1.5); }
  }

  @media (max-width: 480px) {
    .hero-symbol { font-size: 4.5rem; }
    .hero-clash-container { height: 100px; }
    .hero-banner-container--compact .hero-symbol { font-size: 2.6rem; }
    .hero-banner-container--compact .hero-clash-container { height: 56px; }
    @keyframes hero-slide-right {
      0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
      40% { transform: translateX(50px) scale(1.1); opacity: 1; }
      50% { transform: translateX(70px) scale(1.2); opacity: 1; }
      60% { transform: translateX(50px) scale(1.1); opacity: 1; }
    }
    @keyframes hero-slide-left {
      0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
      40% { transform: translateX(-50px) scale(1.1); opacity: 1; }
      50% { transform: translateX(-70px) scale(1.2); opacity: 1; }
      60% { transform: translateX(-50px) scale(1.1); opacity: 1; }
    }
  }
`;

export default function SetupHeroBanner({ compact = false }) {
  // Inject component-scoped styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = cssStyles;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div className={`hero-banner-container${compact ? ' hero-banner-container--compact' : ''}`}>
      {/* Clash Animation */}
      <div className="hero-clash-container">
        <div className="hero-symbol hero-symbol-x">X</div>
        <div className="hero-clash-glow"></div>
        <div className="hero-symbol hero-symbol-o">O</div>
      </div>
    </div>
  );
}
