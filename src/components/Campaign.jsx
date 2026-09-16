import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { chapters, getLevelById } from '../game/levels';
import { loadProgress, getLevelForXP } from '../game/progression';
import { playSound } from '../game/soundManager';
import { safeGetItem, STORAGE_KEYS, sanitizeCampaignProgress } from '../services/storageService';

export default function Campaign({ onPlayLevel, onBack, language }) {
  const isTr = language === 'tr';
  const t = (en, tr) => (isTr ? tr : en);
  const tObj = (obj) => (obj ? (isTr ? obj.tr : obj.en) : '');

  const [expandedChapter, setExpandedChapter] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [campaignProgress, setCampaignProgress] = useState(() => {
    return sanitizeCampaignProgress(safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} }));
  });
  const [xpLevel, setXpLevel] = useState(() => {
    try {
      const progress = loadProgress();
      return progress.level || getLevelForXP(progress.totalXP || 0);
    } catch (error) {
      console.error('Failed to load progression', error);
      return 1;
    }
  });

  // Multi-tab real-time synchronization
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEYS.CAMPAIGN) {
        setCampaignProgress(sanitizeCampaignProgress(safeGetItem(STORAGE_KEYS.CAMPAIGN, { completedLevels: {} })));
      }
      if (!e.key || e.key === 'xo-tactix-progress' || e.key === STORAGE_KEYS.PROGRESSION) {
        const prog = loadProgress();
        setXpLevel(prog.level || getLevelForXP(prog.totalXP || 0));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedLevel) {
          setSelectedLevel(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLevel, onBack]);

  const totalPossibleStars = 30 * 3;
  const collectedStars = Object.values(campaignProgress.completedLevels || {}).reduce(
    (sum, lvl) => sum + (lvl.stars || 0),
    0
  );

  const isLevelUnlocked = (levelId) => {
    if (levelId === 1) return true;
    const level = getLevelById(levelId);
    if (!level || !level.unlockCondition) return true;

    if (level.unlockCondition.type === 'level_complete') {
      const reqId = level.unlockCondition.value;
      return campaignProgress.completedLevels?.[reqId] !== undefined;
    }
    return true;
  };

  const handleLevelClick = (levelId) => {
    if (!isLevelUnlocked(levelId)) {
      if (typeof playSound === 'function') playSound('error');
      return;
    }
    if (typeof playSound === 'function') playSound('click');
    const level = getLevelById(levelId);
    setSelectedLevel(level);
  };

  const handlePlay = () => {
    if (selectedLevel) {
      if (typeof playSound === 'function') playSound('click');
      onPlayLevel(selectedLevel);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return { label: t('EASY', 'KOLAY'), color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
      case 'medium':
        return { label: t('MEDIUM', 'ORTA'), color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)', border: 'rgba(0, 240, 255, 0.4)' };
      case 'hard':
        return { label: t('HARD', 'ZOR'), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
      case 'expert':
        return { label: t('EXPERT', 'UZMAN'), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.5)' };
      default:
        return { label: t('NORMAL', 'NORMAL'), color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)', border: 'rgba(0, 240, 255, 0.4)' };
    }
  };

  const modalContent = (
    <div className="campaign-modal-backdrop" onClick={onBack}>
      <div className="campaign-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="campaign-top-bar">
          <div className="campaign-title-block">
            <span className="campaign-badge">🧩 {t('PUZZLE QUEST', 'BULMACA SEFERİ')}</span>
            <h2 className="campaign-main-title">{t('Tactical Conquest', 'Taktiksel Sefer')}</h2>
          </div>

          <div className="campaign-stats-group">
            <div className="campaign-stat-pill xp-pill" title={t('Account Rank (Earned with XP)', 'Hesap Rütbesi (Kazanılan TP ile artar)')}>
              <span className="pill-icon">⚡</span>
              <span className="pill-val">{isTr ? `RÜTBE ${xpLevel}` : `RANK ${xpLevel}`}</span>
            </div>
            <div className="campaign-stat-pill star-pill" title={t('Total Stars Collected', 'Kazanılan Yıldızlar')}>
              <span className="pill-icon">⭐</span>
              <span className="pill-val">{collectedStars} / {totalPossibleStars}</span>
            </div>
          </div>

          <button
            type="button"
            className="campaign-close-btn"
            onClick={onBack}
            aria-label={t('Close', 'Kapat')}
          >
            ✕
          </button>
        </header>

        {/* Scrollable Chapters Area */}
        <div className="campaign-scroll-body">
          <p className="campaign-subtext">
            {t(
              'Conquer handcrafted puzzle battles, master special powers, and collect stars to level up.',
              'Özel bulmaca savaşlarını tamamla, güçleri ustalıkla kullan ve seviye atlamak için yıldızları topla.'
            )}
          </p>

          <div className="chapters-container">
            {chapters.map((chapter) => {
              const isExpanded = expandedChapter === chapter.id;

              let chapterCompletedStars = 0;
              const chapterTotalStars = chapter.levels.length * 3;

              chapter.levels.forEach((lvlId) => {
                const prog = campaignProgress.completedLevels?.[lvlId];
                if (prog) chapterCompletedStars += (prog.stars || 0);
              });

              const progressPercent = Math.min(100, Math.round((chapterCompletedStars / chapterTotalStars) * 100));
              const isAllCompleted = chapterCompletedStars === chapterTotalStars;

              return (
                <div key={chapter.id} className={`chapter-card ${isExpanded ? 'is-expanded' : ''}`}>
                  <button
                    type="button"
                    className="chapter-header-btn"
                    onClick={() => {
                      if (typeof playSound === 'function') playSound('click');
                      setExpandedChapter(isExpanded ? null : chapter.id);
                    }}
                  >
                    <div className="chapter-icon-wrap">{chapter.icon}</div>

                    <div className="chapter-meta">
                      <div className="chapter-num">{t(`CHAPTER ${chapter.id}`, `BÖLÜM ${chapter.id}`)}</div>
                      <h3 className="chapter-name">{tObj(chapter.title)}</h3>
                    </div>

                    <div className="chapter-star-counter">
                      <span className="chapter-star-text">
                        {chapterCompletedStars}/{chapterTotalStars} ⭐
                      </span>
                      <div className="chapter-progress-track">
                        <div
                          className={`chapter-progress-bar ${isAllCompleted ? 'is-gold' : ''}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <span className={`chapter-caret ${isExpanded ? 'rotated' : ''}`}>▾</span>
                  </button>

                  {isExpanded && (
                    <div className="chapter-levels-grid">
                      {chapter.levels.map((levelId) => {
                        const levelData = getLevelById(levelId);
                        const isUnlocked = isLevelUnlocked(levelId);
                        const prog = campaignProgress.completedLevels?.[levelId];
                        const stars = prog ? prog.stars : 0;
                        const badge = getDifficultyBadge(levelData?.difficulty);

                        return (
                          <button
                            key={levelId}
                            type="button"
                            className={`level-card-btn ${!isUnlocked ? 'is-locked' : ''} ${stars > 0 ? 'is-beaten' : ''}`}
                            onClick={() => handleLevelClick(levelId)}
                            disabled={!isUnlocked}
                          >
                            <span
                              className="level-difficulty-tag"
                              style={{ color: badge.color, backgroundColor: badge.bg, borderColor: badge.border }}
                            >
                              {badge.label}
                            </span>

                            <div className="level-number-display">
                              {isUnlocked ? levelId : '🔒'}
                            </div>

                            <div className="level-stars-row">
                              {[1, 2, 3].map((starIdx) => (
                                <span
                                  key={starIdx}
                                  className={`star-symbol ${starIdx <= stars ? 'is-filled' : 'is-empty'}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Level Detail Popup / Action Sheet - Rendered outside container to avoid transform clipping */}
      {selectedLevel && (
        <div className="level-popup-backdrop" onClick={() => setSelectedLevel(null)}>
          <div className="level-popup-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="level-popup-close"
              onClick={() => setSelectedLevel(null)}
              aria-label={t('Close', 'Kapat')}
            >
              ✕
            </button>

            <div className="level-popup-header">
              <span
                className="level-popup-difficulty"
                style={{
                  color: getDifficultyBadge(selectedLevel.difficulty).color,
                  borderColor: getDifficultyBadge(selectedLevel.difficulty).border,
                  backgroundColor: getDifficultyBadge(selectedLevel.difficulty).bg,
                }}
              >
                {getDifficultyBadge(selectedLevel.difficulty).label} • {selectedLevel.boardSize}x{selectedLevel.boardSize}
              </span>
              <h3 className="level-popup-title">
                #{selectedLevel.id} {tObj(selectedLevel.title)}
              </h3>
              <p className="level-popup-desc">{tObj(selectedLevel.description)}</p>
            </div>

            <div className="level-conditions-box">
              <div className="conditions-title">{t('Star Objectives', 'Yıldız Hedefleri')}</div>
              <div className="condition-row">
                <span className="cond-star">★☆☆</span>
                <span className="cond-desc">
                  {selectedLevel.type === 'puzzle'
                    ? t('Puzzle: Solve the board', 'Bulmaca: Tahtayı çöz')
                    : t('Victory: Complete the match', 'Zafer: Maçı tamamlayıp kazan')}
                </span>
              </div>
              {selectedLevel.stars?.two && (
                <div className="condition-row">
                  <span className="cond-star">★★☆</span>
                  <span className="cond-desc">
                    {selectedLevel.stars.two.condition === 'win_in_moves'
                      ? (selectedLevel.stars.two.value === 1
                          ? t('Sharp mind: Win in 1 move', 'Keskin zeka: Tek hamlede kazan')
                          : t(`Win in ${selectedLevel.stars.two.value} moves or less`, `En fazla ${selectedLevel.stars.two.value} hamlede kazan`))
                      : selectedLevel.stars.two.condition === 'power_used'
                      ? t(`Win using ${selectedLevel.stars.two.value} power`, `${selectedLevel.stars.two.value} gücünü kullanarak kazan`)
                      : selectedLevel.stars.two.condition === 'score_above'
                      ? t('Win with 2x multiplier', '2x Çarpanla kazan')
                      : selectedLevel.type === 'puzzle'
                      ? t('Tactical eye: Find the winning line', 'Taktiksel göz: Kazandıran hamleyi bul')
                      : t('Tactical mastery objective', 'Taktiksel ustalık hedefi')}
                  </span>
                </div>
              )}
              {selectedLevel.stars?.three && (
                <div className="condition-row">
                  <span className="cond-star">★★★</span>
                  <span className="cond-desc">
                    {selectedLevel.stars.three.condition === 'win_in_moves'
                      ? (selectedLevel.stars.three.value === 1
                          ? t('Checkmate: Win in 1 move', 'Şah Mat: Tek hamlede bitir')
                          : t(`Speed master: Win in ${selectedLevel.stars.three.value} moves or less`, `Hız ustası: En fazla ${selectedLevel.stars.three.value} hamlede kazan`))
                      : selectedLevel.stars.three.condition === 'score_above'
                      ? t('Win with 3x multiplier', '3x Çarpanla kazan')
                      : t('Grandmaster objective', 'Büyük usta hedefi')}
                  </span>
                </div>
              )}
            </div>

            {selectedLevel.reward && (
              <div className="level-reward-row">
                <span className="reward-icon">🎁</span>
                <span className="reward-info">
                  {t('Reward:', 'Ödül:')}{' '}
                  <strong>
                    {selectedLevel.reward.type === 'skin'
                      ? (isTr ? `Tema: ${selectedLevel.reward.value.toUpperCase()}` : `Theme: ${selectedLevel.reward.value.toUpperCase()}`)
                      : selectedLevel.reward.type === 'power'
                      ? (isTr ? `Güç: ${selectedLevel.reward.value.toUpperCase()}` : `Power: ${selectedLevel.reward.value.toUpperCase()}`)
                      : `+${selectedLevel.reward.value} XP`}
                  </strong>
                </span>
              </div>
            )}

            {campaignProgress.completedLevels?.[selectedLevel.id] && (
              <div className="best-score-banner">
                <span>🏆 {t('Current Best:', 'En İyi Derecen:')}</span>
                <strong>{campaignProgress.completedLevels[selectedLevel.id].stars} / 3 ⭐</strong>
              </div>
            )}

            <button type="button" className="launch-mission-btn" onClick={handlePlay}>
              <span className="launch-glow" />
              <span className="launch-text">⚡ {t('START BATTLE', 'SAVAŞA BAŞLA')}</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .campaign-modal-backdrop {
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
          animation: campaignFadeIn 0.22s ease-out;
        }

        @keyframes campaignFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .campaign-modal-container {
          position: relative;
          width: min(720px, 95vw);
          max-height: min(88vh, 760px);
          margin: auto;
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 14, 26, 0.99) 100%);
          border: 1px solid rgba(168, 85, 247, 0.35);
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          animation: campaignPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes campaignPopUp {
          from { transform: scale(0.95) translateY(16px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .campaign-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(0, 240, 255, 0.15);
          background: rgba(15, 23, 42, 0.6);
          gap: 12px;
        }

        .campaign-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #a855f7;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .campaign-main-title {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
        }

        .campaign-stats-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
        }

        .campaign-stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
          border: 1px solid;
        }

        .xp-pill {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.4);
          color: #c084fc;
        }

        .star-pill {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.4);
          color: #fbbf24;
        }

        .campaign-close-btn {
          width: 34px;
          height: 34px;
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

        .campaign-close-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.6);
          color: #ff8888;
          transform: rotate(90deg);
        }

        .campaign-scroll-body {
          padding: 20px 24px 28px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 240, 255, 0.4) transparent;
        }

        .campaign-scroll-body::-webkit-scrollbar {
          width: 6px;
        }
        .campaign-scroll-body::-webkit-scrollbar-thumb {
          background: rgba(0, 240, 255, 0.35);
          border-radius: 3px;
        }

        .campaign-subtext {
          margin: 0 0 16px;
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.45;
        }

        .chapters-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chapter-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .chapter-card.is-expanded {
          border-color: rgba(0, 240, 255, 0.45);
          box-shadow: 0 0 24px rgba(0, 240, 255, 0.1);
        }

        .chapter-header-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: background 0.18s;
        }

        .chapter-header-btn:hover {
          background: rgba(0, 240, 255, 0.05);
        }

        .chapter-icon-wrap {
          font-size: 1.6rem;
          line-height: 1;
          filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
        }

        .chapter-meta {
          flex: 1;
          min-width: 0;
        }

        .chapter-num {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #38bdf8;
          text-transform: uppercase;
        }

        .chapter-name {
          margin: 2px 0 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chapter-star-counter {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .chapter-star-text {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fbbf24;
        }

        .chapter-progress-track {
          width: 80px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .chapter-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #00f0ff, #38bdf8);
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .chapter-progress-bar.is-gold {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
        }

        .chapter-caret {
          font-size: 1.1rem;
          color: #64748b;
          transition: transform 0.22s ease;
        }

        .chapter-caret.rotated {
          transform: rotate(180deg);
          color: #00f0ff;
        }

        .chapter-levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
          padding: 14px 18px 18px;
          background: rgba(4, 6, 14, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .level-card-btn {
          position: relative;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 14px 8px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .level-card-btn:hover:not(:disabled) {
          border-color: #00f0ff;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 240, 255, 0.2);
          background: rgba(30, 41, 59, 0.85);
        }

        .level-card-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          filter: grayscale(80%);
        }

        .level-card-btn.is-beaten {
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.05);
        }

        .level-difficulty-tag {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 8px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 6px;
          border: 1px solid;
          letter-spacing: 0.5px;
        }

        .level-number-display {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
          margin: 6px 0 4px;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
        }

        .level-stars-row {
          display: flex;
          gap: 2px;
          font-size: 0.95rem;
        }

        .star-symbol.is-filled {
          color: #fbbf24;
          filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.9));
        }

        .star-symbol.is-empty {
          color: rgba(255, 255, 255, 0.18);
        }

        /* Popup Sub-modal */
        .level-popup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10001;
          display: grid;
          place-items: center;
          background: rgba(2, 4, 12, 0.85);
          backdrop-filter: blur(10px);
          padding: 16px;
          animation: campaignFadeIn 0.18s ease-out;
        }

        .level-popup-card {
          position: relative;
          width: min(440px, 94vw);
          margin: auto;
          background: #0f172a;
          border: 1.5px solid #a855f7;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(168, 85, 247, 0.3);
          animation: campaignPopUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .level-popup-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .level-popup-header {
          margin-bottom: 16px;
        }

        .level-popup-difficulty {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 8px;
          border: 1px solid;
          margin-bottom: 8px;
        }

        .level-popup-title {
          margin: 0 0 6px;
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
        }

        .level-popup-desc {
          margin: 0;
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .level-conditions-box {
          background: rgba(0, 240, 255, 0.05);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .conditions-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #38bdf8;
          margin-bottom: 8px;
        }

        .condition-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          margin-bottom: 6px;
        }

        .condition-row:last-child {
          margin-bottom: 0;
        }

        .cond-star {
          font-size: 0.85rem;
          color: #fbbf24;
          font-weight: 700;
          min-width: 36px;
        }

        .cond-desc {
          color: #e2e8f0;
        }

        .level-reward-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.35);
          border-radius: 10px;
          font-size: 0.85rem;
          color: #c084fc;
          margin-bottom: 12px;
        }

        .level-reward-row strong {
          color: #f8fafc;
        }

        .best-score-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 10px;
          font-size: 0.85rem;
          color: #fbbf24;
          margin-bottom: 16px;
        }

        .launch-mission-btn {
          position: relative;
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #00f0ff 0%, #0284c7 100%);
          color: #030712;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.4);
        }

        .launch-mission-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(0, 240, 255, 0.6);
        }

        .launch-mission-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 500px) {
          .campaign-top-bar {
            padding: 14px 16px;
          }
          .campaign-scroll-body {
            padding: 16px;
          }
          .chapter-levels-grid {
            grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
            gap: 8px;
            padding: 10px;
          }
          .level-number-display {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
