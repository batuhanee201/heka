# Heka API — İlk Kod ve Güvenlik Analizi

Tarih: 2026-05-29  
Kapsam: `src/` altındaki tüm modüller (auth, product, catalog, files, admin)

---

## Güvenlik Analizi

### KRİTİK

**K-1 — Files Relations endpoint'i kimlik doğrulamasız açık**  
`GET /files/relations/:entityType/:entityId` route'unda `preHandler` yok. Kimliksiz herhangi bir istemci tüm dosya ilişkilerini sorgulayabilir.

**K-2 — deleteRelation sahiplik kontrolü yok (IDOR)**  
`DELETE /files/relations/:id` endpoint'i sahiplik veya yetki kontrolü yapmadan siler. Authenticated her kullanıcı başkasına ait dosya ilişkisini silebilir.

**K-3 — CORS wildcard + credentials kombinasyonu**  
`CORS_ORIGIN=*` default değeriyle `credentials: true` birlikte kullanılıyor. Production'da yanlışlıkla `*` bırakılırsa CSRF riski artar; `env.ts`'de format/whitelist validasyonu yok.

**K-4 — service_role key ile RLS tamamen bypass**  
Tüm modüller aynı `service_role` client'ı kullanıyor. Veritabanındaki tüm RLS politikaları hiçbir zaman devreye girmiyor; izolasyon tamamen uygulama katmanına bağımlı.

---

### YÜKSEK

**Y-1 — SVG yükleme — XSS riski**  
`image/svg+xml` izin listesinde. SVG `<script>` içerebilir; public bucket'ta sunulunca XSS mümkün. Magic byte doğrulaması yok, sadece `file.mimetype` header değerine güveniliyor ve bu client tarafından manipüle edilebilir.

**Y-2 — Auth endpoint'lerine özel rate limit yok**  
Global limit (100 istek/60sn) `/auth/login`, `/auth/register`, `/auth/refresh` için de aynı. Brute force koruması yetersiz.

**Y-3 — trustProxy: true — X-Forwarded-For doğrulaması yok**  
`req.ip` doğrudan `X-Forwarded-For` header'ından okunuyor. Araya giren proxy yoksa rate limit atlatılabilir.

**Y-4 — Refresh token rotation — race condition**  
`updateSessionActivity` `revoked_at` kontrolü yapmadan hash güncelliyor. Eş zamanlı refresh isteklerinde aynı session üzerinde race condition mevcut.

**Y-5 — restoreUser audit log'a yazılmıyor**  
`req.auditContext` set edilmediği için kullanıcı geri yükleme işlemi audit log'da görünmüyor. Hedef kullanıcının gerçekten silinmiş olduğunu da doğrulamıyor.

---

### ORTA

**O-1 — Başarısız istekler audit log'a kaydedilmiyor**  
`statusCode >= 400` yanıtlar `audit.ts` hook'unda atlanıyor. Yetkisiz erişim girişimleri ve başarısız loginler izlenemiyor.

**O-2 — auditContext manuel set gerektiriyor**  
`req.auditContext` otomatik dolmuyor; geliştiricinin her route'ta elle set etmesi gerekiyor. Çoğu admin ve dosya işlemi log'a düşmüyor.

**O-3 — getFile sahiplik kontrolü yok**  
`GET /files/:id` ile herhangi bir authenticated kullanıcı başkasına ait dosya meta bilgisine erişebilir.

**O-4 — parseDuration bilinmeyen birimde sessizce hatalı hesaplıyor**  
Bilinmeyen birim harfi geldiğinde 1 dakikaya fallback yapıyor, hata vermiyor. `JWT_REFRESH_EXPIRES_IN` yanlış yazılırsa fark edilmez.

**O-5 — entity_type parametresi doğrulanmıyor**  
Audit log sorgusunda `entity_type` serbest string olarak kabul ediliyor, `z.enum` ile kısıtlanmamış.

---

### DÜŞÜK

**D-1 — JWT secret entropi kontrolü yok** — `z.string().min(32)` mevcut ama düşük entropili değer geçebilir.  
**D-2 — original_filename sanitizasyonu yok** — dosya adı doğrudan DB'ye yazılıyor, storage path güvenli ama log/API yanıtında görünüyor.  
**D-3 — slugify `İ/I` Türkçe dönüşümü eksik** — `TR_MAP`'te büyük `I → ı` tanımlı değil, normalizasyon tutarsızlığı.

---

### Güvenlik Güçlü Yönler

