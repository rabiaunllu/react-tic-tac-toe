/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '../game/soundManager';

const translations = {
  en: {
    title: "Daily Mission",
    subtitle: "New tactical challenge every 24 hours",
    playToday: "PLAY TODAY'S MISSION",
    completed: "Mission Accomplished!",
    nextIn: "Next reset in",
    streak: "Active Streak",
    days: "Days",
    history: "7-Day History",
    reward: "+500 XP & Streak Bonus",
    back: "Close",
    monday_title: "Speed Challenge",
    monday_desc: "Win the game in as few moves as possible.",
    tuesday_title: "Power Master",
    tuesday_desc: "Win the game using your specialized powers.",
    wednesday_title: "Expanded Battlefield",
    wednesday_desc: "Dominate the 4x4 / 5x5 grid against elite AI.",
    thursday_title: "Tactical Multiplier",
    thursday_desc: "Utilize multiplier cells to outscore and defeat your opponent.",
    friday_title: "Survival Protocol",
    friday_desc: "Survive against relentless AI pressure.",
    saturday_title: "Pure Tactical Skill",
    saturday_desc: "No powers allowed. Pure mind game versus Expert AI.",
    sunday_title: "Cosmic Chaos",
    sunday_desc: "Unpredictable rules and extreme board dynamics.",
  },
  tr: {
    title: "Günün Görevi",
    subtitle: "Her 24 saatte bir yeni taktiksel meydan okuma",
    playToday: "GÜNÜN GÖREVİNİ OYNA",
    completed: "Görev Tamamlandı!",
    nextIn: "Yeni göreve kalan:",
    streak: "Kazanma Serisi",
    days: "Gün",
    history: "7 Günlük Takip",
    reward: "+500 TP & Seri Bonusu",
    back: "Kapat",
    monday_title: "Hız Görevi",
    monday_desc: "Oyunu en az hamle ile hızlıca kazan.",
    tuesday_title: "Güç Ustası",
    tuesday_desc: "Özel güçleri kullanarak rakibi mağlup et.",
    wednesday_title: "Büyük Savaş Alanı",
    wednesday_desc: "Genişletilmiş 4x4 / 5x5 tahtada yapay zekayı alt et.",
    thursday_title: "Taktiksel Çarpan",
    thursday_desc: "Çarpanlı hücreleri kullanarak rakibi mağlup et ve zafere ulaş.",
    friday_title: "Hayatta Kalma Protokolü",
    friday_desc: "Agresif yapay zekaya karşı diren ve kazan.",
    saturday_title: "Saf Taktiksel Yetenek",
    saturday_desc: "Güç yok. Uzman yapay zekaya karşı zeka savaşı.",
    sunday_title: "Kozmik Kaos",
    sunday_desc: "Öngörülemez kurallar ve dinamik tahta düzeni.",
  }
};

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getSeedFromDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0; 
  }
  return hash;
}

