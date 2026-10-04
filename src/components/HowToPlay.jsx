import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../i18n'
import PowerSimulation from './PowerSimulation'

function RuleItem({ icon, title, children }) {
  return (
    <div className="accordion-rule-item">
      <span className="accordion-rule-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

function QuickReferencePower({ icon, title, description }) {
  return (
    <span
      className="quick-reference-item"
      tabIndex="0"
      aria-label={`${title}: ${description}`}
      data-description={description}
    >
      {icon} {title}
    </span>
  )
}

export default function HowToPlay({ onClose }) {
  const { t, language } = useTranslation()
  const isTr = language === 'tr'
  const [openSection, setOpenSection] = useState(null)
  const lockedScrollYRef = useRef(null)

  const sections = [
    {
      id: 'basics',
      icon: '🎯',
      title: t('rules.basicsTitle'),
      content: (
        <>
          <RuleItem icon="🔵" title={t('rules.basics.goalTitle')}>
            {t('rules.basics.goalDesc')}
          </RuleItem>
          <RuleItem icon="📐" title={t('rules.basics.gridTitle')}>
            {t('rules.basics.gridDesc')}
          </RuleItem>
          <RuleItem icon="🔁" title={t('rules.basics.rotationTitle')}>
            {t('rules.basics.rotationDesc')}
          </RuleItem>
          <RuleItem icon="↩️" title={t('rules.basics.resetTitle')}>
            {t('rules.basics.resetDesc')}
          </RuleItem>
        </>
      ),
    },
    {
      id: 'modes',
      icon: '🏅',
      title: t('rules.modesTitle'),
      content: (
        <div className="how-to-play-card-grid how-to-play-mode-grid">
          <article className="how-to-play-info-card how-to-play-mode-card">
            <strong>{t('rules.modes.classicTitle')}</strong>
            <ul>
              <li>{t('rules.modes.classic1')}</li>
              <li>{t('rules.modes.classic2')}</li>
              <li>{t('rules.modes.classic3')}</li>
              <li>{t('rules.modes.classic4')}</li>
            </ul>
          </article>
          <article className="how-to-play-info-card how-to-play-mode-card arena">
            <strong>{t('rules.modes.arenaTitle')}</strong>
            <ul>
              <li>{t('rules.modes.arena1')}</li>
              <li>{t('rules.modes.arena2')}</li>
              <li>{t('rules.modes.arena3')}</li>
              <li>{t('rules.modes.arena4')}</li>
            </ul>
          </article>
        </div>
      ),
    },
    {
      id: 'powers',
      icon: '⚡',
      title: t('rules.powersTitle'),
      content: (
        <>
          <PowerSimulation />
          <RuleItem icon="💣" title={t('rules.powers.bombTitle')}>
            {t('rules.powers.bombDesc')}
          </RuleItem>
          <RuleItem icon="🛡️" title={t('rules.powers.shieldTitle')}>
            {t('rules.powers.shieldDesc')}
          </RuleItem>
          <RuleItem icon="🕳️" title={t('rules.powers.trapTitle')}>
            {t('rules.powers.trapDesc')}
          </RuleItem>
          <RuleItem icon="❄️" title={t('rules.powers.freezeTitle')}>
            {t('rules.powers.freezeDesc')}
          </RuleItem>
          <RuleItem icon="🧛" title={t('rules.powers.vampireTitle')}>
            {t('rules.powers.vampireDesc')}
          </RuleItem>
        </>
      ),
    },
    {
      id: 'tactics',
      icon: '💡',
      title: t('rules.tacticsTitle'),
      content: (
        <>
          <RuleItem icon="🎯" title={t('rules.tactics.tip1Title')}>
            {t('rules.tactics.tip1Desc')}
          </RuleItem>
          <RuleItem icon="🛡️" title={t('rules.tactics.tip2Title')}>
            {t('rules.tactics.tip2Desc')}
          </RuleItem>
          <RuleItem icon="✨" title={t('rules.tactics.tip3Title')}>
            {t('rules.tactics.tip3Desc')}
          </RuleItem>
        </>
      ),
    },
  ]

  useEffect(() => {
    if (lockedScrollYRef.current === null) {
      lockedScrollYRef.current = window.scrollY
    }

    const scrollY = lockedScrollYRef.current
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousWidth = document.body.style.width
    const previousDocumentOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.width = previousWidth
      document.documentElement.style.overflow = previousDocumentOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.scrollTo(0, scrollY)
    }
  }, [onClose])

  return createPortal(
    <div className="how-to-play-modal" role="presentation" onClick={onClose}>
      <div
        className="how-to-play-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="how-to-play-header">
          <div>
            <span className="eyebrow">{isTr ? 'KURALLAR' : 'RULES'}</span>
            <h2 id="how-to-play-title">{t('rules.title')}</h2>
          </div>

          <button
            type="button"
            className="panel-close-button"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="how-to-play-content">
          <div className="how-to-play-accordion">
            {sections.map((section) => {
              const isOpen = openSection === section.id

              return (
                <section
                  key={section.id}
                  className={`accordion-section ${isOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="accordion-trigger"
                    aria-expanded={isOpen}
                    aria-controls={`how-to-play-${section.id}`}
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                  >
                    <span className="accordion-title">
                      <span aria-hidden="true">{section.icon}</span>
                      {section.title}
                    </span>
                    <span className="accordion-caret" aria-hidden="true">▾</span>
                  </button>

                  {isOpen && (
                    <div
                      id={`how-to-play-${section.id}`}
                      className="accordion-content"
                    >
                      {section.content}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <section className="rule-section quick-reference">
            <h3>{isTr ? 'Hızlı Başvuru' : 'Quick Reference'}</h3>
            <div className="quick-reference-list">
              <QuickReferencePower icon="💣" title={t('powers.bomb.name')} description={t('powers.bomb.desc')} />
              <QuickReferencePower icon="🛡️" title={t('powers.shield.name')} description={t('powers.shield.desc')} />
              <QuickReferencePower icon="🕳️" title={t('powers.trap.name')} description={t('powers.trap.desc')} />
              <QuickReferencePower icon="❄️" title={t('powers.freeze.name')} description={t('powers.freeze.desc')} />
              <QuickReferencePower icon="🧛" title={t('powers.vampire.name')} description={t('powers.vampire.desc')} />
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}
