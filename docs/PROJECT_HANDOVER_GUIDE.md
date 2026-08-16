# 🚀 XO Arena - Kapsamlı Geliştirici Devir, Mimari ve Yayın Rehberi (Master Handover Guide)

Bu doküman, **XO Arena** projesini devralacak yazılım geliştirici, UI/UX tasarımcısı, oyun geliştiricisi ve ürün yöneticisi (Product Owner) için hazırlanmış **birleştirilmiş ana devir ve geliştirme rehberidir**.

Projenin oyun konsepti, teknik mimarisi, klasör yapısı, mekanikleri, mevcut performans/güvenlik sorunları ve **Poki / CrazyGames web portalları ile canlıya çıkış & para kazanma (monetizasyon) stratejileri** tüm detaylarıyla aşağıda toplanmıştır.

---

## 📑 İÇİNDEKİLER
1. [Proje Genel Bakışı (Project Overview)](#1-proje-genel-bakışı-project-overview)
2. [Teknoloji Yığını ve Mimari (Tech Stack & Architecture)](#2-teknoloji-yığını-ve-mimari-tech-stack--architecture)
3. [Klasör Yapısı ve Dosya Sorumlulukları (Directory Structure)](#3-klasör-yapısı-ve-dosya-sorumlulukları-directory-structure)
4. [Oyun Mekanikleri ve Güç Matrisi (Game Mechanics & Powers)](#4-oyun-mekanikleri-ve-güç-matrisi-game-mechanics--powers)
5. [UI / UX Tasarım Değerlendirmesi](#5-ui--ux-tasarım-değerlendirmesi)
6. [Performans Analizi (Kasmalar, Takılmalar ve Sebepleri)](#6-performans-analizi-kasmalar-takılmalar-ve-sebepleri)
7. [Güvenlik Açıkları ve Risk Analizi (Security Audit)](#7-güvenlik-açıkları-ve-risk-analizi-security-audit)
8. [Web Portalları (Poki / CrazyGames) ve Para Kazanma Stratejisi](#8-web-portalları-poki--crazygames-ve-para-kazanma-stratejisi)
9. [Gelecek Aşama: İleri Düzey Ticari Altyapı (Faz 2 - DB, Auth & Anti-Cheat)](#9-gelecek-aşama-i̇leri-düzey-ticari-altyapı-faz-2---db-auth--anti-cheat)
10. [Kurulum ve Çalıştırma Rehberi (Developer Setup)](#10-kurulum-ve-çalıştırma-rehberi-developer-setup)
11. [Geliştirici İçin Birleştirilmiş Eylem Planı (Developer Checklist)](#11-geliştirici-i̇çin-birleştirilmiş-eylem-planı-developer-checklist)

---

## 📌 1. Proje Genel Bakışı (Project Overview)

**XO Arena**, geleneksel 3x3 Tic-Tac-Toe (XOX) mantığını modern strateji, özel güçler, puan çarpanları ve dinamik kart/tahta dinamikleriyle buluşturan rekabetçi bir web/mobil oyun projesidir.

* **Oyun Modları:**
  * **Klasik Mod:** 3x3, 4x4 veya 5x5 boyutlarında geleneksel XOX kuralları.
  * **Arena Modu:** Çarpanlı kareler (2x, 3x), özel güç kullanımı (Bomba, Kalkan, Joker, Boost, Tuzak, Freeze, Vampir) ve puan hedefleri içeren mod.
* **Oynama Seçenekleri:** 
  * Tek Oyunculu (Yerel AI - Adaptif Zorluk Seviyesi)
  * Aynı Cihazda İki Oyunculu (Local Pass & Play)
  * Çevrimiçi Çok Oyunculu (Online Multiplayer - Oda Kodu ile SignalR WebSockets)

---

##  2. Teknoloji Yığını ve Mimari (Tech Stack & Architecture)

###  Frontend (İstemci)
* **Framework / Kütüphane:** React 19, Vite 8
* **Stil & Tasarım:** Vanilla CSS (`src/App.css`, `src/index.css`)
* **Ses & Efekt:** Web Audio API (`src/game/soundManager.js`)
* **State & Oturum:** React Local State + Session Storage Entegrasyonu (`src/sessionStorage.js`)
* **API / İletişim:** Fetch API + SignalR Client (`@microsoft/signalr`)

###  Backend (Sunucu - `server/XoArena.Api`)
* **Framework:** .NET 9 ASP.NET Core Minimal API
* **Gerçek Zamanlı İletişim:** ASP.NET Core SignalR (`RoomsHub.cs`)
* **State Yönetimi (In-Memory):** Thread-safe `ConcurrentDictionary` (`InMemoryRoomStore.cs`)
* **Deployment Hedefi:** Azure App Service (Single Host: Single Azure Web App serving both API and built React SPA frontend)

---

## 3. Klasör Yapısı ve Dosya Sorumlulukları (Directory Structure)

```text
react-tic-tac-toe/
├── docs/                      # Azure dağıtım rehberi ve geliştirme backlog'u
│   ├── AZURE_DEPLOYMENT.md    # Azure yayınlama ve smoke test kılavuzu
│   └── BACKLOG.md             # Gelecek özellikler listesi
├── public/                    # Statik dosyalar, robots.txt, sitemap.xml
├── server/
│   └── XoArena.Api/           # .NET 9 Backend Web API & SignalR Projesi
│       ├── Contracts/         # DTO / Request-Response Modelleri
│       ├── Hubs/              # SignalR RoomsHub (Gerçek zamanlı oda iletişimi)
│       ├── Models/            # Room, Player, GameState domain modelleri
│       ├── Services/          # InMemoryRoomStore & IRoomStore mantığı
│       └── Program.cs         # API Route ve DI Konfigürasyonları
├── src/                       # React İstemci Kaynak Kodları
│   ├── api/                   # REST API ve SignalR istemci çağrıları (roomsApi.js)
│   ├── components/            # React UI Bileşenleri
│   │   ├── Board.jsx          # Oyun tahtası bileşeni
│   │   ├── Square.jsx         # Hücre bileşeni (Çarpan, Kalkan, Güç ikonları)
│   │   ├── GameSetup.jsx      # Oyun başlangıç ve ayar menüsü
│   │   ├── OnlineGame.jsx     # Çevrimiçi lobi ve oyun ekranı
│   │   ├── PowerPanel.jsx     # Güç kullanma paneli
│   │   ├── ArenaSettings.jsx  # Arena oyun parametreleri
│   │   ├── RoundResultModal.jsx # Round bitiş modali
│   │   └── ...                # SoundToggle, WinConfetti, ErrorBoundary vb.
│   ├── game/                  # Oyun Mantığı ve Motoru
│   │   ├── aiPlayer.js        # 7 Seviyeli Adaptif AI Bot Mantığı
│   │   ├── gameLogic.js       # Kazanma çizgisi, puan hesabı, skor kontrolü
│   │   ├── powers.js          # Özel güç tanımları ve hak yönetimi
│   │   ├── soundManager.js    # Web Audio API tabanlı ses yöneticisi
│   │   └── messages.js        # Kazanma/kaybetme oyun içi dinamik mesajları
│   ├── App.jsx                # Ana Uygulama Mantığı ve State Yönetimi (Kritik)
│   ├── App.css                # Tüm UI/UX stilleri, animasyonlar ve efektler (119 KB)
│   ├── index.css              # Temel reset ve font ayarları
│   └── main.jsx               # React DOM render başlangıcı
└── vite.config.js             # Vite yapılandırması
```

---

## 🎮 4. Oyun Mekanikleri ve Güç Matrisi (Game Mechanics & Powers)

| Güç Adı | Açıklama | Kurallar & Sınırlamalar |
| :--- | :--- | :--- |
| **Bomba (Bomb)** | Seçilen dolu bir hücredeki taşı siler. | Kalkanlı hücrede çalışmaz. Hamle sayılır, sıra rakibe geçer. |
| **Kalkan (Shield)** | Oyuncunun kendi taşını bombaya karşı korur. | Boş veya rakip hücresine koyulamaz. Hamle sayılır, sıra geçer. |
| **Joker** | Boş hücreye taş koyar VEYA rakip taşını kendi taşına dönüştürür. | Kalkanlı hücrede çalışmaz. Hamle sayılır, sıra geçer. |
| **Boost** | Bir hücreyi puan katlayıcı (ekstra skor) hale getirir. | **Free Action:** Hamle sayılmaz, sıra değişmez. Hücreye taş koyunca görünür olur. |
| **Tuzak (Trap)** | Boş bir hücreye gizli tuzak kurar. | Rakip o kareye basarsa sırası yanar. |
| **Dondurma (Freeze)**| Rakibin 1 tur boyunca güç kullanmasını engeller. | Hamle yerine geçer. |
| **Vampir (Vampire)**| Rakibin skorundan/çarpanından puan çalar. | Arena modunda geçerlidir. |

---

## 🎨 5. UI / UX Tasarım Değerlendirmesi

### 🟢 Güçlü Yönler
* **Neon Arena Estetiği:** Renk paleti (Cyan, Pink, Purple accents) ve karanlık cyberpunk teması oyunun rekabetçi ruhuna uyum sağlıyor.
* **Görsel Geri Bildirimler:** Güç paneli ikonları, roket/bomba rozetleri ve skor paneli belirgin.
* **Ses Entegrasyonu:** Tıklama ve kazanma durumlarındaki ses efektleri oyun hissini (game feel) güçlendiriyor.

### 🔴 UX/UI Aksayan ve Geliştirilmesi Gereken Noktalar
1. **Ekran Kartı & Mobil Duyarlılık (Responsive Layout):** `4x4` ve `5x5` tahta boyutlarına geçildiğinde kareler küçülüyor. Çarpan sayıları (2x, 3x) ve aktif güç ikonları mobilde birbirinin üstüne biniyor.
2. **Aktif Güç Seçim Durumu (Selected Power Indicator):** Bir güce tıklandığında (örneğin *Bomba* veya *Kalkan*), hangi gücün aktif olduğunu gösteren görsel vurgu mobilde dokunmatik kullanımda yetersiz kalıyor.
3. **AI Düşünme Göstergesi:** AI hamle yaparken 400-700ms arası bekletiliyor ancak UI üzerinde "AI Düşünüyor..." görsel mikro-animasyonu olmadığı için kullanıcı oyun kilitlendi sanabiliyor.
4. **Bağlantı Kopma UX'i (Disconnect Grace Period):** Online modda rakip koptuğunda verilen 30 saniyelik geri sayım süresi oyun tahtası üzerinde HUD/Countdown olarak gösterilmeli.

---

## ⚡ 6. Performans Analizi (Kasmalar, Takılmalar ve Sebepleri)

Uygulama çalışırken özellikle mobilde veya orta segment cihazlarda yaşanan FPS düşüşleri ve kasmaların **3 temel teknik nedeni** tespit edilmiştir:

### 🚨 1. Aşırı Ağır CSS Yapısı (`src/App.css` - 119 KB / 5.598 Satır)
* **Nedeni:** `App.css` içinde onlarca `@keyframes`, yoğun `backdrop-filter: blur(16px)`, ağır `box-shadow` ve katmanlı `radial-gradient` görsel efektleri tanımlanmış.
* **Kasma Sebebi:** `backdrop-filter: blur()` ve çoklu `box-shadow` özellikleri mobil GPU ve webview katmanlarında her hamlede ağır **GPU Compositing & Repaint** yükü oluşturur. FPS 60'tan 15-20 seviyelerine düşer.

### 🚨 2. React Re-render Fırtınası (`App.jsx`)
* **Nedeni:** `App.jsx` içerisinde 30'dan fazla `useState` tek bir bileşendedir. Her hücre tıklamasında tüm uygulama baştan aşağı re-render olur. `Square` ve `Board` bileşenlerinde `React.memo` eksiktir.

### 🚨 3. AI Hesaplamalarının UI Thread'inde Çalışması (`aiPlayer.js`)
* **Nedeni:** AI karar mekanizması (`getAdaptiveAiMove` ve `getArenaAiPowerAction`) senkronize olarak çalışmaktadır. 4x4 veya 5x5 boyutlarında hamle ararken ekran 100-300ms arası kilitlenmektedir (Jank).

---

## 🛡️ 7. Güvenlik Açıkları ve Risk Analizi (Security Audit)

1. **In-Memory Room Leak ve DoS (Denial of Service):** `InMemoryRoomStore.cs` zamanı dolan odaları yalnızca yeni oda açılırken temizler. Otomatik scriptlerle binlerce oda açıldığında sunucu RAM'i tükenebilir.
2. **Rate Limiting Eksikliği:** `Program.cs` üzerinde IP veya Session bazlı Rate Limiting yoktur. Spam isteklere açıktır.
3. **Oyuncu Kimlik Sahteciliği (Player Impersonation):** `PlayerId` isteklerde düz `Guid` string olarak gonderilmektedir. Başkasının ID'si ile hamle yapılabilir.

---

## 🕹️ 8. Web Portalları (Poki / CrazyGames) ve Para Kazanma Stratejisi

> 🎯 **ÖNEMLİ STRATEJİ:** Poki, CrazyGames ve kişisel web sitelerinde yayınlanacak ilk aşama için **Veritabanı (DB) ve Üyelik/Giriş (Auth) sistemlerine HİÇ GEREK YOKTUR.**

Web portallarında oyuncular "Frictionless Play" (Anında Oyna) ister. Önüne kayıt ekranı çıkan kullanıcıların %80'i oyunu terk eder.

### 💰 Poki & Web Yayınında Para Nasıl Kazanılır?
1. **Geçiş Reklamları (Commercial / Interstitial Ads):** Her 2-3 maç sonunda Poki SDK (`PokiSDK.commercialBreak()`) tetiklenerek reklam gösterilir.
2. **Ödüllü Video Reklamları (Rewarded Ads):** Oyuncu kendi isteğiyle reklam izleyerek maça ekstra Joker/Bomba gücüyle başlar veya kaybedilen maçı devam ettirir (`PokiSDK.rewardedBreak()`).

### 🛠️ Poki & Web Portalları İçin Şart Olan 4 Geliştirme:
* **Poki SDK Entegrasyonu:** `PokiSDK.init()` ve ad break çağrılarının bağlanması.
* **Reklam Esnasında Mute & Pause:** Reklam oynatılırken `soundManager.js` seslerinin susturulması ve zamanlayıcının durdurulması.
* **5 Saniye Akıllı AI Fallback (Hızlı Oyna):** Çevrimiçi eşleşmede 5 saniye içinde canlı rakip bulunamazsa, arka planda otomatik **AI Botun (`aiPlayer.js`) gerçek oyuncu gibi maça girmesi**.
* **Responsive Iframe Uyumlaştırma:** Oyunu `100vw x 100vh` iframe sınırlarına oturtmak.

---

## 🚀 9. Gelecek Aşama: İleri Düzey Ticari Altyapı (Faz 2 - DB, Auth & Anti-Cheat)

İlerleyen aşamada oyun mobil uygulama (iOS / Android Native) veya kendi bağımsız ekosistemine dönüştürüleceğinde kurulması gerekecek sistemler:

1. **PostgreSQL / SQL Server Entegrasyonu:** Oyuncu seviyeleri, XP, kazanılan coinler ve envanter veritabanında saklanır.
2. **Google / Apple OAuth2 Auth System:** Oyuncu hesap oluşturup farklı cihazlardan hesabına girebilir.
3. **Server-Authoritative Anti-Cheat:** Kazanma ve skor hesaplamaları tamamen sunucuya (.NET) taşınarak hilelerin önüne geçilir.
4. **Redis Backplane & ELO Matchmaking:** Binlerce anlık oyuncu için yatay ölçeklenme ve dereceli eşleşme sistemi.

---

## 🛠️ 10. Kurulum ve Çalıştırma Rehberi (Developer Setup)

### Gereksinimler
* Node.js v18+ 
* .NET 9 SDK

### 1. Bağımlılıkları Yükleyin
```bash
# Frontend bağımlılıkları
npm install

# Backend bağımlılıklarını geri yükleyin
cd server/XoArena.Api
dotnet restore
cd ../..
```

### 2. Geliştirme Sunucularını Başlatın

**A. Backend API & SignalR Sunucusu:**
```bash
cd server/XoArena.Api
dotnet run
```

**B. Frontend Vite Dev Server (Port: 5173):**
```bash
# Ana dizinde
npm run dev
```

Tarayıcıda `http://localhost:5173` adresine giderek oyunu test edebilirsiniz.

---

## 📋 11. Geliştirici İçin Birleştirilmiş Eylem Planı (Developer Checklist)

```mermaid
flowchart TD
    subgraph Faz 1: Poki & Web Canlıya Çıkış (İlk Hedef)
        A1[App.css GPU Optimizasyonu - Kasma Çözümü] --> A2[Square & Board React.memo]
        A2 --> A3[Poki/CrazyGames SDK Entegrasyonu]
        A3 --> A4[Reklam esnasında Mute & Pause]
        A4 --> A5[5 sn Instant Match & AI Fallback]
    end
    subgraph Faz 2: Sunucu Güvenliği
        B1[Background Room Cleaner Service] --> B2[ASP.NET Core Rate Limiter]
    end
    subgraph Faz 3: İleri Ticari Ölçeklenme (Opsiyonel)
        C1[PostgreSQL / EF Core DB] --> C2[Server-Authoritative Anti-Cheat]
        C2 --> C3[Redis Backplane & ELO Matchmaking]
    end
    Faz 1 --> Faz 2 --> Faz 3
```

---

> **Özet:** Projeyi devralan kişi veritabanı veya üyelik sistemleriyle vakit kaybetmeden doğrudan **CSS performans optimizasyonu, Poki SDK entegrasyonu ve akıllı AI fallback** üzerine odaklanmalıdır. Oyun bu adımlarla hızla canlıya çıkıp reklam geliri üretmeye başlayabilir.
