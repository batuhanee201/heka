# Heka API — Kodlama Planı

> Fastify + TypeScript + Supabase tabanlı REST API uygulama planı.
> Bu doküman yalnızca mimari kararları, dizin yapısını ve uygulama sırasını tanımlar; kod içermez.

---

## 1. Proje Dizin Yapısı

```
heka-api/
├── package.json                        — Bağımlılıklar, script tanımları
├── tsconfig.json                       — TypeScript derleyici ayarları (strict: true)
├── tsconfig.build.json                 — Production build için tsconfig uzantısı (test dosyaları hariç)
├── .env                                — Yerel ortam değişkenleri (git'e eklenmez)
├── .env.example                        — Değişken şablonu (dokümantasyon amaçlı)
├── .eslintrc.json                      — ESLint kuralları
├── .prettierrc                         — Kod biçimlendirme kuralları
├── vitest.config.ts                    — Vitest test yapılandırması
│
├── src/
│   ├── server.ts                       — HTTP sunucusunu başlatan giriş noktası; PORT dinleme, graceful shutdown
│   ├── app.ts                          — Fastify instance oluşturma, tüm plugin ve route kayıtları; test edilebilir factory fonksiyonu
│   │
│   ├── config/
│   │   └── env.ts                      — @fastify/env şeması; tüm ortam değişkenlerinin Zod ile doğrulanması ve tip çıkarımı
│   │
│   ├── plugins/
│   │   ├── cors.ts                     — @fastify/cors konfigürasyonu; origin whitelist, credentials, max-age
│   │   ├── rate-limit.ts               — @fastify/rate-limit global varsayılan; endpoint bazlı overrides için yardımcı factory
│   │   ├── multipart.ts                — @fastify/multipart konfigürasyonu; dosya boyutu sınırı, MIME kısıtı
│   │   ├── supabase.ts                 — Supabase JS Client singleton (service_role anahtarı); fastify.supabase dekoratörü
│   │   └── auth.ts                     — JWT doğrulama dekoratörü; fastify.authenticate ve fastify.authorize(roles[]) preHandler'ları
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts          — Tüm /v1/auth/** route tanımları; hangi preHandler'ların bağlandığı
│   │   │   ├── auth.controller.ts      — Request parse, response formatlama, service çağrısı; hata yakalamaz (middleware'e bırakır)
│   │   │   ├── auth.service.ts         — İş mantığı: argon2 hash/verify, token üretimi, OTP işlemleri, session yönetimi
│   │   │   ├── auth.repository.ts      — Supabase sorguları: users, sessions, otp_verifications, rate_limit_logs CRUD
│   │   │   └── auth.schema.ts          — Zod şemaları: RegisterDto, LoginDto, RefreshDto, OtpDto, UpdateProfileDto ve bunların TypeScript tipleri
│   │   │
│   │   ├── product/
│   │   │   ├── brand/
│   │   │   │   ├── brand.routes.ts     — /v1/brands route'ları
│   │   │   │   ├── brand.controller.ts
│   │   │   │   ├── brand.service.ts
│   │   │   │   ├── brand.repository.ts
│   │   │   │   └── brand.schema.ts     — CreateBrandDto, UpdateBrandDto, BrandResponse Zod şemaları
│   │   │   ├── category/
│   │   │   │   ├── category.routes.ts  — /v1/categories route'ları; tree endpoint dahil
│   │   │   │   ├── category.controller.ts
│   │   │   │   ├── category.service.ts — Döngüsel bağımlılık kontrolü, derinlik sınırı (maks 5)
│   │   │   │   ├── category.repository.ts — Öz-referanslı hiyerarşik sorgu mantığı
│   │   │   │   └── category.schema.ts
│   │   │   ├── product/
│   │   │   │   ├── product.routes.ts   — /v1/products ve /v1/products/:id/** route'ları
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.service.ts  — Ürün oluşturma, güncelleme, soft-delete; teknik detay ve display koordinasyonu
│   │   │   │   ├── product.repository.ts — Filtreleme (socket_type, energy_class, dimmable vb.), cursor pagination
│   │   │   │   └── product.schema.ts
│   │   │   ├── technical-detail/
│   │   │   │   ├── technical-detail.routes.ts — /v1/products/:id/technical-details
│   │   │   │   ├── technical-detail.controller.ts
│   │   │   │   ├── technical-detail.service.ts
│   │   │   │   ├── technical-detail.repository.ts
│   │   │   │   └── technical-detail.schema.ts
│   │   │   └── display/
│   │   │       ├── display.routes.ts   — /v1/products/:id/display
│   │   │       ├── display.controller.ts
│   │   │       ├── display.service.ts
│   │   │       ├── display.repository.ts
│   │   │       └── display.schema.ts
│   │   │
│   │   ├── catalog/
│   │   │   ├── catalog/
│   │   │   │   ├── catalog.routes.ts   — /v1/catalogs route'ları
│   │   │   │   ├── catalog.controller.ts
│   │   │   │   ├── catalog.service.ts  — Durum geçişleri (draft→active→archived), boş katalog yayımlama engeli
│   │   │   │   ├── catalog.repository.ts
│   │   │   │   └── catalog.schema.ts
│   │   │   ├── catalog-item/
│   │   │   │   ├── catalog-item.routes.ts  — /v1/catalogs/:id/items ve reorder
│   │   │   │   ├── catalog-item.controller.ts
│   │   │   │   ├── catalog-item.service.ts — Sıralama (sort_order) ve reorder mantığı
│   │   │   │   ├── catalog-item.repository.ts
│   │   │   │   └── catalog-item.schema.ts
│   │   │   └── pricing/
│   │   │       ├── pricing.routes.ts   — /v1/catalogs/:id/pricing ve /v1/products/:id/pricing
│   │   │       ├── pricing.controller.ts
│   │   │       ├── pricing.service.ts  — Tarih aralığı çakışma kontrolü
│   │   │       ├── pricing.repository.ts
│   │   │       └── pricing.schema.ts
│   │   │
│   │   ├── files/
│   │   │   ├── files.routes.ts         — /v1/files route'ları
│   │   │   ├── files.controller.ts
│   │   │   ├── files.service.ts        — Supabase Storage yükleme, MIME doğrulama, signed URL üretimi
│   │   │   ├── files.repository.ts     — files ve file_relations CRUD, polimorfik sorgu
│   │   │   └── files.schema.ts
│   │   │
│   │   └── admin/
│   │       ├── admin.routes.ts         — /v1/admin/** route'ları; tümü admin rolü gerektirir
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts        — Kullanıcı yönetimi, rol atama, son admin koruma kuralı
│   │       ├── admin.repository.ts     — Kullanıcı, rol, audit_log sorguları
│   │       └── admin.schema.ts
│   │
│   └── shared/
│       ├── errors/
│       │   ├── app-error.ts            — AppError sınıfı; code, message, statusCode, details alanları
│       │   ├── error-handler.ts        — Fastify setErrorHandler; AppError, ZodError, Supabase hataları → standart yanıt
│       │   └── error-codes.ts          — Tüm hata kodu sabitlerinin type-safe enum/const tanımı
│       ├── hooks/
│       │   ├── audit-log.hook.ts       — onResponse hook; POST/PATCH/PUT/DELETE sonrası audit_logs kaydı
│       │   └── request-id.hook.ts      — onRequest hook; her isteğe X-Request-ID atar (ulid)
│       ├── types/
│       │   ├── fastify.d.ts            — Fastify instance dekoratör tip genişlemeleri (request.user, fastify.supabase vb.)
│       │   ├── auth.types.ts           — JwtPayload, AuthUser, SessionContext tipleri
│       │   └── pagination.types.ts     — CursorPayload, PaginationMeta, PaginatedResponse<T> tipleri
│       └── utils/
│           ├── pagination.ts           — Cursor encode/decode (Base64URL), buildCursorQuery yardımcısı
│           ├── response.ts             — success(), paginated() standart yanıt sarmalayıcıları
│           ├── hash.ts                 — argon2 hash ve verify sarmalayıcıları
│           └── crypto.ts              — Güvenli rastgele token üretimi (crypto.randomBytes → hex)
│
└── tests/
    ├── setup.ts                        — Vitest global setup; test Supabase client, seed ve temizleme yardımcıları
    ├── fixtures/
    │   ├── users.fixture.ts            — Test kullanıcıları ve rolleri
    │   ├── products.fixture.ts         — Test ürünleri, markaları, kategorileri
    │   └── catalogs.fixture.ts         — Test katalogları ve fiyatları
    └── helpers/
        ├── auth.helper.ts              — Test JWT üretimi, oturum kurma yardımcıları
        └── request.helper.ts           — Fastify inject sarmalayıcısı, tip destekli istek yardımcıları
```