export function getTodaysChallenge() {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  
  const seed = getSeedFromDate(dateStr);
  const prng = mulberry32(seed);
  
  const dayOfWeek = now.getDay();
  
  const config = {
    id: `daily-${dateStr}`,
    isDaily: true,
    date: dateStr,
    title: { en: 'Daily Challenge', tr: 'Günün Görevi' },
    reward: { type: 'xp', value: 500 },
  };

  const powers = ['bomb', 'shield', 'freeze', 'trap'];
  const personalities = ['balanced', 'aggressive', 'defensive', 'chaotic'];

  const getTypeStr = (day) => {
      switch(day) {
          case 1: return 'monday';
          case 2: return 'tuesday';
          case 3: return 'wednesday';
          case 4: return 'thursday';
          case 5: return 'friday';
          case 6: return 'saturday';
          case 0: return 'sunday';
          default: return 'monday';
      }
  };

  const cType = getTypeStr(dayOfWeek);
  config.dayType = cType;
  config.title = {
    en: translations.en[`${cType}_title`] || 'Daily Challenge',
    tr: translations.tr[`${cType}_title`] || 'Günün Görevi',
  };
  config.description = {
    en: translations.en[`${cType}_desc`] || 'Complete today\'s challenge to earn rewards',
    tr: translations.tr[`${cType}_desc`] || 'Ödülü kazanmak için günün görevini tamamla',
  };

  if (dayOfWeek === 1) {
    config.type = 'challenge';
    config.boardSize = 3;
    config.winLength = 3;
    config.difficulty = 'medium';
    config.constraints = { maxMoves: 7 + Math.floor(prng() * 4) };
    config.aiPersonality = personalities[Math.floor(prng() * personalities.length)];
  } else if (dayOfWeek === 2) {
    config.type = 'win';
    config.boardSize = 3;
    config.winLength = 3;
    config.difficulty = 'medium';
    const power = powers[Math.floor(prng() * powers.length)];
    config.constraints = { requirePower: power };
    config.initialPowers = { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 };
    config.initialPowers[power] = 2 + Math.floor(prng() * 2);
    config.aiPersonality = 'balanced';
  } else if (dayOfWeek === 3) {
    config.type = 'win';
    config.boardSize = prng() > 0.5 ? 4 : 5;
    config.winLength = config.boardSize === 4 ? 4 : (prng() > 0.5 ? 4 : 5);
    config.difficulty = 'hard';
    config.constraints = {};
    config.aiPersonality = 'aggressive';
  } else if (dayOfWeek === 4) {
    config.type = 'win';
    config.boardSize = 3;
    config.winLength = 3;
    config.difficulty = 'hard';
    config.constraints = { requireMultiplier: true };
    config.initialBoard = null;
    config.initialPowers = null;
    config.aiPersonality = 'defensive';
  } else if (dayOfWeek === 5) {
    config.type = 'survival';
    config.boardSize = 3;
    config.winLength = 3;
    config.difficulty = 'hard';
    config.constraints = {};
    config.aiPersonality = 'aggressive';
  } else if (dayOfWeek === 6) {
    config.type = 'win';
    config.boardSize = 3;
    config.winLength = 3;
    config.difficulty = 'expert';
    config.constraints = { noPowers: true };
    config.initialPowers = { bomb: 0, shield: 0, freeze: 0, vampire: 0, trap: 0 };
    config.aiPersonality = 'balanced';
  } else {
    config.type = ['win', 'challenge', 'survival'][Math.floor(prng() * 3)];
    config.boardSize = 3 + Math.floor(prng() * 2);
    config.winLength = config.boardSize;
    config.difficulty = ['medium', 'hard', 'expert'][Math.floor(prng() * 3)];
    config.constraints = {};
    config.aiPersonality = personalities[Math.floor(prng() * personalities.length)];
  }

  return config;
}

import { safeGetItem, STORAGE_KEYS, sanitizeDailyChallenge } from '../services/storageService';

export function isDailyChallengeCompleted(dateStr) {
  try {
    const data = sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, {}));
    if (dateStr && data.history && data.history[dateStr]) {
      return Boolean(data.history[dateStr].completed);
    }
    
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    return Boolean(data.lastCompleted === today);
  } catch {
    return false;
  }
}

