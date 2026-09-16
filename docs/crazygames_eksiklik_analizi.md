# CrazyGames Uyum ve Eksiklik Tespit Raporu
## 2D Özel Güçlü & Online XOX Oyunu İçin Teknik İnceleme

### 1. CrazyGames İki Aşamalı Süreç (Basic vs Full Launch)
CrazyGames'e ilk gönderilen oyunlar iki aşamalı bir değerlendirmeden geçer:
*   **Basic Launch:** Oyununuz ilk etapta 7-21 gün boyunca sınırlı bir kitleye sunulur. Bu aşamada SDK entegrasyonu zorunlu değildir ve reklamlar kapalıdır. İlk yükleme boyutu **≤ 50MB** olmalıdır.
*   **Full Launch:** Eğer oyunun oynanma süresi ve oyuncu tutundurma (retention) metrikleri başarılı olursa oyun onaylanır. Bu aşamada reklamlar, kullanıcı hesapları ve çok oyunculu (multiplayer) modlar dahil olmak üzere tüm CrazyGames SDK entegrasyonları zorunlu hale gelir.

### 2. Sizin Oyununuz İçin Kritik Eksiklikler ve Kontrol Listesi

#### A. Multiplayer ve Online Oda Sistemleri (En Kritik Alan)
*   **Oda Durum Senkronizasyonu (`updateRoom`):** CrazyGames SDK'sındaki en güncel multiplayer gereksinimi, oyuncunun oda durumunu platforma bildirmektir. Oyuncunun bulunduğu odanın benzersiz kimliğini (ID) ve odanın yeni oyunculara açık olup olmadığını (`isJoinable: true/false`) bildirmek için `window.CrazyGames.SDK.game.updateRoom()` işlevini entegre etmelisiniz.
*   **CrazyGames UI Entegrasyonu & `inviteParams`:** Harici (WhatsApp, Discord vb.) link oluşturma mekanizmaları yerine, oyuncuların arkadaşlarını direkt CrazyGames arayüzünden davet edebilmesi için `inviteParams` parametrelerini beslemelisiniz. Davet linkine tıklayıp gelen oyuncular için başlangıçtaki lobi/onboarding sahneleri doğrudan geçilebilir (skippable) olmalıdır.
*   **Raundlar Arası Odada Kalma:** Bir XOX maçı bittiğinde veya taraflardan biri özel güçle kazandığında oda hemen kapatılmamalıdır. Oyuncuların aynı oda içinde kalarak yeniden maç ("Rematch") yapabilmesi CrazyGames'in temel kullanıcı deneyimi şartlarındandır.
*   **Sohbet Engelleme Tercihi (`disableChat`):** Eğer oyununuzda oyuncuların birbiriyle yazışabildiği bir oda içi chat varsa, platformun ayarlarındaki `disableChat` tercihini dinlemeli ve bu değer aktifse oyun içi sohbet modülünü otomatik olarak kapatmalısınız.

#### B. Teknik ve Cihaz Uyumluluğu
*   **Duyarlı Tasarım (Responsive Layout):** XOX tahtasının yerleşimi ve özel güç butonları, CrazyGames'in standart iframe çözünürlüklerinde (`907x510 px`, `1216x684 px` ve tam ekran modunda `1920x1080 px`) kırpılma veya taşma yapmadan düzgün ölçeklenmelidir.
*   **Düşük Donanım ve Chromebook Desteği:** CrazyGames kitlesinin büyük bir bölümü Chromebook kullanmaktadır. Oyununuzun **4GB RAM'e sahip standart bir Chromebook (Chromium OS)** üzerinde pürüzsüzce çalışması istenir. Aksi halde oyun bu işletim sistemlerinde platform tarafından otomatik engellenir.
*   **Ekran Kontrolleri Kısıtlaması:** Oyununuzun ana menüsüne ya da köşelerine kesinlikle manuel bir "Fullscreen" (Tam Ekran) butonu eklemeyin. Platform bu özelliği kendi iframe dış çerçevesinde sunduğundan, oyun içi tam ekran butonları doğrudan **reddedilme (QA rejection)** sebebidir.

#### C. Güvenlik, Hile Engelleme ve Özel Güç Analizi
*   **Yetkili Sunucu Yapısı (Authoritative Server):** JavaScript tabanlı web oyunlarında istemci (client) tarafındaki tüm veriler tarayıcı konsolundan manipüle edilebilir. Özel güçlerin bekleme süreleri (cooldown), tur süreleri ve tahtadaki taş konumları kesinlikle istemci tarafında hesaplanmamalı; her hamle Socket.io veya Colyseus sunucunuz tarafından doğrulanıp onaylanmalıdır.
*   **Skor ve Sıralama Güvenliği (Leaderboards API):** Eğer oyunda en çok kazananlar gibi bir liderlik tablosu planlıyorsanız, skorları güvenli sunucu (server-to-server) API'si üzerinden 32-byte base64 formatındaki **API Key** ile iletmelisiniz. İstemci tarafı gönderimlerde ise hileli skorları önlemek adına **Encryption Key** entegrasyonu yapmalısınız.

#### D. Reklam ve Akış Yönetimi (Ad & Loading Requirements)
*   **Yükleme Durumları:** Oyunun ilk açılış hızı metriklerini ölçmek için yükleme ekranı başladığında `loadingStart()`, oyun tamamen hazır olduğunda ise `loadingStop()` çağrılmalıdır.
*   **Oyun Döngüsü Bildirimi:** Oyuncular eşleştiğinde ve XOX tahtasında ilk hamle başladığında `gameplayStart()` fonksiyonu tetiklenmelidir. Bu, platformun arka plandaki reklam algoritmasını optimize etmesini sağlar. Ayrıca oyunun ilk 10 saniyesi boyunca hiçbir video reklam tetiklenemez.

---
*Bu rapor, CrazyGames Geliştirici Dokümantasyonu (CrazyGames SDK v3 / HTML5 v2) standartlarına göre oyununuzun mimari eksikliklerini kapatmanız için rehber olarak oluşturulmuştur.*
