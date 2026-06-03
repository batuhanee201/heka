# Yapılan İşler

## Aşama 1 — Temel Altyapı ✓

- `pgcrypto` ve `pg_trgm` extension'ları eklendi.
- `set_updated_at()` trigger fonksiyonu tanımlandı.
- Git commit: `feat(db): aşama 1 - temel altyapı extension ve trigger fonksiyonu`

---

## Aşama 2 — Auth Modülü ✓

- `users` tablosu oluşturuldu. Partial unique index (email, phone), soft delete, RLS aktif.
- `roles` tablosu oluşturuldu. `is_system` koruması, updated_at trigger.
- `permissions` tablosu oluşturuldu. `module` index, RLS aktif.
- `user_roles` tablosu oluşturuldu. Composite PK, CASCADE delete.
- `role_permissions` tablosu oluşturuldu. Composite PK, CASCADE delete.
- `sessions` tablosu oluşturuldu. Refresh token hash unique, expires_at index.
- `otp_verifications` tablosu oluşturuldu. Kanal ve amaç CHECK constraint'leri.
- `rate_limit_logs` tablosu oluşturuldu. Identifier+action composite index.
- Tüm auth tabloları için RLS politikaları uygulandı (32 politika).
- Git commit: `feat(db): aşama 2 - auth modülü tabloları ve rls politikaları`

---

## Aşama 3 — Product Modülü ✓

- `brands` tablosu oluşturuldu. Slug partial unique index, is_active index, soft delete.
- `categories` tablosu oluşturuldu. Öz-referanslı parent_id (ON DELETE RESTRICT), slug partial unique index.
- `products` tablosu oluşturuldu. code/slug partial unique index, brand+category FK (RESTRICT), status CHECK.
- `product_technical_details` tablosu oluşturuldu. UNIQUE product_id (bire-bir), socket/energy/dimmable index, CHECK constraint'ler.
- `product_display` tablosu oluşturuldu. UNIQUE product_id (bire-bir), barcode UNIQUE, certificates GIN index.
- Product RLS politikaları uygulandı (22 politika): viewer aktif görür, manager taslak dahil görür, admin hepsini görür.
- Git commit: `feat(db): aşama 3 - product modülü tabloları ve rls politikaları`

---

## Aşama 4 — Catalog Modülü ✓

- `catalogs` tablosu oluşturuldu. valid_from/valid_to DATE constraint, status CHECK, soft delete.
- `catalog_items` tablosu oluşturuldu. (catalog_id, product_id) UNIQUE, sort_order composite index.
- `pricing` tablosu oluşturuldu. price CHECK (>=0), tarih aralığı constraint, currency DEFAULT 'USD'.
- Catalog RLS politikaları uygulandı (14 politika): pricing yalnızca geçerli tarih aralığında görünür, anon fiyat göremez.
- Git commit: `feat(db): aşama 4 - catalog modülü tabloları ve rls politikaları`

---

## Aşama 5 — Files Modülü ✓

- `files` tablosu oluşturuldu. storage_path UNIQUE, size_bytes CHECK, is_public flag, soft delete.
- `file_relations` tablosu oluşturuldu. Polimorfik yapı (entity_type + entity_id), main_image partial unique index.
- Files RLS politikaları uygulandı (9 politika): anon sadece public dosyaları görür, kullanıcı kendi dosyasını yönetir, manager tümünü görür.
- Git commit: `feat(db): aşama 5 - files modülü tabloları ve rls politikaları`

---

## Aşama 6 — Audit Modülü ✓

- `audit_logs` tablosu oluşturuldu. event_category CHECK constraint, GIN metadata index, user_id SET NULL on delete.
- Audit RLS politikaları uygulandı (3 politika): yalnızca service_role yazar, admin hepsini okur, manager data/file kategorisini okur. UPDATE ve DELETE politikası kasıtlı yok — kayıtlar değiştirilemez.
- Git commit: `feat(db): aşama 6 - audit modülü tablosu ve rls politikaları`

---

## Aşama 7 — Seed Verisi ✓