export default function DailyChallenge({ onPlayChallenge, onBack, language = 'en' }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [data, setData] = useState(() => {
    return sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, { streak: 0, history: {}, lastCompleted: null }));
  });
  const t = translations[language] || translations.en;
  
  const challenge = getTodaysChallenge();
  const isTr = language === 'tr';

  // Multi-tab real-time synchronization
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEYS.DAILY) {
        setData(sanitizeDailyChallenge(safeGetItem(STORAGE_KEYS.DAILY, { streak: 0, history: {}, lastCompleted: null })));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const int = setInterval(updateTimer, 1000);
    return () => clearInterval(int);
  }, []);

  const completedToday = data.lastCompleted === challenge.date || Boolean(data.history?.[challenge.date]?.completed);

  const handlePlay = (forcePractice = false) => {
    if (typeof playSound === 'function') playSound('click');
    onPlayChallenge(forcePractice || completedToday ? { ...challenge, isPractice: true } : challenge);
  };

  const handleBack = () => {
    if (typeof playSound === 'function') playSound('click');
    onBack();
  };

  const titleKey = `${challenge.dayType}_title`;
  const descKey = `${challenge.dayType}_desc`;

  const historyBlocks = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    
    const isPast = i > 0;
    const isToday = i === 0;
    let status = 'none';
    
    if (data.history && data.history[ds] && data.history[ds].completed) {
      status = 'completed';
    } else if (isPast) {
      status = 'missed';
    }

    historyBlocks.push({
      date: ds,
      status,
      isToday,
      label: d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' })
    });
  }

  const modalContent = (
    <div className="daily-modal-backdrop" onClick={handleBack}>
      <div className="daily-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="daily-header-bar">
          <div className="daily-tag-badge">
            <span className="daily-badge-dot"></span>
            <span>{isTr ? 'GÜNLÜK ETKİNLİK' : 'DAILY EVENT'}</span>
          </div>

          <h2 className="daily-modal-title">{t.title}</h2>
          <p className="daily-modal-subtitle">{t.subtitle}</p>

          <button
            type="button"
            className="daily-modal-close-btn"
            onClick={handleBack}
            aria-label={t.back}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="daily-scroll-area">
          {/* Mission Card */}
          <div className="daily-mission-card">
            <div className="daily-timer-pill">
              <span className="timer-sand">⏳</span>
              <span className="timer-val">{t.nextIn} <strong>{timeLeft}</strong></span>
            </div>

            <div className="mission-content">
              <div className="mission-badge-row">
                <span className="mission-chip board-chip">{challenge.boardSize}x{challenge.boardSize}</span>
                <span className="mission-chip diff-chip">{challenge.difficulty?.toUpperCase()}</span>
                {challenge.constraints?.maxMoves && (
                  <span className="mission-chip constraint-chip">MAX {challenge.constraints.maxMoves} {isTr ? 'HAMLE' : 'MOVES'}</span>
                )}
              </div>

              <h3 className="challenge-headline">{t[titleKey]}</h3>
              <p className="challenge-paragraph">{t[descKey]}</p>

              <div className="reward-glow-badge">
                <span className="reward-gem">💎</span>
                <span className="reward-text">{t.reward}</span>
              </div>
            </div>

            {completedToday ? (
              <div className="completed-action-group">
                <div className="completed-state-banner">
                  <span className="check-icon">✓</span>
                  <div className="completed-text-wrap">
                    <h4>{t.completed}</h4>
                    <p>{isTr ? 'Ödül alındı! Yarın yeni bir taktiksel görev seni bekliyor.' : 'Reward claimed! Return tomorrow for a new tactical challenge.'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="daily-practice-button"
                  onClick={() => handlePlay(true)}
                >
                  🎯 {isTr ? 'Alıştırma Yap (Tekrar Oyna)' : 'Practice Mode (Replay)'}
                </button>
              </div>
            ) : (
              <button type="button" className="daily-cta-button" onClick={() => handlePlay(false)}>
                <span className="cta-glow-pulse"></span>
                <span className="cta-label">⚡ {t.playToday}</span>
              </button>
            )}
          </div>

          {/* Streak Section */}
          <div className="daily-streak-card">
            <div className="streak-title-row">
              <div className="streak-flame-wrap">
                <span className="flame-icon">🔥</span>
                <div className="streak-stat-info">
                  <span className="streak-header-label">{t.streak}</span>
                  <span className="streak-counter-value">{data.streak || 0} {t.days}</span>
                </div>
              </div>

              <span className="streak-sub-info">
                {isTr ? 'Her gün oyna, TP bonusunu katla!' : 'Play daily to stack XP bonuses!'}
              </span>
            </div>

            <div className="daily-timeline-tracker">
              {historyBlocks.map((blk, idx) => (
                <div
                  key={idx}
                  className={`timeline-day ${blk.status} ${blk.isToday ? 'is-current-day' : ''}`}
                  title={`${blk.date}: ${blk.status}`}
                >
                  <span className="timeline-day-label">{blk.label}</span>
                  <div className="timeline-dot-circle">
                    {blk.status === 'completed' && '✓'}
                    {blk.status === 'missed' && '✕'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .daily-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: rgba(3, 6, 15, 0.9);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 16px;
          box-sizing: border-box;
          animation: dailyFadeIn 0.22s ease-out;
        }

        @keyframes dailyFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .daily-modal-card {
          position: relative;
          width: min(560px, 95vw);
          max-height: min(88vh, 720px);
          margin: auto;
          background: linear-gradient(180deg, rgba(20, 24, 38, 0.98) 0%, rgba(11, 14, 25, 0.99) 100%);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          animation: dailyPopUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes dailyPopUp {
          from { transform: scale(0.95) translateY(16px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .daily-header-bar {
          position: relative;
          padding: 22px 24px 16px;
          text-align: center;
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          background: rgba(15, 23, 42, 0.5);
        }

        .daily-tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #fbbf24;
          margin-bottom: 6px;
        }

        .daily-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fbbf24;
          box-shadow: 0 0 6px #fbbf24;
          animation: dailyPulseDot 1.8s infinite;
        }

        @keyframes dailyPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        .daily-modal-title {
          margin: 0;
          font-size: 1.65rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-shadow: 0 0 16px rgba(245, 158, 11, 0.4);
        }

        .daily-modal-subtitle {
          margin: 4px 0 0;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .daily-modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.18s ease;
        }

        .daily-modal-close-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.6);
          color: #ff8888;
          transform: rotate(90deg);
        }

        .daily-scroll-area {
          padding: 20px 24px 28px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(245, 158, 11, 0.4) transparent;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .daily-scroll-area::-webkit-scrollbar {
          width: 6px;
        }
        .daily-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.35);
          border-radius: 3px;
        }

        /* Mission Card */
        .daily-mission-card {
          position: relative;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .daily-timer-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          font-size: 0.8rem;
          color: #cbd5e1;
          margin-bottom: 14px;
        }

        .timer-val strong {
          color: #38bdf8;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .mission-badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .mission-chip {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .board-chip {
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.35);
          color: #38bdf8;
        }

        .diff-chip {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
        }

        .constraint-chip {
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.35);
          color: #c084fc;
        }

        .challenge-headline {
          margin: 0 0 8px;
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
        }

        .challenge-paragraph {
          margin: 0 0 16px;
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.45;
        }

        .reward-glow-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 18px;
        }

        .daily-cta-button {
          position: relative;
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #05070e;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
        }

        .daily-cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(245, 158, 11, 0.6);
        }

        .daily-cta-button:active {
          transform: translateY(0);
        }

        .completed-state-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 14px;
        }

        .check-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #10b981;
          color: #05070e;
          display: grid;
          place-items: center;
          font-size: 1.2rem;
          font-weight: 900;
        }

        .completed-text-wrap h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #34d399;
        }

        .completed-text-wrap p {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .completed-action-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .daily-practice-button {
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(56, 189, 248, 0.4);
          background: rgba(56, 189, 248, 0.12);
          color: #38bdf8;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .daily-practice-button:hover {
          background: rgba(56, 189, 248, 0.25);
          border-color: #38bdf8;
          transform: translateY(-1px);
        }

        /* Streak Card */
        .daily-streak-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 16px 20px;
        }

        .streak-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .streak-flame-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .flame-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
        }

        .streak-stat-info {
          display: flex;
          flex-direction: column;
        }

        .streak-header-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .streak-counter-value {
          font-size: 1.15rem;
          font-weight: 900;
          color: #fbbf24;
        }

        .streak-sub-info {
          font-size: 0.8rem;
          color: #64748b;
        }

        .daily-timeline-tracker {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .timeline-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 8px 4px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.18s ease;
        }

        .timeline-day.is-current-day {
          border-color: rgba(245, 158, 11, 0.5);
          background: rgba(245, 158, 11, 0.08);
        }

        .timeline-day-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .timeline-dot-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.08);
          color: #64748b;
        }

        .timeline-day.completed .timeline-dot-circle {
          background: #10b981;
          color: #05070e;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .timeline-day.missed .timeline-dot-circle {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        @media (max-width: 500px) {
          .daily-header-bar {
            padding: 16px;
          }
          .daily-scroll-area {
            padding: 16px;
          }
          .daily-modal-title {
            font-size: 1.35rem;
          }
          .streak-title-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
