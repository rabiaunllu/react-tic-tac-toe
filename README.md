# XO Arena

XO Arena, klasik Tic Tac Toe mantığını Arena modu, özel güçler, çarpanlı hücreler ve puan hedefleriyle genişletmeyi amaçlayan bir React oyun projesidir.

## Oyun Modları

### Klasik Mod

Klasik modda oyun geleneksel Tic Tac Toe mantığıyla oynanır.

- X ve O sırayla hamle yapar.
- 3 aynı sembolü yatay, dikey veya çapraz hizalayan oyuncu round'u kazanır.
- Kazanan oyuncu 1 puan alır.
- Özel güçler ve çarpanlı hücreler kullanılmaz.

### Arena Mod

Arena mod, klasik oyuna özel güçler ve puan çarpanları ekler.

- Oyuncular sırayla hamle yapar.
- Kazanan çizgideki hücreler puan hesabına katılır.
- Normal hücre 1 puan değerindedir.
- 2x hücre 2 puan, 3x hücre 3 puan verir.
- Boostlu hücre kazanan çizgideyse kendi hücre puanını 2 katına çıkarır.
- Arena ayarlarından özel güçler, çarpanlı hücreler ve Boost modu değiştirilebilir.

## Özel Güçler

### Bomba

Bomba, dolu ve kalkansız herhangi bir hücredeki taşı kaldırır.

- Kendi taşını veya rakibin taşını silebilir.
- Boş hücrede çalışmaz.
- Kalkanlı hücrede çalışmaz.
- Başarılı kullanım hamle sayılır ve sıra rakibe geçer.

### Kalkan

Kalkan, oyuncunun kendi taşını bombaya karşı korur.

- Sadece kendi taşına uygulanabilir.
- Boş hücreye veya rakip taşına uygulanamaz.
- Kalkanlı taş bomba ile silinemez.
- Başarılı kullanım hamle sayılır ve sıra rakibe geçer.

### Joker

Joker, oyuncunun boş bir hücreye taş koymasını veya rakip taşını kendi taşına çevirmesini sağlar.

- Kendi taşının olduğu hücrede çalışmaz.
- Kalkanlı hücrede çalışmaz.
- Başarılı kullanım hamle sayılır ve sıra rakibe geçer.

### Boost

Boost, bir hücreyi ekstra puanlı hale getirir.

- Boost hamle sayılmaz.
- Başarılı kullanımda sıra değişmez.
- Boostlu hücre kazanan çizgideyse hücre puanı 2 katına çıkar.
- Kişi başına 1 Boost hakkı vardır.

Boost iki modda çalışır:

- **Rastgele:** Sistem boş bir hücreyi gizlice boostlar. Hücreye taş koyulunca Boost görünür hale gelir.
- **Seçimli:** Oyuncu boostlanacak boş hücreyi kendisi seçer. Seçilen hücre hemen görünür olur.

## Arena Ayarları

Arena ayarları oyun başlamadan önce seçilebilir. Oyun başladıktan sonra ayar değiştirmek istenirse kullanıcıdan onay alınır ve mevcut oyun sıfırlanır.

Skor korunur; sadece oyun tahtası, sıra, aktif güçler, kalkanlar, boostlar ve güç hakları yenilenir.

## Planlanan Özellikler

- Responsive mobil/masaüstü arayüz
- Klasik mod için round hedefi
- Arena mod için puan hedefi
- Custom tahta boyutu: 4x4, 5x5
- Türkçe/İngilizce dil desteği
- Oda koduyla online oynama
- Turnuva mantığı

###
hepimizn bildiği klasik xox oyunun kurallarını bastan yazdıgımız xo arena işte karşınızda. beyin gucumuzu sonuna kadra aktif edeceğimiz, özel güçlerimizle kendi stratejimi geliştirceğimiz, rekabeti sevenler için işte karşınızd arena. 