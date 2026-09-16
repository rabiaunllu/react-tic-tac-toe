# 2D Online & Özel Güçlü XOX Oyun Geliştirme Eklenti Listesi

Bu liste; **2D, özel güç mekanikli ve online oda sistemine (multiplayer)** sahip XOX (Tic-Tac-Toe) oyununuz için özel olarak seçilmiş eklentileri, kütüphaneleri ve araçları içerir.

---

## 1. Online Oda Sistemi & Network Eklentileri
Oyunun eş zamanlı (real-time) çalışması ve oda yönetimi için en popüler WebSocket tabanlı kütüphaneler:

* **Colyseus (JS/TS):** Çok oyunculu web oyunları için özel olarak tasarlanmış, hazır oda (room) yönetimi ve durum senkronizasyonu (state sync) sunan harika bir framework'tür.
* **Socket.io:** WebSockets tabanlı, odalar (rooms) oluşturmanıza ve oyuncuları bu odalara eşlemenize (matchmaking) yarayan en popüler, esnek ve genel amaçlı kütüphanedir.
* **Geckos.io:** WebRTC protokolünü kullanarak UDP benzeri çok hızlı bir veri aktarımı sağlar. XOX gibi sıra tabanlı oyunlarda şart olmasa da anlık tepki süresi (low-latency) için güçlü bir alternatiftir.

## 2. 2D Oyun Motorları & Görsel Eklentiler
XOX tahtasını, animasyonları ve özel güç efektlerini yönetmek için tarayıcı eklentileri ve motorlar:

* **Phaser 3:** 2D web oyunları için endüstri standardıdır. Özel güçlerin parçacık (particle) efektleri, buton animasyonları ve tahta yerleşimi için mükemmel bir seçenektir.
* **PixiJS:** Sadece görsel render (çizim) odaklı çalışan, çok hızlı bir 2D kütüphanesidir. Kendi oyun mantığınızı kurup sadece güçlü bir arayüz çizdirmek istiyorsanız idealdir.
* **Spine / DragonBones Figma Eklentileri:** Özel güç kullanıldığında (örneğin tahtayı patlatan bir bomba veya hamle dondurma efekti) karakterlerinize veya sembollerinize 2D iskelet animasyonu yaptırmak için kullanılır.

## 3. UI/UX Tasarım Eklentileri (Figma)
XOX tahtası, oda kurma ekranı ve özel güç butonlarının tasarımı için:

* **Anima (Figma to Code):** Tasarladığınız oda listesi, lobi ve XOX arayüzünü doğrudan temiz HTML/CSS koduna dönüştürür.
* **Iconify:** Özel güç butonları için (donma, ekstra hak, bomba, vb.) binlerce ücretsiz vektörel ikonu Figma içerisine anında aktarmanızı sağlar.
* **Sprite Sheet Exporter:** Özel güçlerin patlama veya parlama gibi ardışık 2D animasyon karelerini tek bir görsel haritası (sprite sheet) halinde dışa aktarır.

## 4. Geliştirme Ortamı (VS Code) Eklentileri
Kodlama ve test sürecini hızlandıran editör araçları:

* **Phaser 3 Snippets / Types:** Kod yazarken fonksiyonları otomatik tamamlayarak özel güç mekaniklerini hızlıca kodlamanızı sağlar.
* **Live Server:** Yazdığınız XOX oyununu tek tıkla yerel sunucuda açarak, farklı tarayıcı sekmelerinde iki oyuncu gibi test etmenize olanak tanır.
* **Console Ninja:** Tarayıcıdaki oyuncu bağlantı veya "Oda Oluşturuldu" loglarını doğrudan VS Code editörünüzün içinde görmenizi sağlar.

## 5. Ses & Efekt Yönetimi (Özel Güçler İçin)
XOX oyununda sıradanlığı kıracak özel güç ses efektleri için:

* **Howler.js:** Tüm tarayıcılarda sorunsuz çalışan, özel güç kullanıldığında tetiklenecek 2D ses efektlerini (patlama, büyü, süre azaldı uyarısı) yöneten en iyi ses kütüphanesidir.