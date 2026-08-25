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
- [ ] **Adım 6:** LinkedIn demosu için 20 saniyelik kusursuz gameplay akışını doğrula.

---

## 📌 Teknik Notlar

| Bilgi | Değer |
|---|---|
| Frontend | React 19, Vite 8, Vanilla CSS |
| Backend | .NET 9, ASP.NET Core Minimal API, SignalR |
| Online İletişim | Adaptive HTTP Polling |
| State Yönetimi | React useState |
| Ses & Titreşim | Web Audio API (prosedürel sentez) + Navigator Haptic |
| Arşiv Dokümanı | `docs/archive/EXPERIMENTAL_IDEAS_ARCHIVE.md` |
