# 🚀 GPT Astra 6 — Yeni Nesil Giriş Hub'ı & UX Yenileme Yol Haritası (TODO)

> **Tasarımcı:** GPT Astra 6 (2026 Yeni Nesil Yapay Zekâ Oyun Tasarımcısı, UX Mimarı & Hiper-Etkileşim Analisti)  
> **Proje:** XO TACTIX (React + Vite + Web Worker AI + SignalR)  
> **Hedef Platform:** CrazyGames, Web & Mobil Tarayıcılar  
> **Temel İlke:** *"Daha az karar, daha çok oyun. İlk 3 saniyede aksiyon!"*

---

## 🧭 Yönetici Özeti & Teşhis Raporu

**XO TACTIX**, oyun motoru, 5 farklı arena süper gücü, dinamik çarpanları, 30 seviyelik bulmaca seferi ve Web Worker destekli Grandmaster yapay zekâsıyla casual web oyunları standardının çok üzerinde bir derinliğe sahiptir.

Ancak mevcut ilk intiba ve giriş akışı şu psikolojik darboğazlara takılmaktadır:
1. **Hick Yasası (Seçenek Felci):** Kullanıcı "Hemen Oyna" ve "Bot'a Karşı" arasında kararsız kalmakta, modal açıldığında ise 8 farklı teknik konfigürasyonla boğuşmaktadır.
2. **Kayıp Değer (Retention Leak):** Oyuncunun kazandığı TP'ler, seviyesi ve günlük serisi ilk ekranda görünmediği için aidiyet ve "bir maç daha" dürtüsü tetiklenememektedir.
3. **Ölü Piksel / Pasif Kartlar:** CrazyGames oyuncusu ve test ekibi tıklanamayan "Yakında" (Coming Soon) kartlarını yarım kalmışlık hissi olarak algılamaktadır.

Bu belge, oyunu **CrazyGames D1/D7 Retansiyon Şampiyonu** yapacak 6 aşamalı cerrahi eylem planını içerir.

---

## 📐 Yeni Nesil 4 Katmanlı Giriş Mimarisi (Görsel Taslak)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⭐ Sv. 5 Taktisyen  [████████░░] 78%   🏆 1,450 XP   🔥 3 Gün   │ 🔊 🌐 EN  │  <-- 1. KATMAN: OYUNCU KİMLİK BARI
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                 XO TACTIX                                   │
│                 "Sıradan XOX Değil, Taktiksel Süper Arena!"                 │
│                                                                             │
│             ╔═════════════════════════════════════════════════╗             │
│             ║         ⚡ HEMEN OYNA (ARENA 3x3)               ║             │  <-- 2. KATMAN: ALTIN 1-CLICK BUTONU
│             ║         Bot'a Karşı • Güçler Aktif • 15 Puan    ║             │
│             ╚═════════════════════════════════════════════════╝             │
│                                                                             │
├───────────────────────────────────────┬─────────────────────────────────────┤
│  🧩 BULMACA SEFERİ                    │  📅 GÜNÜN GÖREVİ                    │  <-- 3. KATMAN: KAHRAMAN RETANSİYON
│  12 / 30 Tamamlandı                   │  🔥 3 GÜNLÜK SERİ KORUMA            │     (İlerleme barlı vitrin)
│  [████████░░░░░░░░░░] %40             │  ⚡ Bugünün Görevi Hazır (+500 XP)  │
│  🎁 Sıradaki Ödül: Buz Teması         │  ✓ Tek tıkla açılır                 │
├───────────────────────────────────────┴─────────────────────────────────────┤
│  ── DİĞER MODLAR ─────────────────────────────────────────────────────────  │
│  [ 🎮 Klasik XOX ]           [ 👥 Yan Yana (2P) ]          [ ⚙️ Özel Maç ]   │  <-- 4. KATMAN: İKİNCİL SEÇENEKLER
│  (Sade, Saf Zekâ)            (Aynı Cihazda Arkadaşla)      (Tahta & Kural)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 5 Cerrahi İyileştirme & Yapılacaklar Listesi

### 📋 FAZ 1: Oyuncu Kimlik Barı (Player Identity HUD)
> **Amaç:** Oyuncuya oyunu ilk açtığı anda kazandığı statüyü, seviyesini ve günlük serisini hissettirerek aidiyet oluşturmak.

