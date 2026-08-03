# XO Arena Backlog

Bu dosya, XO Arena için tamamlanan özellikleri, planlanan sürümleri ve geliştirme notlarını tutar.

## Tamamlanan Özellikler

- [x] 3x3, 4x4 ve 5x5 tahta seçenekleri
- [x] Klasik mod için 3, 5, 7 ve 9 tur hedefleri
- [x] Arena mod için puan hedefleri
- [x] Bomba gücü
- [x] Kalkan gücü
- [x] Boost/çarpan gücü
- [x] Joker gücü
- [x] Güçlerin açılıp kapatılabilmesi
- [x] Çarpanlı hücrelerin açılıp kapatılabilmesi
- [x] Rastgele kazanan mesajları
- [x] Kazanan hücre animasyonları
- [x] GitHub Pages deployment
- [x] GitHub Actions ile otomatik deployment
- [x] CSP'nin yalnızca production build sırasında uygulanması

## v1.0.1 - Stabilizasyon ve Kullanıcı Deneyimi

- [ ] Uygulama genelinde `Round` yerine `Tur` kullanılacak.
- [ ] Mobilde “Nasıl oynanır?” panelinin ilk açıldığında görünür olması sağlanacak.
- [ ] Modal açıldığında arka plan scroll'u kilitlenecek.
- [ ] Farklı telefonlarda yazı tipi ve emoji görünümü test edilecek.
- [ ] Emoji görünmediğinde kullanılabilecek fallback gösterimler eklenecek.
- [ ] 320px, 390px, tablet ve masaüstü genişliklerinde responsive test yapılacak.

### Tur Sonucu Modalı

Her turun sonunda oyun tahtasının üzerinde sonuç modalı gösterilecek.

- [ ] Tur numarası gösterilecek.
- [ ] Kazanan oyuncunun X veya O sembolü gösterilecek.
- [ ] Güncel skor gösterilecek.
- [ ] Rastgele kazanma mesajı gösterilecek.
- [ ] Kullanıcı `Sonraki Tur` düğmesine basmadan tahta sıfırlanmayacak.
- [ ] `Menü` düğmesi mevcut ayarlara dönüş onayına bağlanacak.
- [ ] Beraberlik için ayrı sonuç görünümü hazırlanacak.
- [ ] Maç hedefi tamamlandıysa `Maç Sonucu` görünümü gösterilecek.
- [ ] Maç sonucunda `Yeni Maç` ve `Menü` seçenekleri sunulacak.
- [ ] Modal mobil ekranlarda taşmayacak.
- [ ] Modal klavye ve ekran okuyucu erişilebilirliğini destekleyecek.
- [ ] Animasyonlar `prefers-reduced-motion` tercihini destekleyecek.

## v1.1.0 - Arena UX ve Oyun Dengesi

- [ ] Arena ekranındaki görsel yoğunluk azaltılacak.
- [ ] Güç panelleri daha kompakt hâle getirilecek.
- [ ] Arena ayarlarının oyun sırasında kapladığı alan azaltılacak.
- [ ] Puan ve çarpan sistemi daha açık anlatılacak.
- [ ] Joker'in rakip taşını doğrudan dönüştürme davranışı dengelenecek.
- [ ] Joker için geçerli hedef bulunmadığında güç devre dışı gösterilecek.
- [ ] X ve O için eşit oyun koşulları test edilecek.
- [ ] Güçlerin farklı tahta boyutlarındaki dengesi test edilecek.

## v1.2.0 - Oyun Motoru ve Testler

- [ ] Oyun kuralları React state yönetiminden ayrılacak.
- [ ] Başlangıç oyun state'i için saf fonksiyon oluşturulacak.
- [ ] Geçerli hamleleri hesaplayan fonksiyon oluşturulacak.
- [ ] Hamle uygulama fonksiyonu oluşturulacak.
- [ ] Güç kullanımını doğrulayan ve uygulayan fonksiyonlar oluşturulacak.
- [ ] Tur ve maç sonucunu hesaplayan fonksiyonlar oluşturulacak.
- [ ] Yeni tur başlatma fonksiyonu oluşturulacak.
- [ ] Oyun state'ini serialize/deserialize eden yapı hazırlanacak.
- [ ] Klasik mod kuralları için unit testler yazılacak.
- [ ] Arena güçleri ve puan sistemi için unit testler yazılacak.

## v1.3.0 - Klasik Mod Yapay Zekâsı

Yapay zekâ tarayıcıda yerel olarak çalışacak. Ücretli veya üretken AI API'si kullanılmayacak.

- [ ] Oyuncuya `İki Kişilik` ve `Yapay Zekâya Karşı` seçenekleri sunulacak.
- [ ] Oyuncu X veya O seçebilecek.
- [ ] Yapay zekânın hamlesi sırasında kısa düşünme efekti gösterilecek.

### Zorluk Seviyeleri

- [ ] Kolay: Geçerli hamleler arasından rastgele seçim yapacak.
- [ ] Orta: Kazanma, engelleme, merkez ve köşe önceliklerini kullanacak.
- [ ] Zor: 3x3 için minimax ve alpha-beta pruning kullanacak.
- [ ] 4x4 ve 5x5 için derinlik sınırlı arama ve heuristic değerlendirme kullanılacak.
- [ ] Aynı oyun durumunda geçersiz hamle üretmediği test edilecek.

### Yapay Zekâ Karakterleri

