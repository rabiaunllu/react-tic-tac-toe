import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const fallbackGameConfig = {
  boardSize: 3,
  winLength: 3,
  targetValue: 5,
  isInfinite: false,
  opponentType: 'human',
}

const fallbackArenaSettings = {
  powersEnabled: true,
  multipliersEnabled: true,
  boostMode: 'random',
}

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

export default function HowToPlay({
  gameConfig = fallbackGameConfig,
  gameMode = gameConfig.gameMode ?? 'classic',
  arenaSettings = fallbackArenaSettings,
  onClose,
}) {
  const [openSection, setOpenSection] = useState(null)
  const lockedScrollYRef = useRef(null)

  const sections = [
    {
      id: 'basics',
      icon: '🎯',
      title: 'Temel Kurallar',
      content: (
        <>
          <RuleItem icon="🔵" title="Amaç">
            Rakibinizden önce aynı sembolü (X veya O) belirtilen sayıda yan yana,
            sütunda veya çaprazda dizerek kazanın.
          </RuleItem>
          <RuleItem icon="📐" title="Izgara Boyutları">
            3x3 tahtada 3 taş, 4x4 ve 5x5 tahtada 4 taş yan yana kazandırır.
          </RuleItem>
          <RuleItem icon="🔁" title="X / O Rotasyonu">
            Her turda X ve O rolleri otomatik olarak değişir; kimse sürekli
            avantajlı tarafta kalmaz.
          </RuleItem>
          <RuleItem icon="↩️" title="Güçler Sıfırlanır">
            Her yeni tur başlangıcında tüm güçler sıfırdan verilir. Ancak puanlar
            ve tur galibiyet sayısı korunur.
          </RuleItem>
        </>
      ),
    },
    {
      id: 'modes',
      icon: '🏅',
      title: 'Oyun Modları',
      content: (
        <div className="how-to-play-card-grid how-to-play-mode-grid">
          <article className="how-to-play-info-card how-to-play-mode-card">
            <strong>Klasik Mod</strong>
            <ul>
              <li>Tur kazan, skoru artır.</li>
              <li>Hedef tura ilk ulaşan maçı alır.</li>
              <li>3x3, 4x4 ve 5x5 seçenekleriyle oynanır.</li>
              <li>∞ seçilirse maç süresiz devam eder.</li>
            </ul>
          </article>
          <article className="how-to-play-info-card how-to-play-mode-card arena">
            <strong>Arena Modu</strong>
            <ul>
              <li>Çizgideki çarpanlar puana eklenir.</li>
              <li>Güçler oyunun temposunu değiştirir.</li>
              <li>Hedef puana ilk ulaşan maçı alır.</li>
              <li>∞ seçilirse puan birikmeye devam eder.</li>
            </ul>
          </article>
        </div>
      ),
    },
    {
      id: 'powers',
      icon: '⚡',
      title: 'Özel Güçler',
      content: (
        <>
          <RuleItem icon="💣" title="Bomba">
            Rakibinizin taşlarından birini patlat. Korumalı taşlara kullanılamaz.
          </RuleItem>
          <RuleItem icon="🛡️" title="Kalkan">
            Yerleştirdiğin taşı koru. Korumalı taş bombayla patlatılamaz.
          </RuleItem>
          <RuleItem icon="⚡" title="Boost">
            Yerleştirdiğin taşın hücre çarpanını 2 katına çıkarır.
          </RuleItem>
          <RuleItem icon="🕳️" title="Kara Delik">
            Boş bir kareye gizli Kara Delik kur. Rakip oraya taş koyarsa taşı
            anında kaybolur ve sırası geçer. Kara Deliği sadece sen görürsün.
          </RuleItem>
          <div className="locked-power-note">
            <strong>Sürpriz paket güçleri:</strong> Arena PvC’de Joker, Freeze veya
            Vampir seçebilirsin.
          </div>
        </>
      ),
    },
    {
      id: 'multipliers',
      icon: '🔢',
      title: 'Çarpan Sistemi',
      content: (
        <>
          <RuleItem icon="📊" title="Nasıl Çalışır?">
            Her karedeki sayı (2x, 3x, 4x), o karede taşınız varken kazandığınızda
            alacağınız puan çarpanıdır. Kazanan çizgideki tüm çarpanlar toplanır.
          </RuleItem>
          <RuleItem icon="⚡" title="Boost Etkisi">
            1x + 3x + 2x karelerden oluşan bir çizgiyle kazanırsanız 6 puan
            alırsınız. Boost kullandıysanız o kare 2 katına çıkar.
          </RuleItem>
          {gameMode === 'arena' && (
            <div className="how-to-play-state-line">
              Çarpanlar: {arenaSettings.multipliersEnabled ? 'Açık' : 'Kapalı'} ·
              Güçler: {arenaSettings.powersEnabled ? 'Açık' : 'Kapalı'} ·
              Boost: {arenaSettings.boostMode === 'random' ? 'Rastgele' : 'Seçimli'}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'ai',
      icon: '🤖',
      title: 'Yapay Zeka',
      content: (
        <>
          <RuleItem icon="X" title="İnsan Oyuncu">
            PvC modunda insan X olarak oynar.
          </RuleItem>
          <RuleItem icon="O" title="Bilgisayar">
            Bilgisayar O oynar. Klasik modda taş koyar; Arena PvC modunda bomba,
            kalkan, boost ve Kara Delik güçlerini kontrollü şekilde kullanabilir.
          </RuleItem>
        </>
      ),
    },
    {
      id: 'tournament',
      icon: '⚔️',
      title: 'Turnuva Modu',
      content: (
        <>
          <RuleItem icon="🔒" title="Yakında">
            2, 4 veya 6 oyuncu katılabilir. Her oyuncu bir isim alır.
          </RuleItem>
          <RuleItem icon="🎲" title="Takım Ataması">
            Oyuncular rastgele veya manuel olarak Takım A ve Takım B'ye atanır.
            Takımlar eşit sayıda oyuncu içermelidir.
          </RuleItem>
          <RuleItem icon="🔁" title="Maç Rotasyonu">
            Her takımdan karşılıklı oyuncular birbirleriyle oynar. Her çift iki kez
            oynar: bir kez A=X, bir kez B=X olarak. Böylece taraflar adil olur.
          </RuleItem>
          <RuleItem icon="🏆" title="Puanlama">
            Galibiyet = 3 puan, beraberlik = 1 puan, mağlubiyet = 0. En yüksek
            puanlı oyuncu MVP seçilir.
          </RuleItem>
          <RuleItem icon="🎮" title="Cihaz Paylaşımı">
            Her maç öncesi “Cihazı oyuncuya verin” ekranı gösterilir. Bu şekilde
            oyuncular birbirinin stratejisini görmez.
          </RuleItem>
        </>
      ),
    },
    {
      id: 'tips',
      icon: '💡',
      title: 'Strateji İpuçları',
      content: (
        <>
          <RuleItem icon="🎯" title="Tehdit Kontrolü">
            Yüksek çarpanlı kareleri (3x veya 4x) önce kapat ya da rakibini
            oralardan uzak tut.
          </RuleItem>
          <RuleItem icon="⚡" title="Boost Zamanı">
            Boost gücünü 3x kare üzerinde kullanırsan 6x puan alırsın; bu oyun
            belirleyici olabilir.
          </RuleItem>
          <RuleItem icon="💣" title="Bomba">
            Bombayı rakibin kazanacak hamlesini engellemek için kullan. Panikle harcama.
          </RuleItem>
          <RuleItem icon="🛡️" title="Kalkan">
            Kalkanı yüksek çarpanlı bir kare üzerine koy; rakip oraya bomba atamaz.
          </RuleItem>
          <RuleItem icon="🕳️" title="Kara Delik">
            Kara Deliği rakibin en çok tercih ettiği yüksek çarpanlı kareye kur;
            fark etmeden basarsa sırası boşa gider.
          </RuleItem>
          <RuleItem icon="🔁" title="X/O Değişimi">
            X/O değişimini unutma; bir sonraki turda hangi tarafta olacağını hesapla.
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
            <span className="eyebrow">KURALLAR</span>
            <h2 id="how-to-play-title">Nasıl Oynanır?</h2>
          </div>

          <button type="button" className="panel-close-button" onClick={onClose}>
            Kapat
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
            <h3>Hızlı Başvuru</h3>
            <div className="quick-reference-list">
              <QuickReferencePower icon="💣" title="Bomba" description="Korumasız bir taşı kaldırır." />
              <QuickReferencePower icon="🛡️" title="Kalkan" description="Kendi taşını korur. (Hamle hakkın devam eder)" />
              <QuickReferencePower icon="⚡" title="Boost" description="Hücre puanını iki katına çıkarır. (Hamle hakkın devam eder)" />
              <QuickReferencePower icon="🕳️" title="Kara Delik" description="Rakibin taşı koyunca kaybolur ve sırası geçer." />
              <span className="quick-reference-break" aria-hidden="true" />
              <QuickReferencePower icon="🃏" title="Joker" description="Rakibin taşını kendi taşına çevirir." />
              <QuickReferencePower icon="❄️" title="Freeze" description="Boş kareyi kilitler. (Hamle hakkın devam eder)" />
              <QuickReferencePower icon="🧛" title="Vampir" description="Rakibin çarpanını aktarır. (Hamle hakkın devam eder)" />
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}