- 3 sistem rolü eklendi: `admin`, `manager`, `viewer` (is_system=true).
- 12 izin kodu eklendi: auth(1), product(4), catalog(4), files(2), audit(1).
- Rol-izin atamaları yapıldı: admin tüm izinler, manager product+catalog+files, viewer yalnızca okuma.
- Git commit: `feat(db): aşama 7 - seed verisi (roller, izinler, rol-izin atamaları)`

---

## Faz 1 — API Altyapısı ✓ (22 commit, toplam 25+)

### Yapılandırma
- `package.json` + `tsconfig.json`: ESM, strict TS, path aliases (`@/*`). Fastify v5, argon2, jose, zod, pino.
- `.env.example`: 18 ortam değişkeni şablonu (Supabase, JWT, Argon2, CORS, rate-limit).
- `.gitignore`: node_modules, dist, .env*, logs, coverage, editor dosyaları.
- `vitest.config.ts`: globals, node ortamı, v8 coverage, `@` alias.
- `tsup.config.ts`: ESM build, treeshake, sourcemap, argon2 external.

### Config
- `src/config/env.ts`: Zod şeması ile 18 değişken doğrulama; geçersizse `process.exit(1)`.

### Shared Types
- `src/shared/types/common.ts`: `UUID`, `ISODateString`, `TimestampFields`, `SoftDeleteFields`.
- `src/shared/types/api.ts`: `ApiResponse<T>`, `ApiListResponse<T>`, `ApiErrorResponse`, `PaginationMeta`.
- `src/shared/types/fastify.d.ts`: Fastify module augmentation (`supabase`, `userId`, `userRole`, `authenticate`).

### Hata Yönetimi
- `src/shared/errors/error-codes.ts`: 28 hata kodu (auth, validation, resource, rate-limit, file, internal).
- `src/shared/errors/AppError.ts`: Statik factory metodları (unauthorized, forbidden, notFound, conflict, validation, internal).

### Yardımcı Fonksiyonlar
- `src/shared/utils/logger.ts`: Pino, dev modunda pino-pretty, standart serializers.
- `src/shared/utils/response.ts`: `sendSuccess`, `sendList`, `sendError`, `sendCreated`, `sendNoContent`.
- `src/shared/utils/pagination.ts`: Base64URL cursor encode/decode, `buildPaginationMeta`, max 100 limit.
- `src/shared/utils/hash.ts`: argon2id `hashPassword` / `verifyPassword` (env parametreleriyle).
- `src/shared/utils/jwt.ts`: jose ile `signAccessToken`, `signRefreshToken`, `verifyToken<T>`.

### Plugins
- `src/plugins/supabase.ts`: service_role istemcisi, Fastify dekoratörü olarak eklendi.
- `src/plugins/cors.ts`: CORS_ORIGIN env'e göre wildcard veya multi-origin.
- `src/plugins/rate-limit.ts`: IP bazlı sliding window, özel hata yanıtı.
- `src/plugins/auth.ts`: Bearer token doğrulama, `req.userId` / `req.userRole` set ediyor.
- `src/plugins/multipart.ts`: max 10MB / 5 dosya limiti.

### Hooks & Middleware
- `src/shared/hooks/audit.ts`: `onResponse` hook; başarılı işlemleri `audit_logs` tablosuna yazar.
- `src/shared/middleware/role-check.ts`: `requireRole(...roles)` — hiyerarşik kontrol (admin > manager > viewer).

### Uygulama
- `src/app.ts`: Fastify fabrikası — plugin sırası (rate-limit → cors → supabase → auth → multipart), global error handler, 404 handler, `/health` endpoint.
- `src/server.ts`: HTTP sunucu başlatma, graceful shutdown (SIGTERM/SIGINT), unhandledRejection guard.

### Modül İskeletleri
- `src/modules/auth/auth.routes.ts`: auth route stub.
- `src/modules/product/product.routes.ts`: product route stub.
- `src/modules/catalog/catalog.routes.ts`: catalog route stub.
- `src/modules/files/files.routes.ts`: files route stub.
- `src/modules/admin/admin.routes.ts`: admin route stub.