- [ ] Zorluk seviyeleri için karakter seçimi tasarlanacak.
- [ ] Karakterlere konuşma balonları eklenecek.
- [ ] Mesajların oyun akışını yavaşlatmaması sağlanacak.
- [ ] Mesajlarda tekrar azaltma sistemi uygulanacak.

Örnek mesajlar:

- Kolay: “Hâlâ butonları öğrenmeye çalışıyorum...”
- Orta: “Fark etmediğimi mi sandın? O hamleni engelliyorum!”
- Zor: “Olasılıkları hesapladım. Bu iş senin için pek iyi görünmüyor.”

> Not: Kusursuz 3x3 yapay zekâsı yenilmeyebilir ancak iki taraf da kusursuz oynarsa sonuç beraberlik olur.

## v1.4.0 - Arena Yapay Zekâsı

- [ ] Yapay zekâ geçerli güç aksiyonlarını değerlendirecek.
- [ ] Bomba ve Joker'i kazanma veya kritik engelleme amacıyla kullanacak.
- [ ] Kalkan kullanımında tehdit altındaki taşlara öncelik verecek.
- [ ] Boost kullanımında puan potansiyelini değerlendirecek.
- [ ] Güçler kapalı olduğunda klasik hamle sistemine dönecek.
- [ ] Arena AI performansı 3x3, 4x4 ve 5x5 tahtalarda test edilecek.

## v2.0.0 - Online Oda Sistemi

İlk online sürüm kullanıcı hesabı gerektirmeden iki kişilik oyun sunacak.

- [ ] Oyuncu adı girişi
- [ ] Oda oluşturma
- [ ] Kısa oda kodu üretme
- [ ] Oda koduyla katılma
- [ ] Oyuncuları X ve O olarak belirleme
- [ ] Gerçek zamanlı hamle iletişimi
- [ ] Hamlelerin sunucu tarafından doğrulanması
- [ ] Geçersiz ve sıra dışı hamlelerin engellenmesi
- [ ] Bağlantı kopması ve yeniden bağlanma
- [ ] Rakibin odadan ayrıldığının gösterilmesi
- [ ] Oda state'inin sunucuda authoritative olarak tutulması
- [ ] Temel rate limiting ve oda temizleme sistemi

## v2.1.0 - Takım ve Turnuva Sistemi

- [ ] En fazla 6 kişilik oda
- [ ] Oyuncuların takımları kendilerinin seçebilmesi
- [ ] Rastgele takım oluşturma
- [ ] 3'e 3 takım desteği
- [ ] Karşılaşmalarda X ve O taraflarının sırayla değiştirilmesi
- [ ] Oyuncu isimlerinin skor ve eşleşme ekranında gösterilmesi
- [ ] Turnuva eşleşme akışı
- [ ] Takım puan tablosu
- [ ] Oda yöneticisi kontrolleri
- [ ] İzleyici modu değerlendirmesi

## Daha Sonraki Sürümler

### Dil Desteği

- [ ] Türkçe metinlerin tek bir sözlük yapısına taşınması
- [ ] İngilizce dil desteği
- [ ] Dil değiştirme seçeneği

### Ses ve Efektler

- [ ] Hamle sesi
- [ ] Güç kullanım sesleri
- [ ] Tur kazanma sesi
- [ ] Maç kazanma sesi
- [ ] Sesleri açma/kapatma seçeneği
- [ ] Kısa kutlama efekti veya konfeti
- [ ]  Anlık Tepkiler (Emotes): Maç sırasında oyuncular birbirine anlık olarak gülen yüz, kızgın surat veya "Harika Hamle!" gibi emojiler atabilsin. Bu, sessiz bir oyuna can verir ve yayıncıların yayında komik tepkiler vermesini sağlar.

### Özelleştirme

- [ ] Kullanıcının kazanma çizgisi uzunluğunu seçebilmesi
- [ ] Yeni tahta boyutlarının değerlendirilmesi
- [ ] Oyuncu profilinin değerlendirilmesi
- [ ] Tema ve karakter seçenekleri

### Ticari Özellikler

- [ ] Oyun dengesi ve kullanıcı geri bildirimleri toplandıktan sonra gelir modeli değerlendirilecek.
- [ ] Reklamların oyun deneyimini bozmayacağı yerleşimler araştırılacak.
- [ ] Ticari kullanıma uygun hosting ve yasal gereklilikler incelenecek.

## Güç Sistemi Kararı

### Classic PvC
- Adaptif AI kullanılacak.

### Arena Local PvP
- Bomba, Kalkan, Boost, Joker aktif.
- Tuzak kullanılmayacak; çünkü local aynı ekranda gizli bilgi korunamaz.

### Arena PvC
- Bomba, Kalkan, Boost, Tuzak aktif.
- Joker, Freeze ve Çarpan Çal ileride reklam/ödül gücü olarak değerlendirilecek.

### Online Arena
- Bomba, Kalkan, Boost, Tuzak aktif.
- Joker online modda kullanılmayacak; çünkü çok güçlü ve rekabet dengesini bozabilir.
### 
Rekabeti Kızıştır (Liderlik Tablosu ve Unvanlar)
Anlık Liderlik Tablosu: Her gün, her hafta kimin birinci olduğu sitenin ana sayfasında devasa bir şekilde görünsün.

Komik Unvanlar: 10 maç üst üste kazanana "Seri Katil", 10 maç kaybedene "Kum Torbası" gibi komik unvanlar ver ve bu unvanları oyuncu profillerinde göster. İnsanlar bu unvanları almak veya o unvana sahip birini yenmek için daha fazla oynayacaktır.