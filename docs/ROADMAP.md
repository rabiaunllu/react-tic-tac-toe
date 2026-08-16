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
  - [x] Tahta boyutuna göre hücre, ikon ve font boyutlarını dinamik ölçekle (`--square-font-size`, `--badge-scale`)
  - [x] Çarpan rozetleri (2x, 3x) ve güç rozetlerinin mobilde üst üste binme sorununu çöz
  - [x] Güç paneli ikonlarının küçük ekranlarda okunabilirliğini artır

### 2.2 — Aktif Güç Seçim Göstergesi
- **Dosya:** `src/components/PowerPanel.jsx`
- **Sorun:** Dokunmatik ekranlarda hangi gücün aktif olduğu belirsiz
- **Yapılacaklar:**
  - [x] Aktif güç için belirgin görsel vurgu (border, scale, renk değişimi ve `@keyframes power-select-pulse`)
  - [x] Dokunmatik geri bildirim (haptic titreşim + görsel pulse + ses efekti) eklendi

### 2.3 — Bağlantı Kopması HUD İyileştirmesi
- **Dosya:** `src/components/OnlineGame.jsx` (863 satır), `src/App.css`
- **Mevcut Durum:** 30 sn geri sayım var ama düz metin banner olarak gösteriliyordu
- **Yapılacaklar:**
  - [x] Tahta üzerinde radar dalgalı ve dairesel SVG progress bar geri sayım HUD'u (`online-reconnecting-hud`)
  - [x] Görsel olarak dikkat çekici ve animasyonlu hale getirildi

### 2.4 — Genel UX Polisajı
- **Yapılacaklar:**
  - [x] Kazanma/kaybetme ekran geçişleri ve pürüzsüz buton odak durumları
  - [x] Ses efektleri ve dokunmatik geri bildirimler (haptic) güç seçimlerine entegre edildi
  - [x] Hata durumlarında kullanıcı bilgilendirmesi ve anlaşılır mesajlar sağlandı

---

## Faz 3 · Sunucu Güvenliği & Kararlılığı 🟠 GEREKLİ

Canlıdaki sunucunun dayanıklılığı için minimum güvenlik önlemleri.

### 3.1 — Background Room Cleaner
- **Dosya:** `server/XoArena.Api/Services/InMemoryRoomStore.cs` (912 satır)
- **Sorun:** Oda temizliği yalnızca yeni oda oluşturulurken tetikleniyor → bellek sızıntısı riski
- **Yapılacaklar:**
  - [x] `IHostedService` / `BackgroundService` ile periyodik temizleme: `RoomCleanupService.cs` oluşturuldu
  - [x] `IRoomStore.CleanupExpiredRooms()` public metod olarak eklendi (int döndürür, kaç oda silindi loglanır)
  - [x] Durum bazlı zaman aşımı süreleri korundu: waiting 30dk, ready 45dk, playing 2sa, completed 15dk
  - [x] Başlangıçta 30 saniye gecikme — uygulama tam ayağa kalksın
  - [x] Temizleme aralığı `appsettings.json` üzerinden yapılandırılabilir (varsayılan: 5 dk)

### 3.2 — Rate Limiting
- **Dosya:** `server/XoArena.Api/Program.cs` (331 satır)
- **Sorun:** IP/Session bazlı istek sınırlaması yok
- **Yapılacaklar:**
  - [x] `AddRateLimiter` ile ASP.NET Core built-in rate limiting eklendi
  - [x] Global IP bazlı limiter: 300 istek/dk (tüm endpoint'ler, polling uyumlu)
  - [x] Oda oluşturma (`POST /api/rooms`): 20 istek/dk — spam koruması
  - [x] Hamle ve güç endpoint'leri (`/moves`, `/powers`): 240 istek/dk
  - [x] Tüm limitler `appsettings.json` üzerinden yapılandırılabilir
  - [x] Limit aşımında 429 Too Many Requests döndürülür

### 3.3 — CORS Yapılandırması (Production)
- **Dosya:** `server/XoArena.Api/Program.cs`
- **Mevcut Durum:** Development'ta localhost kısıtlı, production yapılandırması eksikti
- **Yapılacaklar:**
  - [x] `appsettings.json`'a `Cors:AllowedOrigins` boş dizi eklendi (production'da override edilecek)
  - [x] `appsettings.Development.json` localhost origin'lerini korur
  - [x] Environment bazlı override: `CORS__ALLOWEDORIGINS__0=https://example.com` şeklinde env var ile production origin ayarlanabilir

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

## Faz 5 · İleri Düzey Güvenlik & Canlıya Hazırlık 🛡️ KRİTİK

