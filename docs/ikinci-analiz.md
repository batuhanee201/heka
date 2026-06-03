# İkinci Analiz — Güvenlik & Kod Kalitesi

> Tarih: 2026-05-29 | Kapsam: ilk-analiz düzeltmeleri sonrası tam codebase taraması

---

## GÜVENLİK

### KRİTİK

**G-K1 — MIME Type Magic Bytes Doğrulaması Yok**
`files.service.ts` — `file.mimetype` istemcinin gönderdiği `Content-Type` header'ından okunuyor; buffer'ın ilk baytları (magic bytes) kontrol edilmiyor. PHP webshell veya SVG XSS payload'ı `image/jpeg` başlığıyla yüklenebilir.
→ `file-type` kütüphanesiyle buffer kontrolü ekle; MIME type ikisinden daha kısıtlayıcı olanına göre belirle.

**G-K2 — Ürün/Brand/Kategori Yazma Endpoint'leri Rol Korumasız**
`product.routes.ts` — `POST/PATCH/DELETE /products`, `/brands`, `/categories` yalnızca `authenticate` ile korumalı; `viewer` rolündeki herhangi bir kullanıcı kayıt oluşturabilir/silebilir.
→ Yazma operasyonlarına `requireManager()` preHandler ekle.

---

### YÜKSEK

**G-Y1 — Rate Limit IP Bypass (X-Forwarded-For Spoofing)**
`app.ts:37`, `rate-limit.ts` — `trustProxy: true` açık, `keyGenerator` `req.ip` kullanıyor; saldırgan sahte `X-Forwarded-For` header'ı göndererek rate limit'i tamamen atlayabilir.
→ `trustProxy: 1` (tek proxy) ile sınırla veya `req.socket.remoteAddress` kullan.

**G-Y2 — Refresh Token Reuse Detection Yok**
`auth.service.ts` — `updateSessionActivity` eski token hash'ini geçersiz kılmıyor; çalınan refresh token süre dolmadan tekrar kullanılabilir.
→ Rotation sonrası session'da `previous_token_hash` sakla; ikinci kullanımda tüm session'ı iptal et.

**G-Y3 — Logout'ta `currentTokenHash` Controller'dan Gönderilmiyor**
`auth.controller.ts` + `auth.service.ts` — `logout` metoduna `currentTokenHash: undefined` geçiliyor; tek-cihaz logout her zaman tüm session'ları iptal eden dala düşüyor.
→ Controller'da Authorization header'dan `jti` parse edip hash'leyerek servise ilet.

**G-Y4 — Email Normalizasyonu Yok (Hesap Duplikasyon)**
`auth.routes.ts` — `"Admin@Example.COM"` ve `"admin@example.com"` Zod `email()` validasyonundan geçer; DB collation'a bağlı olarak aynı kullanıcı iki hesap açabilir.
→ Zod schema'ya `.email().toLowerCase().trim()` transform ekle.

**G-Y5 — `createRelation` Endpoint'inde Sahiplik Kontrolü Yok**
`files.service.ts:114` — Kimlik doğrulanmış herhangi bir kullanıcı başkasına ait `file_id` ile ilişki oluşturabiliyor.
→ `createRelation`'da `file.uploaded_by === req.userId` kontrolü ekle.

**G-Y6 — Brute-Force Girişimleri Audit Log'a Düşmüyor**
`audit.ts:19` — `if (!req.userId) return` bloğu, başarısız login gibi tüm anonim güvenlik olaylarını dışarıda bırakıyor.
→ 401/403 statüslü istekleri `user_id: null` olarak `ip` + `user_agent` meta verisiyle kaydet.

**G-Y7 — Admin Endpoint'leri İçin Ayrı Rate Limit Yok**
`admin.routes.ts` — Rol atama, kullanıcı silme gibi kritik operasyonlar global limite (100 req/60s) tabi.
→ Admin route'larına `config: { rateLimit: { max: 10, timeWindow: 60_000 } }` ekle.

**G-Y8 — Extension Dosya Adından Türetiliyor, MIME Type'dan Değil**
`files.service.ts` — `extname(filename)` kullanıcının gönderdiği dosya adından extension çekiyor; `.php`, `.html` gibi uzantılar ALLOWED_MIME_TYPES kontrolünü atlayabilir.
→ Extension'ı doğrulanan MIME type'dan türet, kullanıcı dosya adındaki extension'ı kullanma.

---

### ORTA

