/**
 * High-Resolution HTML5 Canvas Viral Victory & Duel Card Generator
 * Produces an elite 1200x630 Esports-grade Social Share Card
 * for Instagram Stories, WhatsApp, Discord, TikTok and Twitter.
 * Zero external libraries, 100% lightweight native Canvas API.
 */

export function generateVictoryCardCanvas({
  winner,
  winningSymbol,
  isDraw,
  isMatchOver,
  p1Name = 'Player 1',
  p2Name = 'Player 2',
  p1Score = 0,
  p2Score = 0,
  gameMode = 'arena',
  boardSize = 3,
  winStreak = 0,
  isTr = true,
}) {
  const width = 1200
  const height = 630
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const isXWinner = winningSymbol?.toUpperCase() === 'X'
  const isOWinner = winningSymbol?.toUpperCase() === 'O'

  // Primary accent colors
  const cyan = '#6ee7ff'
  const pink = '#ff7ab6'
  const gold = '#ffd166'
  const orange = '#ff7b54'

  const winnerColor = isDraw ? gold : isXWinner ? cyan : isOWinner ? pink : gold

  // 1. Deep Space Cyberpunk Background
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 700)
  bgGrad.addColorStop(0, '#11192e')
  bgGrad.addColorStop(0.5, '#090d18')
  bgGrad.addColorStop(1, '#04060b')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // 2. Dynamic Radial Winner Spotlight from Top/Center
  const spotGrad = ctx.createRadialGradient(width / 2, 180, 20, width / 2, 220, 420)
  spotGrad.addColorStop(0, isXWinner ? 'rgba(110, 231, 255, 0.18)' : isOWinner ? 'rgba(255, 122, 182, 0.18)' : 'rgba(255, 209, 102, 0.18)')
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = spotGrad
  ctx.fillRect(0, 0, width, height)

  // 3. Subtle Cybernetic Tech Grid
  ctx.strokeStyle = 'rgba(110, 231, 255, 0.04)'
  ctx.lineWidth = 1
  const gridSize = 48
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // 4. Outer Neon Cyber Frame & Corner Brackets
  ctx.strokeStyle = 'rgba(202, 218, 255, 0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, width - 56, height - 56)

  // Gold Corner brackets
  ctx.strokeStyle = gold
  ctx.shadowColor = gold
  ctx.shadowBlur = 12
  ctx.lineWidth = 4
  const cornerSize = 34
  // Top-left
  ctx.beginPath()
  ctx.moveTo(24, 24 + cornerSize)
  ctx.lineTo(24, 24)
  ctx.lineTo(24 + cornerSize, 24)
  ctx.stroke()
  // Top-right
  ctx.beginPath()
  ctx.moveTo(width - 24 - cornerSize, 24)
  ctx.lineTo(width - 24, 24)
  ctx.lineTo(width - 24, 24 + cornerSize)
  ctx.stroke()
  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(24, height - 24 - cornerSize)
  ctx.lineTo(24, height - 24)
  ctx.lineTo(24 + cornerSize, height - 24)
  ctx.stroke()
  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(width - 24 - cornerSize, height - 24)
  ctx.lineTo(width - 24, height - 24)
  ctx.lineTo(width - 24, height - 24 - cornerSize)
  ctx.stroke()
  ctx.shadowBlur = 0

  // 5. Header Brand Logo
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Brand Logo: XO TACTIX
  ctx.font = '900 42px "Orbitron", "Inter", system-ui, sans-serif'
  ctx.fillStyle = gold
  ctx.shadowColor = 'rgba(255, 209, 102, 0.9)'
  ctx.shadowBlur = 18
  ctx.fillText('⚡ XO TACTIX ⚡', width / 2, 44)
  ctx.shadowBlur = 0

  // Mode & Board Pill Badge
  const modeName = gameMode === 'arena'
    ? (isTr ? `SÜPER GÜÇLÜ ARENA (${boardSize}x${boardSize})` : `POWER ARENA (${boardSize}x${boardSize})`)
    : (isTr ? `KLASİK DÜELLO (${boardSize}x${boardSize})` : `CLASSIC DUEL (${boardSize}x${boardSize})`)
  
  ctx.font = '700 15px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(202, 218, 255, 0.75)'
  ctx.fillText(modeName, width / 2, 96)

  // 6. Main Hero Victory / Result Title
  const heroTitle = isDraw
    ? (isTr ? '🤝 DOSTLUK KAZANDI (BERABERE)' : '🤝 EPIC DRAW!')
    : isMatchOver
      ? (isTr ? `🏆 ${winner || 'ŞAMPİYON'} KAZANDI! 🏆` : `🏆 ${winner || 'CHAMPION'} WINS! 🏆`)
      : (isTr ? `⚡ ${winner || 'OYUNCU'} TURU ALDI!` : `⚡ ${winner || 'PLAYER'} TOOK THE ROUND!`)

  ctx.font = '900 38px "Orbitron", "Inter", system-ui, sans-serif'
  ctx.fillStyle = winnerColor
  ctx.shadowColor = winnerColor
  ctx.shadowBlur = 25
  ctx.fillText(heroTitle, width / 2, 136)
  ctx.shadowBlur = 0

  // 7. Unified Esports Scoreboard Stage (No Overlapping!)
  const stageX = 140
  const stageY = 205
  const stageW = 920
  const stageH = 220

  // Stage glass container
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
  ctx.beginPath()
  ctx.roundRect(stageX, stageY, stageW, stageH, 22)
  ctx.fill()

  // Stage subtle glow border
  ctx.strokeStyle = 'rgba(202, 218, 255, 0.18)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Left Player Side (P1 - Cyan)
  const p1CenterX = stageX + 220

  // P1 Crown if Winner
  if (isXWinner && !isDraw) {
    ctx.font = '32px system-ui, sans-serif'
    ctx.fillText('👑', p1CenterX, stageY + 14)
  }

  // P1 Badge & Name
  ctx.font = '800 24px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = cyan
  ctx.fillText(`[X] ${trimName(p1Name, 13)}`, p1CenterX, stageY + 54)

  // P1 Score (Huge Neon Number)
  ctx.font = '900 84px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = cyan
  ctx.shadowColor = 'rgba(110, 231, 255, 0.8)'
  ctx.shadowBlur = 24
  ctx.fillText(String(p1Score), p1CenterX, stageY + 98)
  ctx.shadowBlur = 0

  // Center VS Emblem (Precisely isolated in the middle)
  const vsX = width / 2
  const vsY = stageY + stageH / 2

  // Center divider line
  ctx.strokeStyle = 'rgba(202, 218, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(vsX, stageY + 20)
  ctx.lineTo(vsX, stageY + stageH - 20)
  ctx.stroke()

  // VS Circular Glow Badge
  ctx.fillStyle = '#182033'
  ctx.beginPath()
  ctx.arc(vsX, vsY, 36, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = '900 24px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = gold
  ctx.shadowColor = 'rgba(255, 209, 102, 0.8)'
  ctx.shadowBlur = 10
  ctx.textBaseline = 'middle'
  ctx.fillText('VS', vsX, vsY + 2)
  ctx.shadowBlur = 0
  ctx.textBaseline = 'top'

  // Right Player Side (P2 - Pink)
  const p2CenterX = stageX + stageW - 220

  // P2 Crown if Winner
  if (isOWinner && !isDraw) {
    ctx.font = '32px system-ui, sans-serif'
    ctx.fillText('👑', p2CenterX, stageY + 14)
  }

  // P2 Badge & Name
  ctx.font = '800 24px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = pink
  ctx.fillText(`[O] ${trimName(p2Name, 13)}`, p2CenterX, stageY + 54)

  // P2 Score (Huge Neon Number)
  ctx.font = '900 84px "Orbitron", system-ui, sans-serif'
  ctx.fillStyle = pink
  ctx.shadowColor = 'rgba(255, 122, 182, 0.8)'
  ctx.shadowBlur = 24
  ctx.fillText(String(p2Score), p2CenterX, stageY + 98)
  ctx.shadowBlur = 0

  // 8. Win Streak Ribbon (If Streak > 1)
  if (winStreak > 1) {
    const streakY = 445
    const streakText = isTr ? `🔥 ${winStreak} MAÇLIK YENİLMEZLİK SERİSİ! 🔥` : `🔥 ${winStreak} WIN STREAK ON FIRE! 🔥`

    ctx.fillStyle = 'rgba(255, 123, 84, 0.16)'
    ctx.beginPath()
    ctx.roundRect(width / 2 - 260, streakY, 520, 42, 21)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 123, 84, 0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.font = '800 18px "Orbitron", system-ui, sans-serif'
    ctx.fillStyle = orange
    ctx.shadowColor = 'rgba(255, 123, 84, 0.7)'
    ctx.shadowBlur = 12
    ctx.fillText(streakText, width / 2, streakY + 11)
    ctx.shadowBlur = 0
  }

  // 9. Viral Challenge Call To Action Banner (Centered, Beautiful, No HTML jargon!)
  const ctaY = winStreak > 1 ? 515 : 475
  const ctaW = 760
  const ctaH = 56
  const ctaX = width / 2 - ctaW / 2

  // Glowing Pill Container
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY)
  ctaGrad.addColorStop(0, 'rgba(110, 231, 255, 0.12)')
  ctaGrad.addColorStop(0.5, 'rgba(255, 209, 102, 0.18)')
  ctaGrad.addColorStop(1, 'rgba(255, 122, 182, 0.12)')
  ctx.fillStyle = ctaGrad

  ctx.beginPath()
  ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 28)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Punchy Viral Challenge Text
  const viralCta = isTr
    ? '⚔️ Skoruma meydan okuyabilir misin? Hemen oyna 👉 XO Tactix'
    : '⚔️ Think you can beat my score? Play now 👉 XO Tactix'

  ctx.font = '800 20px system-ui, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 8
  ctx.textBaseline = 'middle'
  ctx.fillText(viralCta, width / 2, ctaY + ctaH / 2)
  ctx.shadowBlur = 0

  return canvas
}

function trimName(str, maxLen = 12) {
  if (!str) return 'Player'
  const trimmed = str.trim()
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed
}

/**
 * Downloads or natively shares the generated Victory Card PNG.
 */
export async function shareOrDownloadVictoryCard(options) {
  const canvas = generateVictoryCardCanvas(options)
  if (!canvas) return false

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false)
        return
      }

      const filename = `XO-Tactix-Duel-${Date.now()}.png`

      // 1. Native Mobile Image Sharing (Instagram Stories, WhatsApp, AirDrop, etc.)
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.share &&
        typeof File !== 'undefined'
      ) {
        try {
          const file = new File([blob], filename, { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'XO TACTIX Duel',
              text: '⚔️ XO TACTIX maç sonucum! Bana meydan okuyabilir misin?',
              files: [file],
            })
            resolve(true)
            return
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            resolve(true)
            return
          }
        }
      }

      // 2. Direct Browser Image Download
      try {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve(true)
      } catch {
        resolve(false)
      }
    }, 'image/png')
  })
}
