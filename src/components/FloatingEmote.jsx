import { useTranslation } from '../i18n'
import { EMOTE_MAP } from '../game/emotes'

export default function FloatingEmote({ emoteId, senderSymbol, onComplete, position }) {
  const { t } = useTranslation();
  const emoteData = EMOTE_MAP[emoteId] || EMOTE_MAP['gg'];

  return (
    <div
      className={`floating-emote-bubble floating-emote-bubble--${senderSymbol.toLowerCase()} floating-emote-bubble--${position}`}
      onAnimationEnd={onComplete}
      role="status"
      aria-live="polite"
    >
      <span className="floating-emote-emoji" aria-hidden="true">{emoteData.emoji}</span>
      <span className="floating-emote-text">{t(`emotes.${emoteId}`)}</span>
    </div>
  );
}
