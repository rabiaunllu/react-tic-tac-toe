# 🗺️ XO Arena — Geliştirme Yol Haritası (Roadmap)

> **Son Güncelleme:** 2026-08-23  
> **Odak:** LinkedIn Vitrin Sürümü (Showcase MVP) — Akıcı, dengeli, hatasız ve görsel olarak etkileyici tek ekran deneyimi.  
> **Kapsam Dışı (Donduruldu):** Poki SDK, CrazyGames, reklam altyapısı, monetizasyon (Arşive alındı: `docs/archive/EXPERIMENTAL_IDEAS_ARCHIVE.md`).

---

## Faz 1 · Performans & Kod Kalitesi 🔴 TAMAMLANDI

Oyunun mobilde oynanabilir, webde akıcı çalışır hale gelmesi için temel teknik borçların giderilmesi.

### 1.1 — CSS GPU Optimizasyonu
- [x] `backdrop-filter: blur()` hafif alternatiflere dönüştürüldü.
- [x] Ağır `box-shadow` katmanları sadeleştirildi.
- [x] GPU hardware acceleration (`transform: translateZ(0)`) eklendi.

### 1.2 — React Re-render Optimizasyonu
- [x] `Board.jsx` → `React.memo` ile sarıldı.
- [x] `Square.jsx` → `React.memo` ile sarıldı.
- [x] `handleSquareClick` → `useCallback` ile optimize edildi.

### 1.3 — AI Hesaplamalarını Ana Thread'den Ayır
- [x] AI mantığı Web Worker'a taşındı (`src/game/aiWorker.js`).
- [x] "AI Düşünüyor…" mikro-animasyonu eklendi.
- [x] Worker hata verirse senkron fallback hazırlandı.

---

## Faz 2 · Mobil & UX İyileştirmeleri 🟡 TAMAMLANDI

Kullanıcı deneyimini mobil ve masaüstünde cilalama.

### 2.1 — Responsive Layout Düzeltmeleri
- [x] Tahta boyutuna göre dinamik hücre, ikon ve font ölçekleme.
- [x] Çarpan rozetleri (2x, 3x) ve güç rozetlerinin taşma sorunları giderildi.

### 2.2 — Aktif Güç Seçim Göstergesi
- [x] Aktif güç için görsel pulse (`@keyframes power-select-pulse`) ve renk vurgusu.
- [x] Dokunmatik geri bildirim (Haptic titreşim + Web Audio API synth sesleri).

### 2.3 — Bağlantı Kopması HUD İyileştirmesi
- [x] Radar dalgalı ve dairesel SVG progress bar geri sayım HUD'u entegre edildi.

---

## Faz 3 · Sunucu Güvenliği & Kararlılığı 🟠 TAMAMLANDI

Canlıdaki sunucunun dayanıklılığı için minimum güvenlik önlemleri.

### 3.1 — Background Room Cleaner
- [x] `RoomCleanupService.cs` ile periyodik bellek temizleme servisi.
- [x] Durum bazlı zaman aşımı süreleri: waiting 30dk, ready 45dk, playing 2sa, completed 15dk.

### 3.2 — Rate Limiting
- [x] Global IP bazlı limiter: 300 istek/dk.
- [x] Oda oluşturma: 20 istek/dk; hamle/güç: 240 istek/dk; odaya katılma: 5 istek/dk.

### 3.3 — CORS Yapılandırması (Production)
- [x] Production origin whitelist desteği ve env var entegrasyonu.

---

## Faz 4 · Monetizasyon & Portal SDK Altyapısı ⏸️ KAPSAM DIŞI (DONDURULDU)

> **Durum:** LinkedIn vitrin sürümü ve yalın oyun deneyimine odaklanmak için şimdilik tamamen kaldırıldı ve arşive alındı (`docs/archive/EXPERIMENTAL_IDEAS_ARCHIVE.md`).

- Poki SDK entegrasyonu (Donduruldu)
- CrazyGames SDK entegrasyonu (Donduruldu)
- Reklam molaları ve ödüllü reklam mekanizmaları (Donduruldu)

---

## Faz 5 · İleri Düzey Güvenlik 🛡️ TAMAMLANDI

- [x] **Oyuncu Kimlik Doğrulaması:** Kriptografik `PlayerSecret` doğrulaması ve timing attack koruması (`CryptographicOperations.FixedTimeEquals`).
- [x] **Gizli Veri Koruması:** `Traps` tuzaklarının network yanıtlarında filtrelenmesi.
- [x] **HTTPS & HSTS:** Zorunlu güvenli yönlendirme.

