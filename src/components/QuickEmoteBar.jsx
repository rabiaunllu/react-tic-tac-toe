import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../i18n'
import { registerUserGesture } from '../game/soundManager'
import { EMOTE_MAP, EMOTE_LIST } from '../game/emotes'

export default function QuickEmoteBar({ onSendEmote, disabled = false, cooldownMs = 2000 }) {
  const { t } = useTranslation();
  const [isCooldown, setIsCooldown] = useState(false);
  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  function handleEmoteClick(emoteId) {
    if (isCooldown || disabled) return;
    registerUserGesture();
    // Assuming playSound might be used here eventually or registerUserGesture is enough
    onSendEmote(emoteId);
    setIsCooldown(true);
    cooldownTimerRef.current = setTimeout(() => {
      setIsCooldown(false);
    }, cooldownMs);
  }

  return (
    <div className={`quick-emote-bar ${disabled ? 'quick-emote-bar--disabled' : ''}`}>
      {EMOTE_LIST.map((emoteId) => {
        const emote = EMOTE_MAP[emoteId];
        return (
          <button
            key={emoteId}
            type="button"
            className={`quick-emote-btn ${isCooldown ? 'quick-emote-btn--cooldown' : ''}`}
            onClick={() => handleEmoteClick(emoteId)}
            disabled={isCooldown || disabled}
            title={t(`emotes.${emoteId}`)}
            aria-label={t(`emotes.${emoteId}`)}
          >
            <span className="quick-emote-btn-emoji" aria-hidden="true">{emote.emoji}</span>
            {isCooldown && <span className="quick-emote-cooldown-ring" />}
          </button>
        );
      })}
    </div>
  );
}