---

## 2. Katman Mimarisi

### Bağımlılık Yönü

```
Route → Controller → Service → Repository → Supabase Client
```

Bağımlılık her zaman bir üst katmandan bir alt katmana doğrudur. Repository hiçbir zaman Service'i, Service hiçbir zaman Controller'ı import etmez. Shared modüller tüm katmanlar tarafından kullanılabilir.

---

### Route Katmanı (`*.routes.ts`)

**Sorumlulukları:**
- Fastify route tanımlamaları (`fastify.get`, `fastify.post` vb.)
- URL prefix ve versiyonlama (`/v1/...`)
- preHandler zincirinin kurulumu: rate-limit → authenticate → authorize(roles) → validate
- Controller fonksiyonlarının handler olarak bağlanması
- Route bazlı rate-limit override konfigürasyonu

**Kısıtlamalar:**
- İş mantığı içermez
- Validation şemalarını tanımlamaz, sadece import eder ve bağlar
- Response formatlamaz

---

### Controller Katmanı (`*.controller.ts`)

**Sorumlulukları:**
- `request.body`, `request.params`, `request.query`'den DTO oluşturma
- Zod şeması ile giriş doğrulama (parse, throw on error)
- Service metodunu çağırma
- Service sonucunu `shared/utils/response.ts` yardımcıları ile HTTP yanıtına dönüştürme
- HTTP status kodunu belirleme (201, 204 vb.)
- Cookie set/clear (refresh token)

**Kısıtlamalar:**
- İş mantığı içermez
- Veritabanı detaylarından habersizdir
- Hataları yakalamaz; fırlatır (global error handler devralır)

---

### Service Katmanı (`*.service.ts`)

**Sorumlulukları:**
- Uygulama iş kurallarının uygulanması
- Birden fazla repository metodunu koordine etme
- Transaction yönetimi (Supabase RPC veya manuel begin/commit)
- Harici servis entegrasyonları (e-posta, SMS)
- Argon2 hash/verify, JWT üretimi gibi kriptografik operasyonlar
- İş seviyesi doğrulama (domain validation): döngüsel kategori, boş katalog yayımlama, son admin koruması vb.

