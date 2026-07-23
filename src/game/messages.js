export const winnerMessages = [
  ['😬', 'Bir daha deneyin, belki 10. kez tutar.', 'Ya da hiç tutmaz, kim bilebilir?'],
  ['💀', 'Dostum... bu round biraz hızlı bitti.', 'Rakip daha ısınamadan sonuç geldi.'],
  ['🫠', 'Bu bir oyun muydu yoksa planlı kaos mu?', 'Her hamle ayrı bir olaydı.'],
  ['😂', 'Rakibin sana 3 hamle önceden veda etti.', 'Fark etmen biraz zaman aldı.'],
  ['🤡', 'Her hamlen bir umut, her sonuç yeni bir sürpriz.', 'Tutarlısın en azından.'],
  ['🙃', 'Bu performans için özel bir kategori açılmalıydı.', 'En yaratıcı kayıp adayı olabilir.'],
  ['😤', 'Kazanmak için biraz daha hırs gerekebilir.', 'Bir sonraki round intikam kokuyor.'],
  ['🪦', 'Burada bir strateji yatmaktadır.', 'İyi başladı, garip bitti.'],
  ['🎻', 'Arka planda dramatik müzik başladı.', 'Bu round biraz kalbe dokundu.'],
  ['🏆', 'Kazanan belli, bahaneler hazırlanıyor.', 'Sıradaki round daha gergin geçebilir.'],
]

export const loserMessages = [
  'Bir yudum su, sonra intikam.',
  'Bu round karakter gelişimine yazıldı.',
  'Strateji grafiği hafif aşağı yönlü.',
  'Kaybeden taraf kısa bir sessizlik rica ediyor.',
  'Bir sonraki round için dramatik hazırlık başladı.',
  'Bugünlük ego biraz kenara alındı.',
]

export const drawMessages = [
  ['🤝', 'Berabere.', 'İkiniz de fazla temkinli oynadınız.'],
  ['🧊', 'Tahta kilitlendi.', 'Ego şimdilik askıda kaldı.'],
  ['😶', 'Ne kazanan var ne kaybeden.', 'Sadece hesaplaşma ertelendi.'],
  ['📎', 'Bu round dosyaya kaldırıldı.', 'Sonuç: kararsız ama saygılı.'],
  ['🫡', 'İki taraf da düşmedi.', 'Ama kimse de parlamadı.'],
  ['🎭', 'Stratejiler çarpıştı.', 'Ortaya kontrollü bir sessizlik çıktı.'],
]

export function getRandomMessage(messages) {
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}