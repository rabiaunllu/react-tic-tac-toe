# CrazyGames için 2D Özel Güçlü & Online XOX Oyun Analizi

Bu rapor, özel güç mekaniklerine ve online oda (multiplayer) sistemine sahip **2D XOX oyununuzun** [CrazyGames](https://developer.crazygames.com/) platform gereksinimlerine uygunluğunu, tasarım standartlarını ve kritik güvenlik açıklarını incelemektedir.

---

## 1. CrazyGames Platform Uygunluk Analizi
Oyununuzun CrazyGames onay sürecinden (QA) hızlıca geçebilmesi için aşağıdaki teknik ve oynanış kriterlerini karşılaması gerekir:

### ⚙️ Teknik Gereksinimler
* **Dosya Boyutu Sınırları:** İlk yükleme boyutu **≤ 50MB**, toplam paket boyutu ise **≤ 250MB** olmalıdır. Toplam dosya sayısı 1500'ü geçmemelidir.
* **CrazyGames SDK Entegrasyonu:** Reklam gelirleri ve multiplayer davet linkleri için platformun resmi SDK'sı zorunludur. `gameplayStart()` event'i kullanıcı lobi/menüden çıkıp odaya girdiğinde tetiklenmelidir.
* **Tam Ekran Butonu Yasağı:** CrazyGames kendi arayüzünde otomatik tam ekran seçeneği sunduğu için oyun içine **özel tam ekran (fullscreen) butonu koymamalısınız**; bu durum doğrudan ret nedenidir.
* **Çapraz Promosyon (Cross-Promotion):** Oyunun içine başka platformların linklerini veya kendi sitenizin reklamlarını eklememelisiniz.

### 🎮 Oynanış ve Kullanıcı Deneyimi (UX)
* **Oda Davet Sistemi (Invite Link):** CrazyGames multiplayer oyunlarda arkadaş davet etme özelliğini destekler. `window.CrazyGames.SDK.game.inviteButton()` fonksiyonunu kullanarak oyuncuların oda linkini kopyalayıp arkadaşlarına atabilmesini sağlamalısınız.
* **Diller (Localization):** Sistem diline göre otomatik dil seçimi sunulmalı, yoksa varsayılan dil **İngilizce** olmalıdır.
* **Cihaz Uyumluluğu:** Oyun hem masaüstü (klavye/fare) hem de mobil (dokunmatik) cihazlarda rahatça oynanabilmelidir (Mobile ana sayfaya çıkmak için ilk indirme boyutu ≤ 20MB olmalıdır).

---

## 2. Tasarım ve Arayüz (UI/UX) Analizi
XOX basit bir oyun olsa da, **özel güçler** ve **online sistem** işin içine girdiğinde tasarım karmaşıklaşabilir:

* **Özel Güçlerin Belirginliği:** Oyuncunun elindeki özel gücü ne zaman ve nasıl kullanacağı net olmalıdır. Cooldown (bekleme süresi) veya enerji/mana barları XOX tahtasının çevresinde karmaşaya yol açmayacak şekilde minimalist tasarlanmalıdır.
* **Oda Listesi ve Eşleşme (Matchmaking) Ekranı:** Boş odaların listesi, "Hızlı Eşleşme" butonu ve ping durumları kullanıcıyı yormayan temiz bir lobi tasarımıyla sunulmalıdır.
* **Geri Bildirimler (Feedback Loops):** Bir oyuncu özel güç kullandığında (örneğin rakibin hamlesini dondurma veya silme), ekranda anlık görsel bir efekt (parlama, patlama) ve net bir metin uyarısı çıkmalıdır. Aksi takdirde online senkronizasyon hatası veya hile hissi uyanır.

---

## 3. Güvenlik Açığı (Security) Analizi
Online ve rekabetçi web oyunlarında en sık karşılaşılan sorun hile (cheating) ve veri manipülasyonudur. Oyununuz tarayıcı üzerinde (Client-side) çalıştığı için şu noktalara dikkat etmelisiniz:

### 🚨 Kritik Riskler ve Önlemler
* **Yetki Tamamen Sunucuda Olmalı (Authoritative Server):** "X oyuncusu özel güç kullandı", "Y oyuncusu XOX yaptı" gibi kararlar kesinlikle tarayıcı tarafında (JavaScript ile) verilmemelidir. Client sadece talebi göndermeli, hamlenin geçerliliğini ve özel gücün varlığını **Node.js/Socket.io/Colyseus sunucusu kontrol etmelidir**.
* **Zamanlama Hileleri (Speedhack):** Sunucu, iki hamle arasında geçen minimum süreyi doğrulamalıdır. Client tarafındaki sayaç manipüle edilerek arka arkaya özel güç basılması sunucu doğrulamasıyla engellenmelidir.
* **Kod Karıştırma (Obfuscation):** JavaScript kodunuz tarayıcıda tamamen açıktır. Kaynak kodunuzu tersine mühendisliğe karşı korumak için yayına almadan önce **Webpack**, **Terser** veya **JavaScript Obfuscator** gibi araçlarla şifrelemeli/karıştırmalısınız.
* **Giriş Doğrulaması (Input Validation):** Online odalara gönderilen her veri paketinin (payload) formatı sunucu tarafında sıkı bir filtrelemeden geçirilmelidir. SQL Injection veya NoSQL Injection açıklarına karşı hamle verileri sanitize edilmelidir.

---

## 4. Geliştirici Kontrol Listesi (Checklist)

| Kriter | Durum | Dikkat Edilmesi Gereken Nokta |
| :--- | :---: | :--- |
| **SDK Entegrasyonu** | ⬜ | `gameplayStart` ve `gameplayStop` eventleri eklendi mi? |
| **Boyut Kontrolü** | ⬜ | İlk yükleme < 50MB mı? |
| **Sunucu Güvenliği** | ⬜ | Tüm oyun mantığı sunucu tarafında mı doğrulanıyor? |
| **Arayüz** | ⬜ | In-game tam ekran (fullscreen) butonu kaldırıldı mı? |
| **Multiplayer Link** | ⬜ | CrazyGames Invite Link API'si entegre edildi mi? |