---

## Faz 6 · LinkedIn Vitrin Sürümü (Showcase MVP) & Mod Bazlı Dengeleme 🚀 YENİ

Ortama ve oynanış tipine göre optimize edilmiş, hatasız ve dengeli güç dağılımı.

```
+-----------------------------------------------------------------------------------------+
|                                MOD BAZLI GÜÇ DAĞILIM MATRİSİ                            |
+-----------------------------------------------------------------------------------------+
| [1] YAN YANA MODU (Shared Screen) : 💣 Bomba | 🛡️ Kalkan | ❄️ FREEZE     | 🦇 VAMPİR   |
| [2] BOTA KARŞI & ONLİNE MODU      : 💣 Bomba | 🛡️ Kalkan | 🕳️ KARA DELİK | 🦇 VAMPİR   |
+-----------------------------------------------------------------------------------------+
```

### 6.1 — Mod Bazlı Taktik Dağılımı:
1. **Yan Yana Modu (Local PvP / Aynı Cihaz):**
   - **Neden Freeze?** Yan yana oynarken iki oyuncu da birbirinin parmağını gördüğü için gizli tuzak (Kara Delik) çalışmaz. Bu yüzden Yan Yana modında **❄️ Freeze (Açık Alan Engelleme)** aktif olur.
2. **Bota Karşı (PvC) & Çevrimiçi (Online PvP):**
   - **Neden Kara Delik?** Oyuncuların ekranları bağımsız olduğu için **🕳️ Kara Delik (Gizli Tuzak)** kusursuz bir blöf ve akıl oyunu sunar.
3. **Boost (⚡) Arka Planda & Vampir (🦇) Ön Planda:**
   - **Boost:** Arka planda/kod altyapısında hazır olarak saklanacak, şimdilik UI'da görünmeyecek.
   - **Vampir:** Ön planda/UI üzerinde görünür güç olarak aktif kullanılacak.
4. **Kalkan (🛡️) Koruması:** Kalkan tüm modlarda kararlı savunma gücü olarak kalır.

---

### 6.2 — Vampir & Boost Konfigürasyonu
- **Ön Plan (UI):** Aktif 4. güç slotunda **Vampir** görünecek ve kullanılacak.
- **Arka Plan Mimarisi:** Boost kod altyapısı projede saklı kalacak (silinmeyecek), ileriki güncellemeler için hazır bekletilecek.

---

### 6.3 — Kritik Sistem Açığı Düzeltmesi (Power Chaining / Spam Exploit Koruması) 🔴
- **Mevcut Açık (Bug):** Hamle sırasını tüketmeyen güçler (`Kalkan`, `Freeze`, `Vampir`) kullanıldığında oyuncu aynı turda art arda birden fazla güç harcayabiliyor (Power Spamming).
- **Çözüm Algoritması (Turn Phase Lock):**
  - Oyuncu bir turda herhangi bir güç kullandığı anda `hasUsedPowerThisTurn = true` bayrağı devreye girer.
  - O tur boyunca **tüm güç butonları kilitlenir (disabled)**.
  - Oyuncuya **yalnızca normal taş koyma hamlesi** yapma izni verilir.
  - Taş konulup sıra rakibe geçtiğinde kilit sıfırlanır (`hasUsedPowerThisTurn = false`).

---

### 6.4 — Görsel Efekt Canlandırması 🎨
- **Freeze (Yan Yana):** Kristal kar tanesi ve buz parıltısı animasyonu (`CrystalSnowflake`).
- **Vampir (Tüm Modlar):** Vampir temalı ikon, görsel geri bildirim ve efektler.

---

### 📋 Adım Adım Kodlama Kontrol Listesi:

- [x] **Adım 1:** Güç konfigürasyonunda (`powers.js`) güç listelerini düzenle: Yan Yana modunda `Freeze`, Bota Karşı ve Online modlarında `Kara Delik` (`trap`) aktif edilsin.
- [x] **Adım 2:** Boost gücünü UI görünümünden kaldırarak arka plana çek; ön planda görünür güç olarak `Vampir` entegrasyonunu doğrula.
- [x] **Adım 3:** `hasUsedPowerThisTurn` kontrolünü ekleyerek aynı turda çoklu güç kullanım açığını (Power Chaining) kapat.
- [x] **Adım 4:** Yan Yana modunda `Dondur` gücünün tahtada dondurma ve 1-tur sonra çözülme akışını test et.
- [x] **Adım 5:** Vampir gücünün UI üzerindeki çalışmasını ve görsel geri bildirimini doğrula.
- [x] **Adım 6:** LinkedIn demosu için 20 saniyelik kusursuz gameplay akışını doğrula.