- [ ] **1.1.** Yeni `PlayerIdentityBar.jsx` bileşeni oluşturulması:
  - `game/progression.js` içerisindeki `loadProgress()` ve `getXPProgress()` fonksiyonlarından verileri alma.
  - Seviye rozeti ve unvanı:
    - *Sv 1-2:* Acemi Taktisyen (Rookie)
    - *Sv 3-5:* Stratejist (Strategist)
    - *Sv 6-9:* Arena Ustası (Arena Master)
    - *Sv 10-14:* Büyük Usta (Grandmaster)
    - *Sv 15+:* Efsanevi Taktikçi (Legend)
  - Seviye içi TP ilerleme çubuğu (`xpIntoLevel / xpNeeded`).
  - Toplam TP göstergesi (örn: `🏆 1,450 TP`).
  - Günlük Seri göstergesi (örn: `🔥 3 Gün`).
- [ ] **1.2.** `GameSetup.jsx` başlığına `SoundToggle` ve dil seçici ile birlikte entegre edilmesi.
- [ ] **1.3.** Kimlik çubuğuna tıklandığında mini bir **Kariyer Özeti Modalı** açılması:
  - Toplam Maç, Galibiyet Oranı, Kullanılan Güçler, Açılan Temalar.
- [ ] **1.4.** CSS stillerinin `App.css` içerisine eklenmesi (`.player-identity-bar`, mobil duyarlılık, parıltı efektleri).

---

### 📋 FAZ 2: Ana Ekran Hiyerarşisi & "Hemen Oyna" vs "Özel Maç" Ayrımı
> **Amaç:** Hick Yasası'nı uygulayarak oyuncunun ilk 3 saniyede oyuna girmesini sağlamak, "Hızlı Oyna" ile "Bot'a Karşı" ikilemini ortadan kaldırmak.

- [ ] **2.1.** **Altın Buton (1-Click Primary CTA) İyileştirmesi:**
  - `⚡ HEMEN OYNA (ARENA 3x3)` butonu en baskın görsel hiyerarşide tutulacak.
  - Alt etiket netleştirilecek: *"Bot'a Karşı • Güçler & Çarpanlar Aktif • 15 Puan"*.
  - Tıklandığı an sıfır modal ve sıfır gecikmeyle maçı başlatacak (CrazyGames 1-Click kuralı).
- [ ] **2.2.** **"Bot'a Karşı" Kartının "Özel Maç" Olarak Dönüştürülmesi:**
  - Eski `viral-mode-card--ai` kartı "Özel Maç (⚙️ Custom Match)" haline getirilecek.
  - Açıklama: *"Tahta boyutu, zorluk ve kuralları sen belirle"*.
  - Bu sayede kullanıcı "Hızlı Oyna zaten bot, alttaki ne?" çelişkisine düşmeyecek.
- [ ] **2.3.** **"Klasik XOX" Hızlı Kartının Eklenmesi:**
  - Güçleri ve çarpanları sevmeyen geleneksel oyuncular için doğrudan saf XOX modu kartı (`🎮 Klasik Mod: Saf Zeka, 5 Tur`).
- [ ] **2.4.** **"Yan Yana (2P)" Kartının Konumunun Korunması:**
  - İki kişilik yerel maç modu temiz ikincil seçenekler arasına yerleştirilecek.

---

### 📋 FAZ 3: Ölü / Pasif Kartların Tasfiyesi & Temizlik
> **Amaç:** CrazyGames QA onayını riske atan ve oyuncuda "oyun eksik" hissi uyandıran pasif butonları yok etmek.

- [ ] **3.1.** `viral-mode-card--tournament` (Turnuva - Yakında) kartının ana ekrandan **tamamen kaldırılması**.
- [ ] **3.2.** Çevrimiçi Mod (`viral-mode-card--online`) Dinamik Yönetimi:
  - `IS_ONLINE_ENABLED === false` ise ana ızgarada büyük devre dışı kart olarak durmayacak.
  - Sağ üst köşede veya alt barda şık, küçük bir rozet (`🌐 Online Oda (v1.2)`) olarak konumlandırılacak ya da tamamen gizlenecek.
  - `IS_ONLINE_ENABLED === true` olduğunda ise aktif bir çok oyunculu kartı olarak görünecek.
- [ ] **3.3.** Kural & Rehber butonunun (`📖 Nasıl Oynanır?`) ana sayfada gözü yormayan şık bir footer/link olarak düzenlenmesi.