- Argon2id ile şifre hashleme doğru parametrelerle uygulanmış.
- `jose` ile algorithm confusion saldırısı engellenmiş (`algorithms` sabitleniyor).
- Refresh token SHA-256 hash olarak saklanıyor, plain token DB'ye yazılmıyor.
- Zod validasyonu tüm controller girişlerinde uygulanmış.
- `toPublicUser` `password_hash` ve `supabase_auth_id` alanlarını yanıttan temizliyor.
- Multipart upload için 10MB hard limit `@fastify/multipart` seviyesinde tanımlı.

---

## Kod Kalitesi Analizi

### Mimari

- `FilesService` hem repository hem de doğrudan `SupabaseClient` (`this.db.storage`) kullanıyor; diğer servisler yalnızca repository üzerinden erişiyor — katman tutarsızlığı.
- Her servis kendi içinde `new Repository(db)` çağırıyor; repository'ler dışarıdan enjekte edilemiyor, test yazımını zorlaştırıyor.
- `requireRole` middleware'i `throw` yerine `sendError` + `return` yapıyor. Fastify'da çalışır ama standart pratik throw etmektir; ince bug'lara açık.
- `req.auditContext` sadece bazı route'larda set ediliyor; uygulama genelinde tutarsız.

### TypeScript

- Repository'ler DB yanıtını `as UserRecord`, `as ProductDetail[]` gibi type assertion'larla dönüyor; Supabase `Database` generic tipi kullanılmıyor, şema değişiklikleri derleme zamanında yakalanmıyor.
- `fastify.d.ts`'de `userId` ve `userRole` non-optional tanımlı; authenticated olmayan route'larda `undefined` olmasına rağmen tip bunu yakalamıyor.
- `verifyToken<T>` içinde `payload as unknown as T` double assertion tip güvenliğini sıfırlıyor.
- `AdminRepository.updateUser` imzası `Record<string, unknown>` alıyor; tip güvenliği servis katmanına bırakılmış.

### Hata Yönetimi

- Controller metodlarının bir kısmı `try/catch` içeriyor, bir kısmı içermiyor; tutarsız strateji.
- `revokeSession`, `updateLastLogin`, `updateSessionActivity` metodlarında hata kontrolü yok; sessiz başarısızlık riski var.
- `restoreProduct` serviste `notFound` kontrolü yapmıyor.
- Global error handler `error.name === 'AppError'` string karşılaştırması yapıyor; `instanceof` daha güvenilir.
- `sendError` non-AppError'da DB hata mesajını istemciye sızdırabilir.

### Tekrar Eden Kod

- `safeParse → sendError → try { sendSuccess } catch { sendError }` kalıbı tüm controller metodlarında kopyalanmış; merkezi bir `withHandler` wrapper azaltabilir.
- Her `.routes.ts` dosyasında `const auth`, `const security`, `const idParam` değişkenleri tekrar ediliyor — 5 dosyada aynı satırlar.

### Pagination

- `cursor` alanı şemalarda tanımlı ve `pagination.ts`'de `encodeCursor/decodeCursor/buildPaginationMeta` tam implemente edilmiş.
- Hiçbir repository `cursor`'u kullanmıyor; tüm liste endpoint'leri yalnızca `.limit()` yapıyor.
- `sendList` helper tanımlı ama hiç çağrılmıyor; cursor-based pagination utility'de var, repository ve controller'da tamamen eksik.

### Test Edilebilirlik

- Test dosyası hiç yok.
- Service'ler `new Repository(db)` constructor chain kullandığı için unit test'te repository mock'lanamıyor.
- Controller'lar Service'i dışarıdan alıyor — doğru tasarım, test için uygun.
- `env.ts` module-level `process.exit(1)` içeriyor; test ortamında import tehlikeli.

---

## Öncelik Sırası

| # | Konu | Tür | Aciliyet |
|---|------|-----|---------|
| 1 | `GET /files/relations` auth eksikliği | Güvenlik | Acil |
| 2 | `deleteRelation` IDOR | Güvenlik | Acil |
| 3 | SVG yükleme — XSS | Güvenlik | Yüksek |
| 4 | Auth endpoint rate limit | Güvenlik | Yüksek |
| 5 | CORS + credentials yapılandırması | Güvenlik | Yüksek |
| 6 | Cursor pagination implementasyonu | Kalite | Orta |
| 7 | Başarısız isteklerin audit log'a yazılması | Güvenlik/Kalite | Orta |
| 8 | Controller try/catch tutarsızlığı | Kalite | Orta |
| 9 | TypeScript assertion'larının temizlenmesi | Kalite | Düşük |
| 10 | Test altyapısının kurulması | Kalite | Düşük |
