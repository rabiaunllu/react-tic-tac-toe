# 🗺️ XO Arena — Geliştirme Yol Haritası (Roadmap)

> **Son Güncelleme:** 2026-08-16
> **Odak:** Projeyi mobil ve webde en iyi haline getirmek.
> **Kapsam Dışı (Şimdilik):** Poki SDK, CrazyGames, reklam altyapısı, monetizasyon — ileride ayrıca değerlendirilecek.

---

## Faz 1 · Performans & Kod Kalitesi 🔴 KRİTİK

Oyunun mobilde oynanabilir, webde akıcı çalışır hale gelmesi için temel teknik borçların giderilmesi.

### 1.1 — CSS GPU Optimizasyonu
- **Dosya:** `src/App.css` (5.598 satır, ~119 KB)
- **Sorun:** Mobilde FPS düşüşü
- **Yapılacaklar:**
  - [x] `backdrop-filter: blur()` kullanımlarını (14 satır) hafif alternatiflere dönüştür (`background: rgba()` veya yarı saydam solid renkler)
  - [x] Ağır `box-shadow` katmanlarını sadeleştir — `backdrop-filter` kaldırıldığında arka plan opacity artırıldı
  - [x] Karmaşık `radial-gradient` kullanımları korundu (görsel bütünlük)
- **Başarı Kriteri:** Mobilde hamle başına FPS 50+ (şu an ~15-20)

### 1.2 — React Re-render Optimizasyonu
- **Dosyalar:** `src/App.jsx`, `src/components/Board.jsx`, `src/components/Square.jsx`
- **Sorun:** Her hamle tüm uygulamayı baştan render ediyor
- **Yapılacaklar:**
  - [x] `Board.jsx` (55 satır) → `React.memo` ile sarıldı
  - [x] `Square.jsx` (65 satır) → `React.memo` ile sarıldı
  - [x] `handleSquareClick` → `useCallback` ile memoize edildi (Board prop referansı artık stable)
  - [ ] `App.jsx`'teki 31 adet `useState`'i mantıksal gruplara ayır (custom hooks veya `useReducer`) — isteğe bağlı iyileştirme
- **Başarı Kriteri:** Hamle başına gereksiz re-render sayısı < 5

### 1.3 — AI Hesaplamalarını Ana Thread'den Ayır
- **Dosya:** `src/game/aiPlayer.js` (565 satır)
- **Sorun:** AI senkron çalışıyor → 4x4/5x5'te 100-300ms UI kilitlenmesi
- **Yapılacaklar:**
  - [x] AI mantığını Web Worker'a taşındı (`src/game/aiWorker.js`)
  - [x] "AI Düşünüyor…" mikro-animasyonu eklendi (GameStatus + CSS)
  - [x] Worker hata verirse senkron fallback mevcut (oyun kırılmaz)
- **Başarı Kriteri:** AI hamlesi sırasında ana thread block süresi 0ms

---

## Faz 2 · Mobil & UX İyileştirmeleri 🟡 ÖNEMLİ

Kullanıcı deneyimini mobil ve masaüstünde cilalama.

### 2.1 — Responsive Layout Düzeltmeleri
- **Dosyalar:** `src/App.css`, `src/components/Square.jsx`
- **Sorun:** 4x4 ve 5x5 tahtalarda çarpan sayıları ve güç ikonları taşıyor
- **Yapılacaklar:**
  - [ ] Tahta boyutuna göre hücre, ikon ve font boyutlarını dinamik ölçekle
  - [ ] Çarpan rozetleri (2x, 3x) mobilde üst üste binme sorununu çöz
  - [ ] Güç paneli ikonlarının küçük ekranlarda okunabilirliğini artır

### 2.2 — Aktif Güç Seçim Göstergesi
- **Dosya:** `src/components/PowerPanel.jsx`
- **Sorun:** Dokunmatik ekranlarda hangi gücün aktif olduğu belirsiz
- **Yapılacaklar:**
  - [ ] Aktif güç için belirgin görsel vurgu (border, scale, renk değişimi)
  - [ ] Dokunmatik geri bildirim (haptic + görsel pulse) ekle

### 2.3 — Bağlantı Kopması HUD İyileştirmesi
- **Dosya:** `src/components/OnlineGame.jsx` (863 satır)
- **Mevcut Durum:** 30 sn geri sayım var ama düz metin banner olarak gösteriliyor
- **Yapılacaklar:**
  - [ ] Tahta üzerinde overlay geri sayım HUD'u (dairesel countdown veya progress bar)
  - [ ] Görsel olarak dikkat çekici hale getir (animasyonlu, kontrast renk)

### 2.4 — Genel UX Polisajı
- **Yapılacaklar:**
  - [ ] Kazanma/kaybetme ekran geçişlerini incele ve iyileştir
  - [ ] Ses efektlerinin tutarlılığını kontrol et
  - [ ] Hata durumlarında (bağlantı hatası, oda bulunamadı vb.) kullanıcı bilgilendirmesini iyileştir

---

## Faz 3 · Sunucu Güvenliği & Kararlılığı 🟠 GEREKLİ

Canlıdaki sunucunun dayanıklılığı için minimum güvenlik önlemleri.

### 3.1 — Background Room Cleaner
- **Dosya:** `server/XoArena.Api/Services/InMemoryRoomStore.cs` (912 satır)
- **Sorun:** Oda temizliği yalnızca yeni oda oluşturulurken tetikleniyor → bellek sızıntısı riski
- **Yapılacaklar:**
  - [ ] `IHostedService` / `BackgroundService` ile periyodik temizleme (ör. her 5 dk)
  - [ ] Durum bazlı zaman aşımı süreleri: waiting 30dk, ready 45dk, playing 2sa, completed 15dk

### 3.2 — Rate Limiting
- **Dosya:** `server/XoArena.Api/Program.cs` (331 satır)
- **Sorun:** IP/Session bazlı istek sınırlaması yok
- **Yapılacaklar:**
  - [ ] `AddRateLimiter` ile ASP.NET Core built-in rate limiting ekle
  - [ ] Oda oluşturma ve hamle endpoint'lerine ayrı limitler koy

### 3.3 — CORS Yapılandırması (Production)
- **Dosya:** `server/XoArena.Api/Program.cs`
- **Mevcut Durum:** Development'ta localhost kısıtlı, production yapılandırması eksik
- **Yapılacaklar:**
  - [ ] Production ortamı için izin verilen origin'leri yapılandır
  - [ ] Environment bazlı CORS politikası uygula

---

## Faz 4 · Monetizasyon & Portal Entegrasyonu ⏸️ BEKLEMEDE

> **Durum:** Henüz karar verilmedi. Faz 1-3 tamamlandıktan sonra değerlendirilecek.

- Poki SDK entegrasyonu
- CrazyGames SDK entegrasyonu
- Reklam sırasında mute/pause mekanizması
- 5sn AI fallback (otomatik bot eşleşme)
- Responsive iframe uyumlaştırma (100vw × 100vh)
- Ödüllü reklam → ekstra güç mekaniği

---

## 📌 Teknik Notlar

| Bilgi | Değer |
|-------|-------|
| Frontend | React 19, Vite 8, Vanilla CSS |
| Backend | .NET 9, ASP.NET Core Minimal API, SignalR |
| Online İletişim | HTTP Polling (SignalR client **kullanılmıyor**) |
| State Yönetimi | React useState (31 adet, monolitik App.jsx) |
| AI | Senkron, ana thread (Web Worker yok) |
| Ses | Web Audio API (prosedürel sentez) + Haptic |
| Depolama | In-Memory ConcurrentDictionary (DB yok) |