---

### 📋 FAZ 4: Bulmaca Seferi & Günlük Görev Görsel Vitrini (Retention Engines)
> **Amaç:** D1 (1. gün) ve D7 (7. gün) geri dönüş oranlarını yukarı çeken iki motoru "kahraman kart" haline getirmek.

- [ ] **4.1.** **Bulmaca Seferi Kahraman Kartı (`Campaign Hero Card`):**
  - Tamamlanan bölüm sayısını canlı mini progress bar ile gösterme: `12 / 30 Seviye [%40]`.
  - Dinamik ödül önizleme etiketi:
    - Seviye 1-10 arası: `🎁 Seviye 10 Ödülü: Bulmaca Rozeti`
    - Seviye 11-20 arası: `🎁 Seviye 20 Ödülü: Buz Kristali Teması`
    - Seviye 21-30 arası: `🎁 Seviye 30 Ödülü: Büyük Usta Unvanı`
  - Tek tıkla doğrudan Bulmaca haritasını açma.
- [ ] **4.2.** **Günün Görevi Kahraman Kartı (`Daily Challenge Hero Card`):**
  - Bugün henüz oynanmadıysa: Nabız gibi atan turuncu-altın alev efekti, `🔥 SERİNİ KORU (+500 TP)`.
  - Bugün tamamlandıysa: Sakin yeşil rozet `✓ BUGÜN TAMAMLANDI · 🔥 X Günlük Seri`.
  - Tek tıkla doğrudan Günün Görevini başlatma.
- [ ] **4.3.** İki kartın yan yana dengeli (50% - 50%) grid tasarımıyla ana sayfada öne çıkarılması.

---

### 📋 FAZ 5: Kurulum Modalında "Akıllı Varsayılanlar & Akordeon" (Smart Defaults)
> **Amaç:** Ayar modalını açan oyuncunun karşısına 8 ayar birden fırlatıp kaçırmak yerine, 2 saniyede başlatacak akıllı akış sunmak.

- [ ] **5.1.** **Ana Görünümde Yalnızca 2 Karar Sunulması:**
  1. **Oyun Tarzı:**
     - `🔥 Arena Modu` (Süper Güçler & Çarpanlar) [VARSAYILAN]
     - `🎮 Klasik Mod` (Geleneksel Saf Strateji)
  2. **Yapay Zekâ Zorluğu (Özel Maç / Bot için):**
     - `🌱 Kolay` · `⚡ Dengeli (Orta)` [VARSAYILAN] · `🧠 Usta (Hard)` · `👑 Efsane (Expert)`
  3. **Büyük Aksiyon Butonu:** `[ ▶ HEMEN BAŞLA ]`
- [ ] **5.2.** **"⚙️ Gelişmiş Ayarlar" Akordeon Bloğu:**
  - Varsayılan olarak kapalı (collapsed) duracak.
  - Tıklandığında aşağı doğru pürüzsüzce açılacak (`details/summary` veya React state):
    - Tahta Boyutu: 3x3, 4x4, 5x5
    - Hedef Puan / Tur: 15 / 30 / 50 / ∞
    - Hamle Süresi: 5s, 10s, 15s, 20s, ∞
    - İlk Hamle: Sırayla, Oyuncu, Bot
    - Taş Görünümü (Skin Seçimi)
- [ ] **5.3.** Mod seçiminde "Arena" seçildiğinde mini özellik etiketleri: `💣 Bomba`, `🛡️ Kalkan`, `❄️ Dondur`, `🧛 Vampir`, `🕳️ Tuzak`.

---

### 📋 FAZ 6: Güç Simülasyonunun Doğru Konumlandırılması
> **Amaç:** Sayfanın dibinde kimsenin görmediği `PowerSimulation` animasyonunu bir değer ve eğitim aracına dönüştürmek.

- [ ] **6.1.** Seçenek A (Tavsiye Edilen): Ana ekranda veya modalda yer alan `🎯 Güçleri Test Et (İnteraktif Laboratuvar)` butonuyla açılan kompakt bir modal/sekme haline getirilmesi.
- [ ] **6.2.** Seçenek B: Kurulum modalında "Arena Modu" seçildiğinde arka planda veya kart altında mini canlı simülasyon olarak oynatılması.
- [ ] **6.3.** Sayfa altındaki statik yer kaplayan büyük simülasyon bloğunun ana akıştan temizlenmesi.