**Kısıtlamalar:**
- HTTP kavramlarını (request, response, status code) bilmez
- Supabase client'ı doğrudan çağırmaz; repository üzerinden erişir
- Zod şema doğrulaması yapmaz (bu controller'ın sorumluluğu)

---

### Repository Katmanı (`*.repository.ts`)

**Sorumlulukları:**
- Supabase JS Client üzerinden tüm veritabanı operasyonları
- Karmaşık filtreleme, cursor pagination sorgu oluşturma
- Supabase hata kodlarını `AppError`'a çevirme
- Dönen ham veriyi domain tipine dönüştürme (DTO mapping)
- Soft-delete filtreleme (her sorguda `deleted_at IS NULL` garantisi)

**Kısıtlamalar:**
- İş kuralı uygulamaz
- Diğer repository'leri import etmez (Service katmanı koordinasyonu yapar)
- HTTP veya Fastify kavramlarından habersizdir

---

### Schema Katmanı (`*.schema.ts`)

**Sorumlulukları:**
- Zod ile giriş DTO şemalarının tanımlanması (request body, query params, path params)
- TypeScript tiplerinin Zod şemalarından çıkarılması (`z.infer`)
- Yanıt tiplerinin tanımlanması (domain model tipleri)
- Validation kuralları: min/max uzunluk, regex pattern, enum değerleri

**Kısıtlamalar:**
- İş mantığı içermez
- Supabase veya Fastify'a bağımlı değildir
- Saf TypeScript/Zod'dur; her yerde import edilebilir

---

## 3. Teknoloji Kararları ve Gerekçeleri

| Paket | Versiyon Tercihi | Gerekçe | Reddedilen Alternatif |
|---|---|---|---|
| `fastify` | v5 | En yüksek Node.js HTTP throughput; plugin sistemi; TypeScript desteği birinci sınıf; Pino entegrasyonu dahili | Express: daha yavaş, middleware ekosistemi dağınık. Hono: edge-first, Node.js için olgunlaşmamış |
| `@supabase/supabase-js` | v2 | Projenin zaten Supabase kullandığı kesin; client tüm Supabase servislerini (DB, Storage, Auth) tek arayüzden sunar | Doğrudan `pg` / `postgres.js`: Storage ve Auth entegrasyonu elle yapılmak zorunda kalır |
| `zod` | v3 | TypeScript öncelikli validation; `z.infer` ile şema → tip dönüşümü otomatik; runtime ve derleme zamanı güvenliği bir arada; hata mesajları özelleştirilebilir | Fastify JSON Schema: TypeScript tipleri manuel yazılmalı; joi: daha eski ekosistem, TypeScript desteği sonradan eklendi |
| `argon2` | latest (Node binding) | OWASP tarafından şifre hashing için önerilen birincil algoritma; argon2id bellek-zor ve yan-kanal saldırılarına dayanıklı; bcrypt'e kıyasla modern | bcrypt: 72 karakter sınırı, GPU saldırısına daha açık. scrypt: manuel parametre yönetimi karmaşık |
| `jose` | v5 | RFC uyumlu JWT/JWS işlemleri; WebCrypto API kullanır; ES module native; Node.js 18+ için optimize | jsonwebtoken: CommonJS, WebCrypto kullanmaz, eski API. fast-jwt: daha az yaygın, ekosistem riski |
| `@fastify/rate-limit` | latest | Fastify plugin ekosistemiyle tam entegrasyon; store (Redis/memory) değiştirilebilir; route bazlı override desteği | express-rate-limit: Fastify ile uyumsuz. Manuel implementasyon: bakım yükü yüksek |
| `@fastify/cors` | latest | Fastify'ın resmi CORS plugin'i; origin fonksiyon desteği (dinamik whitelist); credentials header yönetimi | cors (npm): Express odaklı, Fastify uyumluluğu sarmalama gerektirir |
| `@fastify/multipart` | latest | Fastify'ın resmi multipart plugin'i; stream tabanlı yükleme (belleğe almadan Supabase Storage'a aktarabilir); dosya boyutu limiti konfigürasyonu | multer: Express odaklı. busboy: alt seviye, sarmalama kodu gerektirir |
| `pino` | Fastify dahili | Fastify'ın dahili logger'ı; JSON structured logging; production'da `pino-pretty` olmadan çalışır; yüksek performans | winston: daha ağır, Fastify entegrasyonu manuel. morgan: HTTP odaklı, structured logging zayıf |
| `vitest` | latest | Vite ekosistemi; Jest uyumlu API; TypeScript without config; watch modu hızlı; `vi.mock` modülü | Jest: ts-jest yapılandırması gerektirir; daha yavaş başlangıç. Mocha: assertion kütüphanesi ayrı, yapılandırma daha karmaşık |
| `@fastify/env` | latest | Fastify plugin olarak env doğrulama; `fastify.config` dekoratörü ile tüm uygulama boyunca tip güvenli erişim | dotenv alone: runtime doğrulama yok, typo'lar production'da patlar. envalid: Fastify entegrasyonu yok |
| `ulid` | latest | Request ID olarak kullanım; zaman sıralı, URL-safe, 128-bit; UUID v4'e kıyasla log sıralaması için daha uygundur | UUID v4: rastgele, log'larda zaman sıralama yok. nanoid: daha kısa ama özel karakter içerebilir |

---

## 4. Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu | Varsayılan |
|---|---|---|---|
| `NODE_ENV` | Ortam modu: `development`, `test`, `production` | Evet | — |
| `PORT` | HTTP sunucusunun dinleyeceği port | Hayır | `3000` |
| `HOST` | HTTP sunucusunun bind adresi | Hayır | `0.0.0.0` |
| `SUPABASE_URL` | Supabase proje URL'i (örn: `https://xyz.supabase.co`) | Evet | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role anahtarı; RLS'yi atlar, server-side kullanım için | Evet | — |
| `SUPABASE_ANON_KEY` | Anon/public anahtar; client tarafı operasyonlar için (dosya signed URL vb.) | Evet | — |
| `JWT_SECRET` | Access token imzalama sırrı; en az 32 karakter rastgele string | Evet | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token geçerlilik süresi (saniye cinsinden) | Hayır | `900` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token geçerlilik süresi (gün cinsinden) | Hayır | `30` |
| `ARGON2_MEMORY_COST` | argon2id bellek maliyeti (KB); OWASP önerisi: 19456 (19 MB) | Hayır | `19456` |
| `ARGON2_TIME_COST` | argon2id iterasyon sayısı | Hayır | `2` |
| `ARGON2_PARALLELISM` | argon2id paralellik derecesi | Hayır | `1` |
| `CORS_ALLOWED_ORIGINS` | İzin verilen origin'lerin virgülle ayrılmış listesi | Evet | — |
| `RATE_LIMIT_MAX` | Global varsayılan rate limit (istek/pencere) | Hayır | `120` |
| `RATE_LIMIT_WINDOW_MS` | Global rate limit pencere süresi (ms) | Hayır | `60000` |
| `LOG_LEVEL` | Pino log seviyesi: `trace`, `debug`, `info`, `warn`, `error` | Hayır | `info` |
| `REQUEST_TIMEOUT_MS` | Fastify global request timeout (ms) | Hayır | `30000` |
| `STORAGE_MAX_FILE_SIZE_MB` | Dosya yükleme maksimum boyutu (MB) | Hayır | `50` |
| `STORAGE_ALLOWED_MIME_TYPES` | İzin verilen MIME türleri, virgülle ayrılmış | Hayır | `image/jpeg,image/png,image/webp,application/pdf` |

---

## 5. Plugin Kayıt Sırası

Fastify plugin sistemi, `fastify-plugin` ile kapsamı kırılmadıkça her plugin kendi encapsulated scope'unda çalışır. Sıra kritiktir çünkü sonraki plugin'ler önceki plugin'lerin eklediği dekoratörlere ve hook'lara bağımlıdır.

### Doğru Kayıt Sırası

```
1. @fastify/env                    — Tüm ortam değişkenleri doğrulanır ve fastify.config dekoratörü eklenir.
                                     Diğer tüm plugin'ler bu değişkenlere ihtiyaç duyar.

2. Request ID Hook                 — onRequest hook'u olarak eklenir; her isteğe ulid tabanlı X-Request-ID atar.
                                     Loglar bu ID ile ilişkilendirilir; hata yanıtlarında request_id alanı buradan gelir.

3. @fastify/cors                   — Preflight (OPTIONS) istekleri auth kontrolünden önce yanıtlanmalıdır.
                                     Auth middleware'inden önce kayıtlı olmalı; aksi hâlde OPTIONS 401 döner.

4. @fastify/rate-limit (global)    — Global varsayılan limit burada kurulur.
                                     Auth öncesinde olmalı; kimlik doğrulaması yapılmamış istekleri de kapsar (login, register vb.).

5. supabase.ts plugin              — fastify.supabase dekoratörü eklenir.
                                     Sonraki plugin olan auth.ts bu dekoratöre bağımlıdır.

6. auth.ts plugin                  — fastify.authenticate ve fastify.authorize preHandler'ları eklenir.
                                     supabase.ts'den sonra gelmeli; token doğrulama için supabase client kullanılabilir.
                                     Route kayıtlarından önce hazır olmalı.

7. @fastify/multipart              — Dosya yükleme route'larından önce kayıtlı olmalı.
                                     Auth'dan sonra; çünkü multipart endpoint'leri korumalıdır.

8. Route kayıtları (auth modülü)   — Public endpoint'ler (register, login, forgot-password vb.) önce tanımlanır.
                                     onRequest hook'ları zaten aktif; rate-limit ve CORS çalışıyor.

9. Route kayıtları (diğer modüller) — product, catalog, files, admin route'ları.
                                      authenticate + authorize preHandler'ları her route'a bağlanır.

10. Global Error Handler            — setErrorHandler son olarak kurulur; tüm route'ları kapsayabilmesi için.
```

### Neden Sıra Önemli?

- Fastify, `decorate` ile eklenen dekoratörleri kayıt anında kontrol eder. Bir plugin henüz eklenmemiş dekoratörü kullanmaya çalışırsa `FST_ERR_DEC_MISSING_DEPENDENCY` hatası fırlatır.
- Hook'lar kayıt sırasına göre çalışır. `onRequest` hook'larının doğru sırada çalışması için plugin kayıt sırası doğru olmalıdır.
- CORS'un auth'dan önce gelmesi, tarayıcıların preflight isteğine 401 almamasını sağlar; bu olmadan frontend hiçbir zaman gerçek isteği gönderemez.

---

## 6. Auth Akışı Uygulama Detayları

### Access Token

**Payload Yapısı:**
```
{
  sub: string        — Kullanıcı UUID (users.id)
  email: string      — Kullanıcı e-postası
  role: string       — Birincil rol adı (admin | manager | viewer)
  iat: number        — Token üretim zamanı (Unix timestamp)
  exp: number        — Token geçerlilik sonu (Unix timestamp; iat + 900 saniye)
}
```

**İmzalama Algoritması: HS256**

HS256 seçilmesinin gerekçesi: Heka API tek sunucu taraflı bir uygulamadır; token üretme ve doğrulama aynı serviste gerçekleşir. RS256'nın sağladığı public/private key ayrımı yalnızca birden fazla servisin (microservice) token doğrulaması yapması gerektiğinde anlam kazanır. HS256, uygulamanın ölçeği için yeterince güvenli ve daha az konfigürasyon karmaşıklığı içerir. `JWT_SECRET` en az 256 bit entropi ile üretilmelidir.

**Doğrulama Mekanizması:**

`fastify.authenticate` adlı bir preHandler dekoratörü oluşturulur. Bu hook şu adımları izler:
1. `Authorization` header'ından `Bearer <token>` parse edilir. Header yoksa `AUTH_TOKEN_MISSING` fırlatılır.
2. `jose.jwtVerify` ile imza ve `exp` doğrulanır. Hatalı imzada `AUTH_TOKEN_INVALID`, süresi dolmuşta `AUTH_TOKEN_EXPIRED` fırlatılır.
3. Payload `request.user` context'ine atanır.
4. Handler çalışmaya devam eder.

**Rol Doğrulama:**

`fastify.authorize(roles: string[])` factory fonksiyonu, verilen rol listesini kontrol eden bir preHandler döndürür. `authenticate`'den sonra çalışır; `request.user.role`'ü kontrol eder. Rol hiyerarşisi: admin her şeyi, manager viewer'ın tümünü + ek operasyonları, viewer yalnızca okuma yetkisine sahiptir.

---

### Refresh Token

**Üretim Mekanizması:**

1. `crypto.randomBytes(48)` ile 48 byte güvenli rastgele veri üretilir.
2. Bu veri hex string'e çevrilir (96 karakter); bu değer istemciye gönderilecek ham token'dır.
3. Ham token SHA-256 ile hash'lenir; yalnızca `sessions.refresh_token_hash` kolonu veritabanına yazılır. Ham token asla DB'ye yazılmaz.
4. `expires_at = now() + JWT_REFRESH_EXPIRES_IN gün` olarak hesaplanır.

**Rotation Mekanizması:**

Refresh token her kullanımda tek seferlik (one-time use) olarak tasarlanmıştır:
1. İstemci `/v1/auth/refresh` endpoint'ine mevcut refresh token ile istek atar.
2. Token hash'i DB'de aranır; bulunamazsa veya `revoked_at` doluysa `AUTH_REFRESH_TOKEN_INVALID` döner.
3. `expires_at < now()` ise token süresi dolmuş; `revoked_at` set edilir ve `AUTH_REFRESH_TOKEN_EXPIRED` döner.
4. Doğrulama başarılıysa transaction başlatılır:
   - Eski session kaydına `revoked_at = now()` yazılır.
   - Yeni refresh token üretilir; yeni session kaydı oluşturulur.
   - Transaction commit edilir.
5. Yeni access token ve yeni refresh token (httpOnly cookie) istemciye gönderilir.

**Çalınan Token Tespiti:**

Eğer zaten `revoked_at` dolu bir refresh token tekrar kullanılmaya çalışılırsa bu durum token çalındığını işaret eder (saldırgan eski token'ı kullanmış, sisteme yeni token yazılmış, ardından gerçek kullanıcı da aynı eski token ile denemekte). Bu durumda:
1. İlgili `user_id`'ye ait tüm aktif session kayıtları `revoked_at = now()` ile geçersiz kılınır.
2. Kullanıcının tüm cihazlardan oturumu kapatılmış olur.
3. Audit log'a `security_token_reuse` event'i yazılır.
4. `AUTH_REFRESH_TOKEN_INVALID` döner.

---

### Supabase Auth Entegrasyonu

**Senkronizasyon Stratejisi:**

Supabase Auth (`auth.users` tablosu) ile uygulamanın kendi `public.users` tablosu iki ayrı varlıktır. Senkronizasyon için iki seçenek değerlendirilmiştir:

- **Webhook:** Supabase Auth eventi → HTTP endpoint → `public.users` güncelleme. Avantaj: async, ayrık. Dezavantaj: network hatası, retry mekanizması gerekir; geliştirme ortamında test zorluğu.
- **Database Trigger:** `auth.users` tablosundaki `INSERT` / `UPDATE` trigger'ı `public.users`'ı günceller. Avantaj: transaction içinde atomik; network bağımlılığı yok. Dezavantaj: Supabase'in `auth` şemasına trigger yazmak dikkat gerektirir.

**Karar: API katmanında manuel senkronizasyon.** Kayıt akışında, `supabase.auth.admin.createUser()` başarılı olduktan sonra `public.users` INSERT işlemi aynı uygulama kodunda gerçekleştirilir. Transaction semantiği Supabase RPC (function) ile sağlanır. Bu yaklaşım; test edilebilirliği yüksek, harici bağımlılık içermeyen ve en öngörülür davranışı sergileyen çözümdür.

**Supabase Auth'un Kullanım Alanı:**

- `auth.admin.createUser()`: Kayıt sırasında Supabase Auth tarafında kullanıcı oluşturma.
- `auth.admin.deleteUser()`: Hesap silme (soft-delete yetmediğinde admin işlemi).
- Supabase Auth session'ları Heka'nın kendi session sistemi tarafından yönetilir; Supabase Auth session'ları oluşturulmaz.

---

## 7. Hata Yönetimi Stratejisi

### AppError Sınıfı

`shared/errors/app-error.ts` dosyasındaki sınıf şu alanlara sahiptir:

| Alan | Tip | Açıklama |
|---|---|---|
| `code` | `string` | `error-codes.ts`'deki sabit değerlerden biri (örn: `AUTH_TOKEN_EXPIRED`) |
| `message` | `string` | İnsan okunabilir, Türkçe hata açıklaması |
| `statusCode` | `number` | HTTP status kodu (401, 403, 404, 409, 422, 429, 500 vb.) |
| `details` | `ValidationDetail[] \| null` | Yalnızca validation hatalarında dolu; alan bazlı hata listesi |

AppError, `Error`'dan extend eder; `instanceof AppError` kontrolü error handler'da kullanılır.

### Global Error Handler (`setErrorHandler`)

Fastify'ın `setErrorHandler` ile kurulan global handler şu sırayla kontrol eder:

1. **`instanceof AppError`**: `code`, `message`, `statusCode`, `details` değerleri alınır; standart yanıt zarfına yerleştirilir.

2. **Zod `ZodError`**: `error.issues` dizisi dolaşılır; her issue için `{ field, code, message }` nesnesi üretilir. `statusCode: 422`, `code: VALIDATION_FAILED` ile döner.

3. **Supabase hataları**: Supabase JS Client'ın döndürdüğü hata nesneleri kendi hata kodlarına sahiptir. Bilinen kodlar `AppError`'a çevrilir:
   - `23505` (unique_violation) → `409 Conflict`
   - `23503` (foreign_key_violation) → `404 Not Found`
   - `PGRST116` (row not found) → `404 Not Found`
   - Diğerleri → `500 SERVER_DATABASE_ERROR`

4. **Bilinmeyen hatalar**: `statusCode: 500`, `code: SERVER_ERROR` ile döner. Stack trace ve iç hata detayları yanıta dahil edilmez; yalnızca Pino logger'a `error` seviyesinde yazılır.

**Her yanıta `request_id` eklenir**: `reply.request.id` (ulid) `error.request_id` alanına yerleştirilir.

---

### Hata Loglama Kuralları

- **5xx hataları**: Her zaman Pino `error` seviyesinde loglanır. Log kaydı `{ err, requestId, method, url, userId }` alanlarını içerir.
- **4xx hataları**: Yalnızca güvenlik ilişkili olanlar (`401`, `403`, `429`) Pino `warn` seviyesinde loglanır. `404` loglanmaz.
- **Stack trace**: Yalnızca `NODE_ENV !== production` ortamında log'a dahil edilir.

---

## 8. Audit Log Mekanizması

### Loglanan Olaylar

| Olay Tipi | Tetikleyici |
|---|---|
| `user_register` | Yeni kullanıcı kaydı |
| `user_login` | Başarılı giriş |
| `user_logout` | Oturum kapatma |
| `user_login_failed` | Başarısız giriş denemesi |
| `email_verified` | E-posta OTP doğrulama |
| `phone_verified` | SMS OTP doğrulama |
| `password_reset` | Şifre sıfırlama tamamlandı |
| `password_changed` | Şifre değiştirildi |
| `profile_updated` | Kullanıcı profili güncellendi |
| `session_revoked` | Oturum iptal edildi |
| `security_token_reuse` | Çalınan refresh token tespit edildi; tüm oturumlar kapatıldı |
| `user_created` | Admin tarafından kullanıcı oluşturma |
| `user_deactivated` | Hesap devre dışı bırakıldı |
| `user_activated` | Hesap yeniden aktifleştirildi |
| `user_deleted` | Hesap soft-delete ile silindi |
| `role_assigned` | Kullanıcıya rol atandı |
| `role_removed` | Kullanıcıdan rol kaldırıldı |
| `product_created` | Yeni ürün oluşturuldu |
| `product_updated` | Ürün güncellendi |
| `product_deleted` | Ürün silindi |
| `catalog_published` | Katalog yayımlandı |
| `catalog_archived` | Katalog arşivlendi |
| `file_uploaded` | Dosya yüklendi |
| `file_deleted` | Dosya silindi |

---

### Log Yazma Noktası

**Karar: Service katmanında açık (explicit) çağrı.**

İki yaklaşım değerlendirilmiştir:

- **Fastify `onResponse` hook'u**: Her yanıt sonrası HTTP method + path eşleşmesine göre log karar verilir. Avantaj: merkezi, otomatik. Dezavantaj: olay semantiği (ne yapıldığı) HTTP method'dan kesin çıkarılamaz; `old_data` yakalamak için servis öncesi snapshot almak gerekir; hook, başarısız işlemleri de loglayabilir.

- **Service katmanında explicit çağrı**: Her kritik operasyonun service metodunda `auditRepository.log(event)` doğrudan çağrılır. Avantaj: hangi verinin loglandığı kesin; `old_data`/`new_data` tam kontrol; başarısız operasyonlar loglanmaz; olay adı semantik olarak doğru.

**Seçim: Service katmanında explicit çağrı.** Güvenlik ve olay doğruluğu esneklikten önemlidir.

---

### Hassas Alan Maskeleme

`old_data` ve `new_data` JSON alanlarına yazılmadan önce aşağıdaki alanlar tamamen çıkarılır (null yerine alan kaldırılır):

- `password_hash`
- `refresh_token_hash`
- `code_hash` (OTP hash)
- `token`

Örnek: Kullanıcı profil güncellemesinde `old_data = { full_name: "Eski Ad", phone: "+905..." }`, `new_data = { full_name: "Yeni Ad", phone: "+905..." }`. `password_hash` hiçbir zaman bu nesnelere dahil edilmez.

---

### Asenkron Log Yazma Kararı

**Karar: `await` ile senkron yazma (fire-and-forget değil).**

Gerekçe: Audit log, yasal/uyumluluk gereksinimleri açısından kritik bir kayıttır. Log yazma başarısız olursa bu durum bilinmeli ve hata zinciri korunmalıdır. Özellikle `password_reset`, `role_assigned`, `user_deactivated` gibi güvenlik olaylarında audit log kaydının oluşmaması sessiz bir güvenlik açığı oluşturur.

Fire-and-forget yalnızca yüksek hacimli ve güvenlik ilişkisiz okuma logları için değerlendirilebilir; bu proje için geçerli bir senaryo yoktur.

---

## 9. Uygulama Sırası (Implementation Roadmap)

### Faz 1 — Temel Altyapı

Bu faz, tüm modüllerin üzerine inşa edileceği temeli oluşturur. Bitmeden diğer fazlara geçilmez.

- [ ] `package.json` kurulumu: tüm bağımlılıklar ve devDependencies eklenir
- [ ] `tsconfig.json`: `strict: true`, `moduleResolution: bundler`, path aliases (`@/` → `src/`)
- [ ] Klasör yapısı oluşturma
- [ ] `src/config/env.ts`: Zod ile ortam değişkeni şeması; tip çıkarımı
- [ ] `src/app.ts`: Fastify instance factory; test edilebilir export
- [ ] `src/server.ts`: HTTP sunucusu başlatma; graceful shutdown
- [ ] `src/plugins/supabase.ts`: Supabase client singleton
- [ ] `src/plugins/cors.ts`: CORS konfigürasyonu
- [ ] `src/plugins/rate-limit.ts`: Global rate limit
- [ ] `src/shared/errors/app-error.ts`: AppError sınıfı
- [ ] `src/shared/errors/error-codes.ts`: Tüm hata sabitleri
- [ ] `src/shared/errors/error-handler.ts`: Global error handler
- [ ] `src/shared/hooks/request-id.hook.ts`: ulid bazlı request ID
- [ ] `src/shared/utils/response.ts`: `success()`, `paginated()` yardımcıları
- [ ] `src/shared/types/fastify.d.ts`: Dekoratör tip genişlemeleri
- [ ] `src/shared/utils/pagination.ts`: Cursor encode/decode; `buildCursorQuery`
- [ ] Logger konfigürasyonu: geliştirme/production Pino ayarları
- [ ] Faz 1 birim testleri: AppError, cursor utils, response helpers

---

### Faz 2 — Auth Modülü

Bağımlılıklar: Faz 1 tamamlanmış olmalı.

- [ ] `src/shared/utils/hash.ts`: argon2 sarmalayıcıları
- [ ] `src/shared/utils/crypto.ts`: Güvenli token üretimi
- [ ] `src/plugins/auth.ts`: `fastify.authenticate` ve `fastify.authorize` preHandler'ları
- [ ] `src/modules/auth/auth.schema.ts`: Tüm auth Zod şemaları
- [ ] `src/modules/auth/auth.repository.ts`: users, sessions, otp_verifications, rate_limit_logs sorguları
- [ ] `src/modules/auth/auth.service.ts`: Tüm auth iş mantığı
- [ ] `src/modules/auth/auth.controller.ts`: HTTP dönüşümleri
- [ ] `src/modules/auth/auth.routes.ts`: Tüm /v1/auth/** route'ları; endpoint bazlı rate-limit ayarları
- [ ] `src/shared/hooks/audit-log.hook.ts`: Audit log yardımcısı; `auth.repository.ts` ile bağlantı
- [ ] Kapsamlı auth testleri:
  - [ ] register → OTP → verify akışı
  - [ ] login (başarılı, hatalı şifre, doğrulanmamış hesap, devre dışı hesap)
  - [ ] token refresh ve rotation
  - [ ] çalınan token tespiti
  - [ ] şifre sıfırlama akışı
  - [ ] rate limit davranışı
  - [ ] session listeleme ve kapatma

---

### Faz 3 — Product Modülü

Bağımlılıklar: Faz 2 tamamlanmış olmalı (korumalı route'lar için authenticate/authorize gerekli).

- [ ] **Brands:**
  - [ ] `brand.schema.ts`, `brand.repository.ts`, `brand.service.ts`, `brand.controller.ts`, `brand.routes.ts`
  - [ ] CRUD + slug benzersizlik kontrolü + ürünlü marka silme engeli
  - [ ] Testler
- [ ] **Categories:**
  - [ ] `category.schema.ts`, `category.repository.ts`, `category.service.ts`, `category.controller.ts`, `category.routes.ts`
  - [ ] Hiyerarşik ağaç yapısı sorgusu
  - [ ] Döngüsel bağımlılık kontrolü (taşıma sırasında)
  - [ ] Derinlik sınırı (maks 5 seviye) kontrolü
  - [ ] Testler
- [ ] **Products:**
  - [ ] `product.schema.ts`, `product.repository.ts`, `product.service.ts`, `product.controller.ts`, `product.routes.ts`
  - [ ] CRUD + soft-delete
  - [ ] Filtreleme: `socket_type`, `energy_class`, `dimmable`, `brand_id`, `category_id`, `status`
  - [ ] Cursor tabanlı pagination entegrasyonu
  - [ ] Metin araması (`q` parametresi → `name ILIKE`)
  - [ ] Testler
- [ ] **Technical Details:**
  - [ ] `technical-detail.schema.ts`, repository, service, controller, routes
  - [ ] Ürünle bire-bir ilişki; GET, PUT (upsert)
  - [ ] Testler
- [ ] **Display:**
  - [ ] `display.schema.ts`, repository, service, controller, routes
  - [ ] Barkod benzersizlik kontrolü
  - [ ] GET, PUT (upsert)
  - [ ] Testler

---

### Faz 4 — Catalog Modülü

Bağımlılıklar: Faz 3 tamamlanmış olmalı (ürün varlığı kontrolü için).

- [ ] **Catalogs:**
  - [ ] `catalog.schema.ts`, repository, service, controller, routes
  - [ ] CRUD + soft-delete
  - [ ] Durum geçiş makinesi: `draft → active`, `active → archived`; geri dönüş yok
  - [ ] Arşivlenmiş katalog değiştirilme engeli
  - [ ] Aktif katalog silme engeli
  - [ ] Testler
- [ ] **Catalog Items:**
  - [ ] `catalog-item.schema.ts`, repository, service, controller, routes
  - [ ] Ürün ekleme/çıkarma
  - [ ] Aktif olmayan ürün ekleme engeli
  - [ ] Yeniden sıralama (reorder): tüm kalem ID'lerini içeren dizi; eksik/fazla kalem hatası
  - [ ] Testler
- [ ] **Pricing:**
  - [ ] `pricing.schema.ts`, repository, service, controller, routes
  - [ ] Ürün + katalog + para birimi + tarih aralığı çakışma kontrolü
  - [ ] Geçerlilik tarihi aralığı doğrulama (`valid_from < valid_to`)
  - [ ] Testler

---

### Faz 5 — Files Modülü

Bağımlılıklar: Faz 1 (multipart plugin), Faz 2 (auth). Ürün/katalog varlık kontrolü için Faz 3-4 gerekli.

- [ ] `@fastify/multipart` entegrasyonu
- [ ] `files.schema.ts`: Upload parametreleri, file relation Zod şemaları
- [ ] `files.repository.ts`: `files` ve `file_relations` CRUD; polimorfik sorgu (entity_type + entity_id)
- [ ] `files.service.ts`:
  - [ ] MIME tipi doğrulama (whitelist kontrolü)
  - [ ] Dosya boyutu sınırı kontrolü
  - [ ] Supabase Storage'a stream tabanlı yükleme
  - [ ] Metadata DB kaydı (storage_path, mime_type, size_bytes, bucket_name)
  - [ ] Signed URL üretimi (süreli, Supabase Storage API)
  - [ ] Soft-delete: DB kaydı + Storage'dan fiziksel silme
- [ ] `files.controller.ts`, `files.routes.ts`
- [ ] Günlük dosya yükleme limiti kontrolü (rate_limit_logs + 24 saatlik pencere)
- [ ] Testler:
  - [ ] Başarılı yükleme ve metadata doğrulama
  - [ ] Geçersiz MIME tipi reddi
  - [ ] Boyut sınırı aşımı
  - [ ] Polimorfik ilişkilendirme (ürün, katalog, marka)
  - [ ] Signed URL üretimi

---

### Faz 6 — Admin Modülü

Bağımlılıklar: Tüm önceki fazlar; yalnızca `admin` rolüne sahip kullanıcılar erişebilir.

- [ ] `admin.schema.ts`: Kullanıcı listeleme filtreleri, rol atama DTO'ları
- [ ] `admin.repository.ts`: Geniş kapsamlı kullanıcı sorguları; audit_log sorguları (filtreleme, pagination)
- [ ] `admin.service.ts`:
  - [ ] Kullanıcı yönetimi: listeleme, detay, aktif/pasif etme, silme
  - [ ] Kendi hesabını devre dışı bırakma / silme engeli
  - [ ] Son admin koruma kuralı: sistemdeki tek admin'in admin rolü kaldırılamaz
  - [ ] Rol atama ve kaldırma
  - [ ] Audit log sorgulama (filtreleme: user_id, event_type, tarih aralığı; cursor pagination)
  - [ ] Kullanıcıya ait tüm oturumları iptal etme
- [ ] `admin.controller.ts`, `admin.routes.ts`
- [ ] Testler

---

### Faz 7 — Eniyileme ve Yayın Hazırlığı

Bağımlılıklar: Tüm önceki fazlar tamamlanmış ve testler geçiyor.

- [ ] Cursor tabanlı pagination yardımcısının tüm modüllerde tutarlı davranışını doğrulama
- [ ] Global rate limit yapılandırmasının production değerleri ile gözden geçirilmesi
- [ ] `rate_limit_logs` temizleme cron job tasarımı
- [ ] Pino log formatı ve seviye ayarlarının production için son hali
- [ ] Health check endpoint: `GET /health` (DB bağlantısı, Supabase Storage erişimi kontrolü)
- [ ] `tsconfig.build.json` ve production build script'i (`tsc -p tsconfig.build.json`)
- [ ] CI/CD pipeline planı:
  - [ ] Lint + type check
  - [ ] Vitest (unit + integration)
  - [ ] Coverage raporu (kritik path'ler %80+)
  - [ ] Production build başarı kontrolü
- [ ] Production ortam kontrol listesi:
  - [ ] Tüm zorunlu ortam değişkenleri tanımlı
  - [ ] `NODE_ENV=production`
  - [ ] CORS origin listesi production URL'leri içeriyor
  - [ ] `LOG_LEVEL=info` (debug değil)
  - [ ] Supabase RLS politikaları aktif (API katmanının ek güvenlik katmanı)
  - [ ] argon2 parametreleri OWASP minimumlarını karşılıyor
  - [ ] `JWT_SECRET` üretimde güçlü rastgele değer
  - [ ] Supabase Service Role Key ortam değişkeni kayıt dışı

---

## 10. Test Stratejisi

### Test Türleri

**Birim Testleri (Unit Tests)**

- Hedef katmanlar: service ve yardımcı fonksiyonlar
- Supabase client tamamen mock'lanır; gerçek DB bağlantısı yoktur
- argon2 hash/verify işlemleri gerçek kütüphane ile test edilir (mock'lamak güvenlik testini anlamsız kılar)
- Cursor encode/decode, pagination yardımcıları, AppError davranışı
- Her edge case: son admin koruması, döngüsel kategori tespiti, token reuse akışı

**Entegrasyon Testleri (Integration Tests)**

- Fastify `inject()` kullanılarak gerçek HTTP request/response döngüsü test edilir
- Ayrı bir Supabase test projesi (veya Supabase local dev stack) kullanılır
- Her test suite başında: ilgili tabloları temizle, seed data at, testleri çalıştır
- Route → Controller → Service → Repository → Supabase zincirinin tamamı test edilir

---

### Test Dosya Konvansiyonu

Her `*.ts` kaynak dosyasının yanına `*.test.ts` test dosyası yerleştirilir. Entegrasyon testleri için `tests/` kök dizini kullanılır.

```
src/modules/auth/auth.service.ts
src/modules/auth/auth.service.test.ts     — Birim testleri
tests/auth.integration.test.ts            — Entegrasyon testleri
```

---

### Fixture ve Seed Yaklaşımı

1. `tests/setup.ts` dosyasında `beforeAll` / `afterAll` hook'ları ile test veritabanı hazırlanır.
2. `tests/fixtures/*.fixture.ts` dosyaları sabit test verisini (bilinen ID'ler, şifreler, roller) tanımlar.
3. Her test suite `beforeEach`'te ilgili tablolarını temizler; her test bağımsız başlar.
4. Test kullanıcıları belirli rollerle oluşturulur: admin, manager, viewer; biri devre dışı, biri doğrulanmamış.
5. Test ürünleri, kataloglar ve fiyatlar belirli ID'lerle seed'lenir; ID'ler fixture sabitlerinden okunur.

---

### Coverage Hedefleri

| Alan | Hedef |
|---|---|
| Auth service (tüm akışlar) | %90+ |
| Product CRUD (service) | %85+ |
| Catalog service (durum geçişleri, çakışma kontrolü) | %85+ |
| Files service (yükleme, MIME, boyut kontrolü) | %80+ |
| Pagination yardımcıları | %95+ |
| Error handler | %90+ |
| Genel ortalama | %80+ |

Saf repository testleri (Supabase client mock) düşük önceliklidir; entegrasyon testleri bu katmanı dolaylı kapsar.

---

## 11. Geliştirici Kural ve Konvansiyonlar

### Dosya İsimlendirme

- Tüm dosyalar `kebab-case.ts` formatında (örn: `auth.service.ts`, `app-error.ts`)
- Test dosyaları: `kebab-case.test.ts`
- Tip tanım dosyaları: `kebab-case.types.ts` veya `kebab-case.d.ts`

### Export Stili

Tüm export'lar `named export` olarak yapılır. `default export` kullanılmaz. Gerekçe: yeniden adlandırma kolaylığı, barrel export (`index.ts`) ile toplu dışa aktarım, otomatik import önerilerinin doğruluğu.

### Async Hata Yakalama

Service ve repository katmanlarında `try/catch` ile yakalanmak yerine hatalar fırlatılır; global Fastify `setErrorHandler` devralır. Controller katmanında ayrıca `try/catch` kullanılmaz. Yalnızca kritik temizleme gerektiren transaction rollback senaryolarında `try/finally` kullanılabilir.

### TypeScript Kural

- `strict: true` zorunlu; `any` kullanımı yasak
- Tip assertion (`as Type`) yalnızca Supabase dönen verinin harici tipine uyarlanmasında kullanılabilir
- `unknown` → daraltma (narrowing) tercih edilir
- `interface` yerine `type` (Zod `z.infer` ile uyumu için)

### Commit Mesaj Formatı

```
feat(auth): register ve email OTP doğrulama akışını ekle
fix(product): kategori döngüsel bağımlılık kontrolündeki edge case
refactor(shared): cursor pagination yardımcısını genel hale getir
test(catalog): catalog item reorder entegrasyon testlerini ekle
chore(config): tsconfig.build.json üretim dışlama kurallarını güncelle
```

Format: `<tip>(<modül>): <açıklama>` — Türkçe açıklama, zorunlu kısa

Tipler: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

### Branch Stratejisi

- Ana dal: `main` (her zaman production'a deploylanabilir durumda)
- Özellik dalları: `feature/<modül>-<açıklama>` (örn: `feature/auth-register-flow`)
- Hata düzeltme: `fix/<modül>-<açıklama>`
- Dal ömrü: tamamlandıktan sonra merge edilip silinir

### PR Kuralları

- En az 1 kod incelemesi gerekli (self-merge yasak)
- CI tüm adımları geçmeden merge yapılamaz: lint, type check, test, build
- PR açıklaması şu bölümleri içerir: değişikliğin amacı, test edilen senaryolar, migration gerektirip gerektirmediği
- Draft PR, geliştirme sürecinde erken geri bildirim için teşvik edilir

### Kod Kalite Otomasyonu

- **ESLint**: `@typescript-eslint/recommended` + `@typescript-eslint/strict`; `any` yasağı, `no-console` (pino kullanılır)
- **Prettier**: 2 boşluk, tek tırnak, satır sonu LF, trailing comma ES5
- **Husky + lint-staged**: commit öncesinde staged dosyalara lint + format kontrolü
- **TypeScript**: CI'da `tsc --noEmit` ile tip kontrolü; build ayrıca doğrulanır