---

## Faz 7 · Grandmaster AI Arena Motoru 🟢 TAMAMLANDI

Yapay zekanın yenilmez, hatasız ve viral seviyede bir büyükusta zekasıyla oynaması için Minimax mimarisinin en üst seviyeye çıkarılması.

- [x] **7.1 — Bitwise Zobrist Hashing:** 32-bit integer XOR tabanlı önbellekleme ile sıfır GC yükü ve mikrosaniye önbellek erişimi.
- [x] **7.2 — Dinamik Kaynak Çarpanı (Phase Multipliers):** Açılışta güç harcamama ($0.25\times$), oyun sonu tam leverage ($2.0\times$).
- [x] **7.3 — Normalize Heuristic Skalası:** Puan uçurumu kapatıldı (Mat: 100K, Açık Tehdit: 5K, Fork: 3.5K, Fork Hub: 1.2K, Kalkan: 300-600).
## Faz 8 · Hamle Sayacı (Turn Timer / Shot Clock) 🟢 TAMAMLANDI

- [x] **8.1 — 10s, 15s, 20s & Süresiz Modlar:** Online, Bota Karşı ve Yan Yana modları için seçimli hamle süresi limitleri.
- [x] **8.2 — Panele Entegre Siber Sayaç HUD:** Oyuncu panellerine entegre şık süre rozeti ve tema uyumlu dinamik lazer ilerleme çizgisi.
- [x] **8.3 — Evrensel Kırmızı Nabız Alarmı:** Son 5 saniyede alev kırmızısı nabız (`pulse`) ve prosedürel geri sayım uyarısı.
- [x] **8.4 — Zaman Aşımı Galibiyeti & Hile Koruması:** Süre bittiğinde turu rakibe verme ve onay pencerelerinde süreyi durdurup sınırsız düşünme açığının (Pause-to-Think Exploit) kapatılması.
- [x] **8.5 — Online Çok Oyunculu Senkronizasyonu:** Oda kurulumunda seçilen sürenin her iki oyuncuda gerçek zamanlı senkronize edilmesi.

---

## Faz 9 · Güvenlik Denetimi & Zafiyet Taraması 🟢 TAMAMLANDI

- [x] **9.1 — XSS & Girdi Sanitizasyonu:** Oyuncu adları ve oda kodları için sıkı sanitizasyon ve uzunluk sınırları.
- [x] **9.2 — Race Condition & State Güvenliği:** Süre aşımı, yapay zeka ve eşzamanlı tıklamalara karşı kilitli guard mekanizmaları (`effectiveWinner`).
- [x] **9.3 — Online Yetkilendirme:** Kriptografik `playerSecret` ile yetkisiz eylem ve hile girişimlerinin engellenmesi.
- [x] **9.4 — Performans ve Bellek Sızıntısı Koruması:** 60-120 FPS akıcılık, `backdrop-filter` arındırması ve bellek temizleme garantisi.

---

## Faz 10 · Çoklu Dil Desteği (i18n Localization) ⏳ SIRADA

- [ ] **10.1 — Çift Dilli Sözlük Modülü:** `src/i18n/` sözlük yapısı (Türkçe / İngilizce).
- [ ] **10.2 — Dil Değiştirici UI:** Menü ve ayarlar paneline bayrak/dil seçici.
- [ ] **10.3 — Otomatik Tarayıcı Dili Tespiti:** CrazyGames global kullanıcıları için otomatik İngilizce açılış.

---

## Faz 11 · CrazyGames v3 SDK Yayını 🚀 HEDEF

- [ ] **11.1 — CrazyGames v3 SDK Entegrasyonu:** Gameplay Start/Stop, HappyTime ve Adbreak tetikleyicileri.
- [ ] **11.2 — Yayınlama & Test:** CrazyGames portalında canlı test.

---

## 📌 Teknik Notlar

| Bilgi | Değer |
|---|---|
| Frontend | React 19, Vite 8, Vanilla CSS |
| Backend | .NET 9, ASP.NET Core Minimal API, SignalR |
| Online İletişim | SignalR WebSockets + Akıllı Polling Yedekleme |
| AI Motoru | Alpha-Beta Minimax + Bitwise Zobrist Hashing + Hard Guards |
| State Yönetimi | React useState + Session Storage |
| Ses & Titreşim | Web Audio API (prosedürel sentez) + Navigator Haptic |