Oyunu internet ortamına (Production) deploy ederken oluşabilecek kötü niyetli müdahaleleri, kimlik sahteciliğini ve bağlantı açıklarını engelleme adımları.

### 5.1 — Oyuncu Kimlik Doğrulaması (Player Secret / Session Token) 🔴
- **İlgili Dosyalar:** `server/XoArena.Api/Models/Player.cs`, `InMemoryRoomStore.cs`, `Contracts/PlayerResponse.cs`, `src/components/OnlineGame.jsx`
- **Mevcut Açık (Player Impersonation / Forfeit Exploit):** 
  - `GET /api/rooms/{code}` yanıtında her iki oyuncunun `PlayerId` değeri açıkça döner.
  - Kötü niyetli bir oyuncu, rakibin `PlayerId`sini kullanarak `POST /leave` (teslim olma hilesi) veya rakibin sırasındayken onun yerine sahte `/moves` ve `/powers` istekleri atabilir.
- **Çözüm Planı:**
  - [x] Oda oluşturma (`Create`) veya odaya katılma (`Join`) anında sunucu tarafında her oyuncu için gizli bir `PlayerSecret` (kriptografik token) üretiliyor.
  - [x] `PlayerSecret` sadece odayı oluşturan/katılan oyuncunun yanıtında döndürülüyor; genel `RoomResponse` veya `PlayerResponse` içinde **asla yayınlanmıyor**.
  - [x] `Move`, `UsePower`, `Start`, `NextRound` ve `Leave` endpoint'leri `PlayerSecret` doğruluyor; uyuşmazlıkta `403 Forbidden` dönüyor.
  - [x] Frontend `playerSecret` değerini `sessionStorage` içinde saklayıp işlem isteklerine ekliyor.

### 5.2 — Güvenli İletişim (HTTPS & HSTS & WSS) 🔒
- **İlgili Dosyalar:** `server/XoArena.Api/Program.cs`, Azure / Cloud App Service Config
- **Risk:** HTTP üzerinden taşınan oda kodları ve oyuncu token'ları Man-in-the-Middle (aradaki adam) saldırılarıyla dinlenebilir.
- **Çözüm Planı:**
  - [x] Canlı ortamda `app.UseHttpsRedirection()` ve `app.UseHsts()` middleware'leri zorunlu kılındı.
  - [x] Azure App Service dağıtım notlarına HTTPS Only ve platform sertifikası doğrulaması eklendi; canlıda geçerli sertifika/TLS yapılandırması platformda etkin tutulmalı.

### 5.3 — Oda Kodu Taraması & Kaba Kuvvet Koruması (Anti-Brute Force) 🛑
- **İlgili Dosyalar:** `server/XoArena.Api/Program.cs`, `Services/InMemoryRoomStore.cs`
- **Risk:** Botlar veya kötü niyetli kullanıcılar 6 haneli rastgele kodlar üreterek aktif özel maçlara izinsiz sızabilir veya odaları kilitleyebilir.
- **Çözüm Planı:**
  - [x] `POST /api/rooms/{code}/join` endpoint'i IP başına dakikada 5 deneme ile sınırlandı (başarılı denemeler de sayılır).
  - [ ] İsteğe bağlı olarak özel odalar için 4 haneli PIN/Parola desteği eklenmesi.

### 5.4 — Production CORS & Domain Whitelist Kısıtlaması 🌐
- **İlgili Dosyalar:** `server/XoArena.Api/appsettings.json`, Ortam Değişkenleri
- **Risk:** API'nin başka yabancı web sitelerinden yetkisiz çağrılması (Cross-Origin Abuse).
- **Çözüm Planı:**
  - [x] Production'da aynı-origin App Service dağıtımı için `Cors:AllowedOrigins` boş bırakılarak çapraz-origin çağrılar varsayılan olarak reddediliyor; ayrı frontend için yalnızca resmi origin eklenmeli.
  - [x] Ortam değişkeni üzerinden (`CORS__ALLOWEDORIGINS__0=https://...`) dinamik origin yönetimi mevcut; aynı-origin dağıtımda ek origin gerekmez.

### 5.5 — Bellek Dayanıklılığı ve Sıfır Kesinti (State Resilience) 💾
- **İlgili Dosyalar:** `server/XoArena.Api/Services/`
- **Risk:** In-Memory yapı nedeniyle sunucu deploy veya yeniden başlatma anında tüm aktif maçlar anında silinir.
- **Çözüm Planı:**
  - [ ] İlerleyen aşamada odaların geçici durumunun Redis veya hafif bir önbellek servisi (Redis Backplane / Distributed Cache) ile izole edilmesi; böylece sunucu güncellense bile oyuncuların maçları kopmaz.

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
