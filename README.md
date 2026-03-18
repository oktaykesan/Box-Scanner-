# BoxScan — Akıllı Kutu Yönetim Sistemi

QR kod ve yapay zeka destekli depo/ambar içerik yönetimi. Kutunun fotoğrafını çek, Gemini içerikleri tanısın, QR etiket oluştur, tara ve detaylarına ulaş.

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Özellikler](#özellikler)
- [Sistem Mimarisi](#sistem-mimarisi)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Proje Yapısı](#proje-yapısı)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Referansı](#api-referansı)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Kullanım Akışları](#kullanım-akışları)
- [Tema Sistemi](#tema-sistemi)
- [Güvenlik](#güvenlik)
- [Bilinen Kısıtlamalar](#bilinen-kısıtlamalar)

---

## Genel Bakış

BoxScan, depolardaki kutulara yapay zeka ile içerik envanteri çıkaran ve QR kod ile erişim sağlayan tam yığın (full-stack) bir sistemdir. Kullanıcı bir kutunun fotoğrafını çeker; Google Gemini 2.5 Flash modeli fotoğrafı Türkçe analiz ederek içindeki nesneleri listeler, hasar/tehlike tespiti yapar ve konum önerisi sunar. Analiz onaylandıktan sonra kutu kaydedilir, benzersiz bir QR etiket oluşturulur ve sahaya basılır. Herhangi bir anda etiketi tarayan kullanıcı, kutunun tüm içeriğine anında ulaşır.

**Durum:** V1 MVP — Temel kullanım senaryosu için kararlı ve tam işlevsel.

---

## Özellikler

### Yapay Zeka Analizi
- **Google Gemini 2.5 Flash** ile fotoğraf tabanlı içerik tespiti
- Türkçe nesne adları ve kategori etiketleri
- Nesne bazında miktar tahmini ve güven seviyesi (`high` / `medium` / `low`)
- Otomatik hasar bayrağı (`damage_flag`) ve açıklaması
- Tehlikeli madde tespiti (`hazard_flag`): kimyasallar, kesiciler, yanıcılar
- Önerilen kutu adı ve depolama konumu

### QR Kod Ekosistemi
- Her kutu için benzersiz, kompakt JSON payload (`v`, `id`, `t`, `n`, `i`)
- Veri URL olarak QR kodu üretimi
- Expo Print entegrasyonu ile etiket bastırma
- QR tarama → anlık kutu detay sayfasına yönlendirme

### Kutu Yaşam Döngüsü
- Oluştur / Görüntüle / Düzenle / Sil (CRUD)
- Durum takibi: `active` | `archived` | `deleted`
- Son taranma zaman damgası
- Konum, not, kaynak metadata
- Tam denetim logu: `created` | `updated` | `scanned` | `deleted`

### Akıllı Arama
- Gemini tabanlı anlamsal (semantic) arama
- Kutu adı ve içerik listesi üzerinde çoklu alan araması
- Mock string eşleme ile yedek çalışma modu
- Eşleşme gerekçesi ve uygunluk skoru

### Tema Sistemi
- Açık / Koyu tema, sistem tercihi ile uyumlu
- Tüfek animasyonlu tema geçiş butonu
- Glow pulse animasyonu
- Kalıcı tema tercihi (AsyncStorage)

---

## Sistem Mimarisi

```
┌────────────────────────────────────────────────────────┐
│               MOBILE APP (React Native)                │
│   Expo Router · Reanimated · Zustand · Lucide Icons   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP + API Key
                ┌──────────▼──────────┐
                │   BACKEND (Hono)    │
                │  Node.js · TypeScript│
                └──────┬──────┬───────┘
                       │      │
          ┌────────────▼──┐  ┌▼──────────────┐
          │  SQLite DB    │  │  Google Gemini │
          │  (sql.js)     │  │  2.5 Flash API │
          └───────────────┘  └───────────────┘
                  │
          ┌───────▼────────┐
          │  Local Storage  │
          │  (uploads/)     │
          └────────────────┘
```

### Veri Akışı — Yeni Kutu Ekleme

```
Fotoğraf çek → POST /api/analyze → Gemini analizi
→ İçerik gözden geçir → Onayla → POST /api/boxes
→ QR oluştur → Etiketi yazdır → Sahaya dağıt
```

### Veri Akışı — QR Tarama

```
QR tara → JSON payload parse → POST /api/scan
→ last_scanned_at güncelle → audit log
→ GET /api/boxes/:id → Detay ekranı
```

---

## Teknoloji Yığını

### Mobile (React Native)

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| React Native | 0.81.5 | Mobil uygulama çatısı |
| React | 19.1.0 | UI katmanı |
| Expo | ~54.0.0 | Managed build, native modüller |
| Expo Router | ~6.0.23 | Dosya tabanlı yönlendirme |
| React Navigation Drawer | ^7.9.4 | Yan menü navigasyonu |
| React Native Reanimated | ~4.1.1 | Spring physics animasyonlar (60fps) |
| React Native Gesture Handler | ~2.28.0 | Dokunma ve hareket tanıma |
| Zustand | ^5.0.12 | Hafif global state yönetimi |
| AsyncStorage | 2.2.0 | Zustand için kalıcı depolama |
| Expo Camera | ~17.0.10 | Kamera erişimi ve QR tarama |
| Expo AV | ~16.0.8 | Ses geri bildirimi |
| Expo Haptics | ~15.0.8 | Titreşim geri bildirimi |
| Expo Print | ~15.0.8 | QR etiket yazdırma |
| Expo Secure Store | ~15.0.8 | Şifreli yerel depolama |
| Expo Linking | ~8.0.11 | Deep linking ve ayarlar açma |
| Expo Linear Gradient | ~15.0.8 | Degrade arkaplanlar |
| React Native SVG | 15.12.1 | SVG render |
| React Native Safe Area Context | ~5.6.0 | Çentik/notch güvenli alan |
| React Native Screens | ~4.16.0 | Doğal ekran optimizasyonu |
| Lucide React Native | ^0.577.0 | İkon kütüphanesi |
| Barlow Condensed | ^0.4.1 | Başlık fontu |
| DM Mono | ^0.4.2 | Veri/kod fontu |
| Inter | ^0.4.2 | Gövde fontu |
| TypeScript | ~5.9.2 | Tip güvenliği (strict mode) |

### Backend (Node.js)

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Node.js | 20+ | Çalışma zamanı |
| Hono | ^4.6.0 | HTTP framework (routing, middleware, CORS) |
| @hono/node-server | ^1.13.0 | Hono → Node.js HTTP adaptörü |
| @google/generative-ai | ^0.21.0 | Gemini API istemcisi |
| sql.js | ^1.11.0 | SQLite veritabanı motoru (JavaScript) |
| qrcode | ^1.5.4 | QR kodu veri URL olarak üretimi |
| uuid | ^11.0.0 | UUID v4 kimlik oluşturma |
| Zod | ^3.24.0 | Şema doğrulama ve tip çıkarımı |
| dotenv | ^16.4.0 | Ortam değişkeni yükleme |
| tsx | ^4.19.0 | Build adımı olmadan TS çalıştırma |
| TypeScript | ^5.7.0 | Tip sistemi ve derleme (strict mode) |

### Depolama & Altyapı

| Katman | Teknoloji | Notlar |
|--------|-----------|--------|
| Veritabanı | SQLite (sql.js) | `backend/boxscan.db` dosyası |
| Görüntü depolama | Yerel dosya sistemi | `backend/uploads/` klasörü |
| Ölçekleme yolu | PostgreSQL + S3 | Production geçiş için hazır |

---

## Proje Yapısı

```
QR/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts        # Veritabanı bağlantısı ve sorgu yardımcıları
│   │   │   ├── migrate.ts      # Başlangıçta otomatik çalışan migration
│   │   │   └── schema.ts       # Tablo tanımları
│   │   ├── lib/
│   │   │   ├── errors.ts       # Global hata yönetimi ve yanıt şekilleri
│   │   │   └── validation.ts   # Zod doğrulama yardımcıları
│   │   ├── middleware/
│   │   │   ├── auth.ts         # X-API-Key kimlik doğrulama
│   │   │   └── rateLimit.ts    # İstek hız sınırlama
│   │   ├── routes/
│   │   │   ├── boxes.ts        # CRUD + akıllı arama endpoint'leri
│   │   │   ├── analyze.ts      # Görüntü yükleme ve AI analizi
│   │   │   ├── scan.ts         # QR tarama kaydı
│   │   │   ├── qr.ts           # QR kodu üretimi
│   │   │   └── upload.ts       # Yalnızca görüntü yükleme
│   │   ├── services/
│   │   │   ├── ai.ts           # AI sağlayıcı yönlendirici (Gemini/Mock)
│   │   │   ├── geminiPrompt.ts # Gemini için prompt mühendisliği
│   │   │   ├── items.ts        # Nesne adı normalleştirme
│   │   │   ├── qr.ts           # QR payload oluşturma
│   │   │   └── storage.ts      # Dosya depolama yönetimi
│   │   ├── shared/
│   │   │   ├── schemas.ts      # Paylaşılan Zod şemaları
│   │   │   └── types.ts        # Paylaşılan TypeScript tipleri
│   │   └── index.ts            # Sunucu giriş noktası
│   ├── boxscan.db              # SQLite veritabanı dosyası
│   ├── tsconfig.json
│   └── package.json
│
├── mobile/
│   ├── app/                    # Expo Router ekranları
│   │   ├── _layout.tsx         # Kök düzen + Drawer menüsü
│   │   ├── index.tsx           # Ana sayfa / Dashboard
│   │   ├── camera.tsx          # Fotoğraf çekme ekranı
│   │   ├── scan.tsx            # QR tarayıcı ekranı
│   │   ├── review.tsx          # AI sonuç inceleme ekranı
│   │   ├── label.tsx           # QR etiket / yazdırma ekranı
│   │   ├── boxes.tsx           # Tüm kutular listesi
│   │   ├── settings.tsx        # Ayarlar ekranı
│   │   ├── +not-found.tsx      # 404 sayfası
│   │   └── box/[id].tsx        # Kutu detay ekranı
│   ├── components/             # Yeniden kullanılabilir bileşenler
│   │   ├── ThemeToggle/        # Animasyonlu tema geçiş butonu
│   │   │   ├── index.tsx
│   │   │   ├── RifleCanvas.tsx # Tüfek animasyon görseli
│   │   │   ├── types.ts
│   │   │   └── useThemeToggle.ts
│   │   ├── AIAnalysisToggle.tsx
│   │   ├── AlertBanner.tsx
│   │   ├── BoxCardThumbnail.tsx
│   │   ├── CrosshairOverlay.tsx
│   │   ├── DataRain.tsx
│   │   └── ParticlesOverlay.tsx
│   ├── constants/
│   │   ├── Colors.ts           # Renk paleti
│   │   ├── theme.ts            # Tasarım sistemi (spacing, typography, shadow, motion)
│   │   ├── config.ts           # Uygulama yapılandırması
│   │   └── useThemeColors.ts   # Dark/light tema hook'u
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Tema sağlayıcısı
│   ├── services/
│   │   └── api.ts              # API istemcisi (fetch + multipart upload)
│   ├── store/
│   │   └── useScanStore.ts     # Zustand store (tarama sonuçları)
│   ├── hooks/
│   │   └── useAIAudio.ts       # AI analizi sırasında ses geri bildirimi
│   ├── assets/
│   │   ├── images/             # İkonlar, splash ekranı, uygulama simgesi
│   │   ├── fonts/              # Özel fontlar
│   │   └── sounds/             # Ses dosyaları
│   ├── app.json                # Expo yapılandırması
│   ├── tsconfig.json
│   └── package.json
│
├── shared/
│   ├── schemas.ts              # Paylaşılan doğrulama şemaları
│   └── types.ts                # Paylaşılan TypeScript tipleri
│
└── package.json                # Monorepo workspace kökü
```

---

## Veritabanı Şeması

### `boxes`
| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | text PK | UUID v4 |
| `title` | text | Kutu adı |
| `qr_code` | text | JSON stringified QR payload |
| `location` | text | Depolama konumu |
| `notes` | text | Serbest notlar |
| `status` | text | `active` \| `archived` \| `deleted` |
| `source` | text | İçerik kaynağı (default: `mixed`) |
| `created_by` | text | Oluşturan kullanıcı/cihaz |
| `last_scanned_at` | text | Son QR taranma zamanı (ISO 8601) |
| `damage_flag` | boolean | Hasar tespit edildi mi? |
| `damage_notes` | text | Hasar açıklaması |
| `hazard_flag` | boolean | Tehlikeli madde var mı? |
| `hazard_notes` | text | Tehlike açıklaması |
| `summary` | text | AI özet metni |
| `created_at` | text | Oluşturma zamanı |
| `updated_at` | text | Son güncelleme zamanı |

### `box_images`
| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | text PK | UUID v4 |
| `box_id` | text FK | → boxes.id (cascade delete) |
| `image_url` | text | Görüntü dosya yolu |
| `is_primary` | boolean | Kapak fotoğrafı mı? |

### `box_items`
| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | text PK | UUID v4 |
| `box_id` | text FK | → boxes.id (cascade delete) |
| `name` | text | Nesne adı |
| `normalized_name` | text | Normalize edilmiş ad |
| `quantity` | integer | Adet (default: 1) |
| `category` | text | Kategori (default: `uncategorized`) |

### `analysis_runs`
| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | text PK | UUID v4 |
| `box_id` | text FK | → boxes.id (set null) |
| `image_id` | text FK | → box_images.id (set null) |
| `provider` | text | `gemini` \| `local` \| `mock` |
| `raw_response` | text | Modelin ham yanıtı |
| `parsed_json` | text | Parse edilmiş analiz |
| `status` | text | `success` \| `parse_error` \| `failed` |
| `error_message` | text | Hata detayı |
| `created_at` | text | Analiz zamanı |

### `box_events` — Denetim Logu
| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | text PK | UUID v4 |
| `box_id` | text FK | → boxes.id (cascade delete) |
| `event_type` | text | `created` \| `updated` \| `scanned` \| `deleted` |
| `payload` | text | Event metadatası (JSON) |
| `created_at` | text | Olay zamanı |

---

## API Referansı

Tüm endpoint'ler `X-API-Key` başlığı gerektirir.

### Kutular

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/boxes` | Liste (search, filter, sort, pagination) |
| `GET` | `/api/boxes/:id` | Detay (görüntüler ve nesneler dahil) |
| `GET` | `/api/boxes/search/smart` | Gemini destekli anlamsal arama |
| `POST` | `/api/boxes` | Yeni kutu oluştur (transaction) |
| `PUT` | `/api/boxes/:id` | Metadata güncelle |
| `DELETE` | `/api/boxes/:id` | Kutuyu sil (cascade) |

### Görüntü ve Analiz

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/analyze` | Multipart yükle → AI analizi → sonuç döndür |
| `POST` | `/api/upload` | Yalnızca görüntü yükle (analiz yok) |

### QR ve Tarama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/qr/:boxId` | QR kodu veri URL olarak üret |
| `POST` | `/api/scan` | QR tarama kaydı, `last_scanned_at` güncelle |

### Yanıt Formatı

```json
// Başarı
{ "success": true, "data": { ... } }

// Hata
{ "success": false, "error": "...", "code": "NOT_FOUND" }
```

---

## Kurulum

### Gereksinimler

- Node.js 20+
- npm 10+
- Google Gemini API anahtarı ([Google AI Studio](https://aistudio.google.com))
- Android/iOS cihaz veya emulator
- Expo Go uygulaması (fiziksel cihaz testi için)

### 1. Depoyu Klonla

```bash
git clone <repo-url>
cd QR
npm install
```

### 2. Backend Ortam Değişkenleri

```bash
cp backend/.env.example backend/.env
# .env dosyasını düzenle (bkz. Ortam Değişkenleri bölümü)
```

### 3. Backend'i Başlat

```bash
cd backend
npm run dev
# Sunucu http://localhost:3000 adresinde başlar
# Veritabanı migration otomatik uygulanır
```

### 4. Mobile Ortam Değişkenleri

```bash
cp mobile/.env.local.example mobile/.env.local
# API_BASE_URL ve API_KEY değerlerini gir
```

### 5. Mobile Uygulamayı Başlat

```bash
cd mobile
npm start
# Expo Go ile QR tarat veya emulator seç
```

---

## Ortam Değişkenleri

### Backend (`backend/.env`)

```env
# Sunucu
PORT=3000
APP_BASE_URL=http://192.168.1.x:3000

# Depolama
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# Yapay Zeka
AI_PROVIDER=gemini                  # gemini | local | mock
GEMINI_API_KEY=AIzaSy...            # Google AI Studio'dan alın
AI_GATEWAY_URL=                     # Yerel gateway için (isteğe bağlı)

# Güvenlik
API_SHARED_SECRET=<yüksek-entropi-rastgele-anahtar>
MAX_UPLOAD_MB=10

# CORS (virgülle ayrılmış)
CORS_ORIGINS=http://localhost:8081,exp://192.168.1.x:8081
```

### Mobile (`mobile/.env.local`)

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
EXPO_PUBLIC_API_KEY=<backend-ile-aynı-anahtar>
```

---

## Kullanım Akışları

### Yeni Kutu Kaydetme

1. Ana sayfadan **Yeni Kutu** butonuna dokun
2. Kamera açılır — kutunun içini fotoğrafla
3. AI analizi gerçekleşir (2–4 saniye)
4. Tespit edilen nesneler listelenir, hasar/tehlike bayrakları gösterilir
5. Gerekirse düzenle, **Onayla**'ya dokun
6. Kutu kaydedilir, QR kodu oluşturulur
7. **Etiketi Yazdır** ile kağıda bas, kutuya yapıştır

### QR Tarama

1. Ana sayfadan **Tara** butonuna dokun
2. QR etiketini kameraya tut
3. Sistem kutuyu anında bulur ve detay sayfasını açar

### Akıllı Arama

1. Ana sayfada arama çubuğuna yaz
2. Gemini toggle açıksa anlamsal arama yapılır
3. Kutu adı ve içerik listesinde eşleşmeler gösterilir

---

## Tema Sistemi

Tasarım, askeri/endüstriyel bir estetik üzerine kurulmuştur:

| Unsur | Detay |
|-------|-------|
| Birincil renk | Lazer kırmızı `#E63946` |
| Arkaplan | Koyu lacivert `#0B0E1A` |
| Tipografi (başlık) | Barlow Condensed |
| Tipografi (veri) | DM Mono |
| Tipografi (metin) | Inter |
| Spacing | 4pt grid sistemi |
| Animasyon | Spring physics (Reanimated v4) |
| Geçiş butonu | Tüfek animasyonu + glow pulse |
| Kalıcılık | AsyncStorage |

---

## Güvenlik

| Katman | Yöntem |
|--------|--------|
| Kimlik doğrulama | `X-API-Key` başlığı, paylaşılan sır |
| Hız sınırlama | Middleware — dakika başına istek limiti |
| CORS | Yapılandırılabilir kaynak listesi |
| Girdi doğrulama | Zod şemaları, tüm route'larda zorunlu |
| Dosya güvenliği | Path traversal koruması |
| Güvenli başlıklar | Hono `secureHeaders` middleware |
| Mobil depolama | Expo Secure Store (şifreli) |

---

## Bilinen Kısıtlamalar

| Alan | Mevcut Durum | Önerilen Geçiş |
|------|--------------|----------------|
| Veritabanı | SQLite (tek sunucu) | PostgreSQL |
| Görüntü depolama | Yerel dosya sistemi | AWS S3 / Cloudflare R2 |
| Kimlik doğrulama | Paylaşılan API anahtarı | JWT + kullanıcı rolleri (RBAC) |
| AI analiz hızı | 2–4 sn | Görüntü sıkıştırma, batch gönderim |
| Çevrimdışı mod | Backend bağlantısı zorunlu | Expo SQLite + offline senkronizasyon |
| Çok görüntülü analiz | Tek görüntü analizi | Çok açılı destek |
| Log altyapısı | Olay tablosu + konsol | Yapılandırılmış loglama (Pino) |