**G-O1 — `req.userId` / `req.userRole` Non-Nullable Tipler — False Confidence**
`shared/types/fastify.d.ts` — `userId: string` olarak tanımlı; `authenticate` çalışmayan rotalarda runtime'da `undefined` olur ama TypeScript hata vermiyor.
→ `userId?: string`, `userRole?: string` yap; `authenticate` içinde kesinleştir.

**G-O2 — Swagger UI Production'da Erişilebilir**
`app.ts` — Swagger her ortamda register ediliyor; API yapısı ve tüm şemalar dışarıya açık.
→ `swagger.ts`'e `if (env.NODE_ENV !== 'production')` koşulu ekle.

**G-O3 — `CORS_ORIGIN` Production'da Wildcard Varsayılanı**
`env.ts` — `CORS_ORIGIN` default `'*'`; set edilmezse production'da wildcard aktif olur.
→ `NODE_ENV === 'production'` iken `CORS_ORIGIN`'i zorunlu yap.

**G-O4 — `/health` Endpoint Ortam Bilgisi İfşa Ediyor**
`app.ts:88` — `{ status: 'ok', env: 'production' }` saldırgana ortam bilgisi veriyor.
→ Yanıtı `{ status: 'ok' }` ile sınırla.

**G-O5 — Supabase Hata Mesajları İstemciye Yansıyor**
`auth.repository.ts`, `admin.repository.ts` — `error.message` doğrudan `AppError`'a aktarılıyor; tablo/kolon/constraint adı sızabilir.
→ Repository'de `error.message` logla, istemciye `'Veritabanı hatası'` döndür.

---

### DÜŞÜK

**G-D1 — Argon2 Parametrelerine Alt Sınır Yok**
`env.ts` — `ARGON2_MEMORY_COST=1` ile ayarlanırsa hash güvenliği ciddi düşer.
→ Zod schema'ya `ARGON2_MEMORY_COST.min(65536)`, `ARGON2_TIME_COST.min(3)` ekle.

---

## KOD KALİTESİ

### KRİTİK

**K-K1 — `listCatalogs` ve `listPricing` Handler'larında try/catch Eksik**
`catalog.controller.ts` — Bu iki handler hata yakalamıyor; service hatası Fastify'ın default handler'ına düşerek farklı format dönüyor.
→ Diğer handler'larla tutarlı şekilde try/catch ekle.

**K-K2 — N+1 Sorgu: `AdminRepository.findUsers`**
`admin.repository.ts` — Kullanıcı listesi çektikten sonra her kullanıcı için `updateUser` → `findUserById` → 2 ayrı sorgu yapılıyor; büyük listede ciddi performans sorunu.
→ Güncelleme sonrasında tam `findById` yerine partial response veya tek JOIN sorgusu kullan.

---

### YÜKSEK

**K-Y1 — `FilesService` Storage İşlemlerini Doğrudan Yapıyor — Katman İhlali**
`files.service.ts` — Service, hem `FilesRepository`'yi hem de `this.db` (Supabase client) üzerinden Storage API'sini çağırıyor.
→ Storage upload/delete işlemlerini `FilesRepository`'ye taşı; service yalnızca iş mantığını içersin.

**K-Y2 — JSON Schema + Zod İkili Validasyon — Senkronizasyon Riski**
Her endpoint'te Fastify `schema.body` ve controller'da Zod `safeParse` aynı anda çalışıyor; biri güncellense öbürü güncel olmayabilir.
→ Tek kaynak seç: `fastify-type-provider-zod` ile Zod'u route schema olarak kullan.

**K-Y3 — `catch` Bloğu 30+ Yerde Birebir Tekrar Ediyor**
Tüm controller'larda `catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }` tekrarı.
→ `withErrorHandler(fn)` HOF veya merkezi wrapper ile sadeleştir.

**K-Y4 — `updateProduct` / `updateUser` Boş Body Kabul Ediyor**
`UpdateProductSchema = CreateProductSchema.partial()` — `{}` body geçerli sayılıyor.
→ `.refine(data => Object.keys(data).length > 0, 'En az bir alan gerekli')` ekle.

**K-Y5 — `createProduct`/`updateProduct` Sonrası Gereksiz `findById` Sorgusu**
`product.service.ts` — Oluşturma/güncelleme ardından ilişkili tablolarla birlikte tekrar `findById` çekiliyor.
→ Supabase `insert/update...select()` ile ilişkili alanları tek sorguda çek.

**K-Y6 — Audit Log `event_category` Tipleri Senkronize Değil**
`audit.ts` — `AuditContext.category`'de `'admin' | 'system'` var; `AuditLogRecord.event_category`'de yok. DB'ye yazılırken hata verecek.
→ İki tipi ortak bir `AuditCategory` union'ında birleştir.