---

### 📋 FAZ 7: Çoklu Dil (i18n) & Metin Güncellemeleri
> **Amaç:** Türkçe ve İngilizce dillerinde yeni terminolojinin kusursuzca desteklenmesi.

- [ ] **7.1.** `src/i18n/tr.js` dosyasına eklenecek anahtarlar:
  - `setup.customMatch`: "ÖZEL MAÇ"
  - `setup.customMatchDesc`: "Zorluk, tahta ve kuralları özelleştir"
  - `setup.quickPlayDesc`: "Arena 3x3 • Bot • Güçler Aktif • 15 Puan"
  - `setup.advancedSettings`: "⚙️ Gelişmiş Ayarlar (Tahta, Süre, Kurallar)"
  - `setup.playerIdentity.rankAcemi`: "Acemi Taktisyen"
  - `setup.playerIdentity.rankStratejist`: "Stratejist"
  - `setup.playerIdentity.rankUsta`: "Arena Ustası"
  - `setup.playerIdentity.rankBuyukUsta`: "Büyük Usta"
  - `setup.playerIdentity.rankEfsane`: "Efsane"
  - `setup.streakKeep`: "SERİNİ KORU"
  - `setup.streakCount`: "{{count}} Günlük Seri"
  - `setup.nextUnlock`: "Sıradaki Ödül: {{name}}"
- [ ] **7.2.** `src/i18n/en.js` dosyasına birebir İngilizce çevirilerin eklenmesi.

---

### 📋 FAZ 8: Test, Doğrulama & CrazyGames Uyumluluk Denetimi
> **Amaç:** Sıfır regresyon ve kusursuz 60 FPS CrazyGames akışı.

- [ ] **8.1.** Mobil ve masaüstü ekran boyutlarında responsive test (320px - 1920px).
- [ ] **8.2.** Dokunmatik ekran (Touch gesture) ve ses başlatma (`registerUserGesture`) kontrolleri.
- [ ] **8.3.** CrazyGames SDK Ad ve Deep-link entegrasyonlarının doğrulanması.
- [ ] **8.4.** `npm run build` ile üretim derlemesi kontrolü (Sıfır hata, sıfır lint uyarısı).

---

## 📊 Başarı Metrikleri (Astra 6 KPI Hedefleri)

| Metrik | Mevcut Durum | Astra 6 Hedefi | Beklenen Etki |
| :--- | :--- | :--- | :--- |
| **İlk Hamleye Ulaşma Süresi** | ~8 - 14 saniye | **< 3 saniye** | Oyuncu kaybını (drop-off) %45 azaltır. |
| **Karar Sayısı (Bilişsel Yük)** | 8 - 10 parametre | **1 tık (Hemen Oyna) veya 2 parametre (Özel)** | Hick Yasası optimize edilir. |
| **D1 Retention (1. Gün Dönüşü)** | Orta seviye | **+%35 Artış** | Günlük görev alevi ve TP barı sayesinde. |
| **Ölü Buton Sayısı** | 2 adet (Turnuva, Pasif Online) | **0 adet (%100 işlevsel)** | CrazyGames QA skoru tavan yapar. |

---

## 🛠️ Değişiklik Yapılacak Dosyalar Matrisi

| Dosya Yolu | Rol & Yapılacak İşlem |
| :--- | :--- |
| `src/components/GameSetup.jsx` | Ana Hub hiyerarşisi yeniden yapılandırılacak, ölü kartlar kaldırılacak, akordeon entegre edilecek. |
| `src/components/PlayerIdentityBar.jsx` | **[YENİ]** Üst bar oyuncu ilerleme, seviye, TP ve seri bileşeni. |
| `src/components/PowerSimulation.jsx` | İnteraktif laboratuvar / modal moduna uyarlanacak. |
| `src/App.css` | 4 katmanlı yeni grid stilleri, progress bar animasyonları, akordeon stilleri. |
| `src/i18n/tr.js` & `src/i18n/en.js` | Yeni mod başlıkları, akordeon etiketleri ve unvan çevirileri. |
| `src/game/progression.js` | Seviye unvanları ve seviye içi yüzde hesaplama yardımcıları. |

---
*Belge Sürümü: 1.0.0 — GPT Astra 6 Giriş & UX Revizyon Spesifikasyonu*