**K-Y7 — `restoreProduct` Existence/Status Kontrolü Yok**
`product.service.ts` — `restoreProduct` doğrudan DB'ye yazıyor; ürün yoksa veya aktifse sessiz başarı dönüyor. `restoreUser`'la tutarsız.
→ `findById(id, includeDeleted: true)` ile kontrol ekle; yoksa 404, aktifse 409 fırlat.

---

### ORTA

**K-O1 — `as unknown as RouteHandlerMethod` Tüm Route Dosyalarında Tekrar**
`h()` wrapper gereksinimi, controller metodlarının Fastify generic tiplerine uymadığını gösteriyor.
→ Controller metodlarını `FastifyRequest<{Params, Querystring, Body}>` ile tam tiple; wrapper gerekmesin.

**K-O2 — Cursor Pagination Aynı `created_at` Değerinde Kayıt Atlayabilir**
`buildPaginationMeta` — Tek alan cursor; aynı `created_at`'a sahip birden fazla kayıt varsa atlama olabilir.
→ Bileşik koşul: `created_at < X OR (created_at = X AND id < Y)`.

**K-O3 — `prev_cursor` İlk Sayfada da Üretiliyor**
`buildPaginationMeta` — Cursor olmadan yapılan ilk istek de `prev_cursor` içeriyor; client önceki sayfa olmadığını anlayamıyor.
→ Input cursor yoksa `prev_cursor: null` döndür.

**K-O4 — `CatalogRepository` ve `BrandRepository` Pagination Yok**
Sınırsız kayıt dönüyor; ölçekte sorun çıkacak.
→ Limit + cursor pagination ekle.

**K-O5 — `req.query as Record<string, string>` Tip Dökümü 4 Controller'da**
`listBrands`, `listCategories`, `listFiles`, `listCatalogs` — Diğer handler'larla tutarsız; tip güvenliği yok.
→ Fastify querystring generic'i veya Zod ile parse et.

**K-O6 — `valid_from`/`valid_to` Route Schema'da `required`, Zod'da `optional`**
`catalog.routes.ts:16` — Swagger dokümantasyonu ve gerçek validasyon çelişiyor.
→ İkisini senkronize et; tek validasyon kaynağına geç (bkz. K-Y2).

**K-O7 — `fileListQuerySchema.limit` Parse Ediliyor Ama Kullanılmıyor**
`files.service.ts` / `files.repository.ts` — `limit` parametresi alınıyor ama repo sorgusuna geçilmiyor; tüm dosyalar dönüyor.
→ `findAll`'a `limit` parametresi ekle ve sorguya uygula.

---

### DÜŞÜK

**K-D1 — `softDelete`/`restore` Pattern'i 5 Repository'de Tekrar**
→ `BaseRepository` abstract sınıfı veya yardımcı fonksiyonla merkezileştir.

**K-D2 — `toPublicX` Fonksiyonları Her Serviste Tekrar**
`deleted_at` omit pattern'i her serviste tekrar.
→ Generic `omitFields<T>(record, fields)` yardımcısı.

**K-D3 — `phone` Validasyonu `auth.schema.ts` ve `admin.schema.ts`'te Farklı**
Register'da regex; admin update'de serbest string.
→ Shared `phoneSchema` ile standartlaştır.

**K-D4 — `supabase_auth_id` Anlamsız Alan**
`AuthRepository.createUser`'da `randomUUID()` atanıyor; Supabase Auth kullanılmıyor.
→ Supabase Auth entegrasyonu tamamlanana kadar alanı kaldır.

---

## ÖNCELİK SIRASI

| # | Madde | Kategori | Öncelik |
|---|-------|----------|---------|
| 1 | G-K1 Magic bytes doğrulaması | Güvenlik | KRİTİK |
| 2 | G-K2 Ürün yazma rotaları rol korumasız | Güvenlik | KRİTİK |
| 3 | K-K1 Catalog controller try/catch eksik | Kod | KRİTİK |
| 4 | G-Y1 Rate limit IP bypass | Güvenlik | YÜKSEK |
| 5 | G-Y3 Logout currentTokenHash | Güvenlik | YÜKSEK |
| 6 | G-Y5 createRelation IDOR | Güvenlik | YÜKSEK |
| 7 | K-Y2 JSON Schema + Zod ikili validasyon | Kod | YÜKSEK |
| 8 | K-Y6 Audit category tip uyumsuzluğu | Kod | YÜKSEK |
| 9 | G-Y6 Brute-force audit kaydı yok | Güvenlik | YÜKSEK |
| 10 | K-Y7 restoreProduct kontrolsüz | Kod | YÜKSEK |
