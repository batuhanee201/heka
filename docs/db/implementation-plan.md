# Supabase PostgreSQL — Kodlama Uygulama Planı

Proje: **Heka** | Supabase Project ID: `tshbwjqktufqumxnbubm` | Bölge: `ap-southeast-2`

Bu belge, `docs/db/` altındaki tasarım dokümanlarının PostgreSQL / Supabase MCP aracılığıyla
uygulanacağı sırayı, her migration'ın içereceği SQL bileşenlerini ve dikkat edilecek noktaları
tanımlar. Hiç kod içermez; yalnızca **ne yazılacağını ve hangi sırayla** tanımlar.

---

## Kullanılacak Araç

Tüm migration'lar `mcp__supabase__apply_migration` aracı ile Supabase projesine doğrudan
uygulanacaktır. Her `apply_migration` çağrısı tek bir migration dosyasına karşılık gelir ve
Supabase'in `supabase_migrations.schema_migrations` tablosuna otomatik kaydedilir.

---

## Genel Kurallar (Tüm Migration'lar İçin)

| Kural | Açıklama |
|---|---|
| Idempotency | Her ifade `IF NOT EXISTS` veya `OR REPLACE` kullanır |
| UUID | `gen_random_uuid()` (pgcrypto — ek extension gerektirmez, PostgreSQL 13+ dahili) |
| Timestamp | Tüm zaman kolonları `TIMESTAMPTZ` tipinde, `DEFAULT now()` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` — NULL = aktif, dolu = silinmiş |
| updated_at trigger | Ortak trigger fonksiyonu tüm tablolara uygulanır |
| RLS varsayılanı | Her tablo için `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| Politika önce DROP | Politika güncellemelerinde önce `DROP POLICY IF EXISTS` |

---

## Migration Listesi ve İçerikleri

### AŞAMA 1 — Temel Altyapı

---

#### M-001 · `create_extensions`

**Amaç:** Gerekli PostgreSQL extension'larını etkinleştir.

**İçerecek ifadeler:**
- `CREATE EXTENSION IF NOT EXISTS pgcrypto` — UUID ve şifreleme fonksiyonları
- `CREATE EXTENSION IF NOT EXISTS pg_trgm` — Metin benzerlik aramaları için trigram desteği

**Dikkat:** Supabase'de `uuid-ossp` ayrıca gerekli değildir; `gen_random_uuid()` pgcrypto ile gelir.

---

#### M-002 · `create_updated_at_trigger_function`

**Amaç:** Tüm tablolarda `updated_at` kolonunu otomatik güncelleyecek ortak trigger fonksiyonunu tanımla.

**İçerecek ifadeler:**
- `CREATE OR REPLACE FUNCTION set_updated_at()` — `RETURNS trigger`, `NEW.updated_at = now()` atar
- `LANGUAGE plpgsql` ile tanımlanır

**Kullanım:** Her tabloya `BEFORE UPDATE ON ... FOR EACH ROW EXECUTE FUNCTION set_updated_at()` trigger'ı eklenir.

---

### AŞAMA 2 — Auth Modülü

---

#### M-003 · `create_users_table`

**Amaç:** Uygulama düzeyindeki kullanıcı profillerini tutan ana tablo.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `supabase_auth_id` | `UUID NOT NULL UNIQUE` | `auth.users.id` ile eşleşir |
| `email` | `TEXT NOT NULL` | Partial unique index ile (deleted_at IS NULL) |
| `phone` | `TEXT` | Nullable, partial unique index |
| `full_name` | `TEXT NOT NULL` | |
| `password_hash` | `TEXT NOT NULL` | Argon2id hash; uygulama katmanında üretilir |
| `email_verified` | `BOOLEAN NOT NULL DEFAULT false` | |
| `phone_verified` | `BOOLEAN NOT NULL DEFAULT false` | |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` | |
| `last_login_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | trigger ile güncellenir |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Ekstra:**
- `set_updated_at` trigger'ı eklenir
- `ENABLE ROW LEVEL SECURITY`
- Partial unique index: `email WHERE deleted_at IS NULL`
- Partial unique index: `phone WHERE deleted_at IS NULL AND phone IS NOT NULL`
- B-tree index: `supabase_auth_id` (UNIQUE)
- Partial index: `is_active WHERE is_active = true`

---

#### M-004 · `create_roles_table`

**Amaç:** Sistem rollerini (admin, manager, viewer) tanımla.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT NOT NULL UNIQUE` | |
| `description` | `TEXT` | |
| `is_system` | `BOOLEAN NOT NULL DEFAULT false` | Sistem rolleri silinemez |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | trigger |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`

---

#### M-005 · `create_permissions_table`

**Amaç:** `{modul}.{eylem}` formatında atomik izin tanımları.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `code` | `TEXT NOT NULL UNIQUE` | Örnek: `product.create` |
| `description` | `TEXT` | |
| `module` | `TEXT NOT NULL` | `product`, `catalog`, `files`, `auth` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- B-tree index: `module` — modüle göre filtreleme

---

#### M-006 · `create_user_roles_table`

**Amaç:** Kullanıcı ↔ Rol çoka-çok ilişkisi.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `user_id` | `UUID NOT NULL FK → users.id ON DELETE CASCADE` | |
| `role_id` | `UUID NOT NULL FK → roles.id ON DELETE CASCADE` | |
| `assigned_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `assigned_by` | `UUID FK → users.id` | nullable |

**PK:** `PRIMARY KEY (user_id, role_id)` — composite

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- B-tree index: `user_id`, `role_id` (ayrı ayrı)

---

#### M-007 · `create_role_permissions_table`

**Amaç:** Rol ↔ İzin çoka-çok ilişkisi.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `role_id` | `UUID NOT NULL FK → roles.id ON DELETE CASCADE` | |
| `permission_id` | `UUID NOT NULL FK → permissions.id ON DELETE CASCADE` | |
| `granted_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `granted_by` | `UUID FK → users.id` | nullable |

**PK:** `PRIMARY KEY (role_id, permission_id)` — composite

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`

---

#### M-008 · `create_sessions_table`

**Amaç:** Refresh token ve oturum yönetimi.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID NOT NULL FK → users.id ON DELETE CASCADE` | |
| `refresh_token_hash` | `TEXT NOT NULL UNIQUE` | Argon2id hash |
| `device_info` | `JSONB` | nullable |
| `ip_address` | `INET` | nullable |
| `user_agent` | `TEXT` | nullable |
| `expires_at` | `TIMESTAMPTZ NOT NULL` | |
| `last_active_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `revoked_at` | `TIMESTAMPTZ` | nullable — logout/admin iptal |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- B-tree index: `user_id`
- B-tree UNIQUE index: `refresh_token_hash`
- B-tree index: `expires_at` — süresi geçmiş oturum temizliği

---

#### M-009 · `create_otp_verifications_table`

**Amaç:** E-posta ve SMS OTP doğrulama kayıtları.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID NOT NULL FK → users.id ON DELETE CASCADE` | |
| `channel` | `TEXT NOT NULL CHECK (channel IN ('email','sms'))` | |
| `purpose` | `TEXT NOT NULL CHECK (purpose IN ('email_verification','phone_verification','password_reset','login_2fa'))` | |
| `code_hash` | `TEXT NOT NULL` | OTP hash'i — plain text yok |
| `expires_at` | `TIMESTAMPTZ NOT NULL` | |
| `used_at` | `TIMESTAMPTZ` | nullable |
| `attempt_count` | `INTEGER NOT NULL DEFAULT 0` | max 3 |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- Composite B-tree index: `(user_id, purpose)` — aktif OTP sorgusu
- B-tree index: `expires_at` — süresi geçmiş kayıt temizliği

---

#### M-010 · `create_rate_limit_logs_table`

**Amaç:** Brute-force ve kötüye kullanım koruması için istek sayacı.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `identifier` | `TEXT NOT NULL` | IP, email veya user_id |
| `action_type` | `TEXT NOT NULL CHECK (action_type IN ('login','otp_request','password_reset','otp_verify'))` | |
| `attempt_count` | `INTEGER NOT NULL DEFAULT 1` | |
| `window_start` | `TIMESTAMPTZ NOT NULL` | pencere başlangıcı |
| `blocked_until` | `TIMESTAMPTZ` | nullable |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | trigger |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- Composite B-tree index: `(identifier, action_type)` — her istekte kontrol
- B-tree index: `window_start` — eski pencere temizliği

---

#### M-011 · `create_auth_rls_policies`

**Amaç:** Auth modülünün tüm tablolarına RLS politikalarını uygula.

**Politikalar (her tablo için):**

`users`:
- `users_select_own` — `authenticated` → `id = auth.uid()`
- `users_select_admin` — `app_admin` → koşulsuz
- `users_update_own` — `authenticated` → `id = auth.uid() AND deleted_at IS NULL`
- `users_update_admin` — `app_admin` → `deleted_at IS NULL`
- `users_insert_service` — `service_role` → koşulsuz
- Fiziksel DELETE politikası yok (soft delete zorunlu)

`roles`:
- `roles_select_all` — `authenticated` → koşulsuz
- `roles_insert_admin`, `roles_update_admin` (is_system=false), `roles_delete_admin` (is_system=false) — `app_admin`

`permissions`:
- `permissions_select_auth` — `authenticated` → koşulsuz
- INSERT/UPDATE/DELETE — `app_admin`

`user_roles`:
- `user_roles_select_own` — `authenticated` → `user_id = auth.uid()`
- `user_roles_select_admin` — `app_admin`
- INSERT/DELETE — `app_admin`

`role_permissions`:
- SELECT — `authenticated`
- INSERT/DELETE — `app_admin`

`sessions`:
- SELECT kendi — `authenticated` → `user_id = auth.uid()`
- SELECT tüm — `app_admin`
- INSERT/UPDATE — `service_role`

`otp_verifications`:
- SELECT — `app_admin` (denetim)
- INSERT/UPDATE — `service_role`

`rate_limit_logs`:
- SELECT — `app_admin`
- INSERT/UPDATE — `service_role`

---

### AŞAMA 3 — Product Modülü

---

#### M-012 · `create_brands_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT NOT NULL UNIQUE` | |
| `slug` | `TEXT NOT NULL` | Partial unique index (deleted_at IS NULL) |
| `description` | `TEXT` | |
| `website_url` | `TEXT` | |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` | |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- Partial unique index: `slug WHERE deleted_at IS NULL`
- Partial index: `is_active WHERE is_active = true`

---

#### M-013 · `create_categories_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `parent_id` | `UUID FK → categories.id ON DELETE RESTRICT` | nullable — öz-referans |
| `name` | `TEXT NOT NULL` | |
| `slug` | `TEXT NOT NULL` | Partial unique index |
| `description` | `TEXT` | |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` | |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` | |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Dikkat:** `ON DELETE RESTRICT` — alt kategorisi olan kategori silinemez.

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- B-tree index: `parent_id`
- Partial unique index: `slug WHERE deleted_at IS NULL`

---

#### M-014 · `create_products_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `code` | `TEXT NOT NULL` | Partial unique index (ERD-266 gibi) |
| `name` | `TEXT NOT NULL` | |
| `product_type` | `TEXT` | nullable |
| `brand_id` | `UUID NOT NULL FK → brands.id ON DELETE RESTRICT` | |
| `category_id` | `UUID NOT NULL FK → categories.id ON DELETE RESTRICT` | |
| `status` | `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','discontinued','archived'))` | |
| `description` | `TEXT` | |
| `short_description` | `TEXT` | |
| `slug` | `TEXT NOT NULL` | Partial unique index |
| `created_by` | `UUID NOT NULL FK → users.id` | |
| `updated_by` | `UUID FK → users.id` | nullable |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- Partial unique index: `code WHERE deleted_at IS NULL`
- Partial unique index: `slug WHERE deleted_at IS NULL`
- B-tree index: `brand_id`, `category_id`
- Partial index: `status WHERE deleted_at IS NULL`

---

#### M-015 · `create_product_technical_details_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID NOT NULL UNIQUE FK → products.id ON DELETE CASCADE` | bire-bir zorlar |
| `socket_type` | `TEXT` | G4, E27, GU10... |
| `voltage_range` | `TEXT` | 220-240V AC |
| `power_w` | `NUMERIC(6,2) CHECK (power_w > 0)` | |
| `light_output_lm` | `NUMERIC(8,2) CHECK (light_output_lm >= 0)` | |
| `color_temp_k` | `INTEGER CHECK (color_temp_k BETWEEN 1000 AND 10000)` | |
| `color_rendering_index` | `NUMERIC(4,1)` | CRI |
| `beam_angle_deg` | `NUMERIC(5,2)` | |
| `dimmable` | `BOOLEAN NOT NULL DEFAULT false` | |
| `energy_efficiency_class` | `TEXT CHECK (... IN ('A','B','C','D','E','F','G'))` | |
| `lifetime_hours` | `INTEGER CHECK (lifetime_hours > 0)` | |
| `ip_rating` | `TEXT` | IP44 gibi |
| `operating_temp_min_c` | `NUMERIC(5,1)` | |
| `operating_temp_max_c` | `NUMERIC(5,1)` | |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- UNIQUE index: `product_id` (bire-bir garantisi)
- Partial B-tree index: `dimmable WHERE dimmable = true`
- B-tree index: `socket_type`, `energy_efficiency_class`

---

#### M-016 · `create_product_display_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID NOT NULL UNIQUE FK → products.id ON DELETE CASCADE` | bire-bir zorlar |
| `package_qty` | `INTEGER CHECK (package_qty > 0)` | 100 Pcs |
| `box_size_mm` | `TEXT` | 8x16.5x9.5mm |
| `box_weight_gr` | `NUMERIC(10,2) CHECK (box_weight_gr > 0)` | 370 Gr |
| `barcode` | `TEXT UNIQUE` | nullable |
| `qr_code_data` | `TEXT` | nullable |
| `certificates` | `JSONB` | `{"emc":true,"ce":true,...}` |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- UNIQUE index: `product_id`
- UNIQUE index: `barcode`
- GIN index: `certificates` — JSONB arama için

---

#### M-017 · `create_product_rls_policies`

**Politikalar:**

`brands` / `categories`:
- SELECT — `authenticated` → `deleted_at IS NULL`
- INSERT / UPDATE — `app_manager`, `app_admin`
- Soft-delete (UPDATE) — `app_admin`

`products`:
- SELECT viewer — `authenticated` → `deleted_at IS NULL AND status = 'active'`
- SELECT manager — `app_manager` → `deleted_at IS NULL`
- SELECT admin all — `app_admin` → koşulsuz
- INSERT / UPDATE — `app_manager`, `app_admin`
- Soft-delete — `app_admin`

`product_technical_details` / `product_display`:
- SELECT — `authenticated` (ilgili ürün aktifse)
- SELECT manager — `app_manager`, `app_admin`
- INSERT / UPDATE — `app_manager`, `app_admin`

---

### AŞAMA 4 — Catalog Modülü

---

#### M-018 · `create_catalogs_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT NOT NULL` | |
| `description` | `TEXT` | |
| `status` | `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived'))` | |
| `valid_from` | `DATE` | nullable |
| `valid_to` | `DATE` | nullable |
| `created_by` | `UUID NOT NULL FK → users.id` | |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**CHECK constraint:** `valid_to IS NULL OR valid_to >= valid_from`

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- Partial index: `status WHERE deleted_at IS NULL`
- B-tree index: `valid_from`, `valid_to`

---

#### M-019 · `create_catalog_items_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `catalog_id` | `UUID NOT NULL FK → catalogs.id ON DELETE CASCADE` | |
| `product_id` | `UUID NOT NULL FK → products.id ON DELETE RESTRICT` | |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**UNIQUE constraint:** `(catalog_id, product_id)` — bir ürün katalogda bir kez yer alır.

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- Composite index: `(catalog_id, sort_order)` — sıralı listeleme

---

#### M-020 · `create_pricing_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID NOT NULL FK → products.id ON DELETE CASCADE` | |
| `catalog_id` | `UUID FK → catalogs.id ON DELETE SET NULL` | nullable |
| `price` | `NUMERIC(12,4) NOT NULL CHECK (price >= 0)` | |
| `currency` | `TEXT NOT NULL DEFAULT 'USD'` | ISO 4217 |
| `valid_from` | `DATE` | nullable |
| `valid_to` | `DATE` | nullable |
| `created_by` | `UUID NOT NULL FK → users.id` | |
| `created_at / updated_at` | `TIMESTAMPTZ` | trigger |

**CHECK constraint:** `valid_to IS NULL OR valid_to >= valid_from`

**Ekstra:**
- `set_updated_at` trigger'ı
- `ENABLE ROW LEVEL SECURITY`
- Composite index: `(product_id, currency, valid_from, valid_to)`

---

#### M-021 · `create_catalog_rls_policies`

**Politikalar:**

`catalogs`:
- SELECT viewer — `authenticated` → `deleted_at IS NULL AND status = 'active'`
- SELECT manager — `app_manager`, `app_admin` → `deleted_at IS NULL`
- INSERT / UPDATE — `app_manager`, `app_admin`

`catalog_items`:
- SELECT — `authenticated` (ilgili katalog aktifse)
- INSERT / UPDATE / DELETE — `app_manager`, `app_admin`

`pricing`:
- SELECT — `authenticated` → aktif ürün + geçerli tarih aralığı
- SELECT manager — `app_manager`, `app_admin` → koşulsuz
- INSERT / UPDATE — `app_manager`, `app_admin`
- `anon` fiyat verisini göremez

---

### AŞAMA 5 — Files Modülü

---

#### M-022 · `create_files_table`

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `bucket_name` | `TEXT NOT NULL` | `product-images`, `catalogs`, `media` |
| `storage_path` | `TEXT NOT NULL UNIQUE` | Supabase Storage içindeki tam yol |
| `original_filename` | `TEXT NOT NULL` | |
| `mime_type` | `TEXT NOT NULL` | `image/jpeg`, `application/pdf` |
| `size_bytes` | `BIGINT NOT NULL CHECK (size_bytes > 0)` | |
| `is_public` | `BOOLEAN NOT NULL DEFAULT false` | public bucket mı? |
| `uploaded_by` | `UUID NOT NULL FK → users.id` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- UNIQUE index: `storage_path`
- B-tree index: `uploaded_by`
- Partial index: `bucket_name WHERE deleted_at IS NULL`

---

#### M-023 · `create_file_relations_table`

**Amaç:** Polimorfik ilişki — bir dosyayı herhangi bir entity'ye bağlar.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `file_id` | `UUID NOT NULL FK → files.id ON DELETE CASCADE` | |
| `entity_type` | `TEXT NOT NULL` | `product`, `catalog`, `brand`... |
| `entity_id` | `UUID NOT NULL` | ilgili kaydın ID'si |
| `relation_type` | `TEXT NOT NULL` | `main_image`, `gallery`, `document`, `thumbnail` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Partial UNIQUE constraint:** `(entity_type, entity_id) WHERE relation_type = 'main_image'`
— Bir entity'nin yalnızca tek bir ana görseli olabilir.

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- Composite index: `(entity_type, entity_id)`
- Composite index: `(entity_type, entity_id, sort_order)` — sıralı galeri

---

#### M-024 · `create_files_rls_policies`

**Politikalar:**

`files`:
- SELECT public — `anon`, `authenticated` → `is_public = true AND deleted_at IS NULL`
- SELECT own — `authenticated` → `uploaded_by = auth.uid() AND deleted_at IS NULL`
- SELECT manager — `app_manager`, `app_admin` → `deleted_at IS NULL`
- INSERT — `authenticated`
- UPDATE / soft-DELETE — `authenticated` (kendi dosyası) + `app_admin`

`file_relations`:
- SELECT — `authenticated` (bağlı dosyaya erişimi olan)
- INSERT / DELETE — `app_manager`, `app_admin`

---

### AŞAMA 6 — Audit Modülü

---

#### M-025 · `create_audit_logs_table`

**Amaç:** Tüm kritik olayların değiştirilemez kaydı.

**Kolonlar:**

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID FK → users.id ON DELETE SET NULL` | nullable — sistem olayları için |
| `event_type` | `TEXT NOT NULL` | `auth.login`, `data.update`, `permission.change`... |
| `event_category` | `TEXT NOT NULL CHECK (... IN ('auth','data','permission','file','security'))` | |
| `entity_type` | `TEXT` | etkilenen kayıt türü |
| `entity_id` | `UUID` | etkilenen kayıt ID'si |
| `old_data` | `JSONB` | değişiklik öncesi veri (hassas alanlar maskelenir) |
| `new_data` | `JSONB` | değişiklik sonrası veri |
| `ip_address` | `INET` | |
| `user_agent` | `TEXT` | |
| `metadata` | `JSONB` | ek bağlam bilgisi |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Önemli:** `UPDATE` ve `DELETE` politikası yok — kayıtlar değiştirilemez.

**Ekstra:**
- `ENABLE ROW LEVEL SECURITY`
- B-tree index: `user_id`
- B-tree index: `event_category`
- Composite index: `(entity_type, entity_id)`
- B-tree index: `created_at` — tarih bazlı sorgular
- GIN index: `metadata` — JSONB arama

---

#### M-026 · `create_audit_rls_policies`

**Politikalar:**

`audit_logs`:
- SELECT — `app_admin` → koşulsuz
- SELECT data/file — `app_manager` → `event_category IN ('data','file')`
- INSERT — `service_role` → yalnızca sistem yazar
- UPDATE — yok (mutlak yasak)
- DELETE — yok (mutlak yasak)

---

### AŞAMA 7 — Seed Verisi

---

#### M-027 · `seed_roles`

**Amaç:** Başlangıç rollerini ekle.

**Eklenecek kayıtlar:**

| name | description | is_system |
|---|---|---|
| `admin` | Tam sistem erişimi | true |
| `manager` | Ürün/katalog yönetimi | true |
| `viewer` | Yalnızca okuma | true |

`ON CONFLICT (name) DO NOTHING` ile idempotent.

---

#### M-028 · `seed_permissions`

**Amaç:** Atomik izin kodlarını ekle.

**Eklenecek izin kodları:**

| module | code |
|---|---|
| `auth` | `auth.manage_users` |
| `product` | `product.create`, `product.read`, `product.update`, `product.delete` |
| `catalog` | `catalog.create`, `catalog.read`, `catalog.update`, `catalog.delete` |
| `files` | `files.upload`, `files.delete` |
| `audit` | `audit.read` |

`ON CONFLICT (code) DO NOTHING` ile idempotent.

---

#### M-029 · `seed_role_permissions`

**Amaç:** Rollere izinleri ata.

**Atama matrisi:**

| Rol | İzinler |
|---|---|
| `admin` | Tüm izinler |
| `manager` | `product.*`, `catalog.*`, `files.*` |
| `viewer` | `product.read`, `catalog.read` |

`ON CONFLICT DO NOTHING` ile idempotent.

---

## Uygulama Sırası (Özet)

```
M-001  create_extensions
M-002  create_updated_at_trigger_function
M-003  create_users_table
M-004  create_roles_table
M-005  create_permissions_table
M-006  create_user_roles_table
M-007  create_role_permissions_table
M-008  create_sessions_table
M-009  create_otp_verifications_table
M-010  create_rate_limit_logs_table
M-011  create_auth_rls_policies
M-012  create_brands_table
M-013  create_categories_table
M-014  create_products_table
M-015  create_product_technical_details_table
M-016  create_product_display_table
M-017  create_product_rls_policies
M-018  create_catalogs_table
M-019  create_catalog_items_table
M-020  create_pricing_table
M-021  create_catalog_rls_policies
M-022  create_files_table
M-023  create_file_relations_table
M-024  create_files_rls_policies
M-025  create_audit_logs_table
M-026  create_audit_rls_policies
M-027  seed_roles
M-028  seed_permissions
M-029  seed_role_permissions
```

**Toplam:** 29 migration · 19 tablo · 6 modül

---

## Dikkat Edilecek Noktalar

### Supabase Auth Entegrasyonu
- `users.supabase_auth_id` → `auth.users.id` (farklı schema — FK doğrudan kurulamaz)
- Kullanıcı kaydı Supabase Auth webhook/trigger ile `users` tablosuna yansıtılır
- `password_hash` Supabase Auth'un şifresinden bağımsız; özel auth akışları için

### JWT Custom Claims
- RLS politikalarında `app_admin`, `app_manager`, `app_viewer` rolleri
- JWT `app_metadata.role` claim'inden okunur
- Supabase'de custom claim için `auth.hook` veya admin API kullanılır

### `service_role` Anahtarı
- Rate limit, OTP, session INSERT/UPDATE işlemleri `service_role` üzerinden yapılır
- Bu anahtar hiçbir zaman istemci tarafına gönderilmez

### JSONB Alanları
- `certificates`, `device_info`, `metadata`, `old_data`, `new_data` GIN index alır
- `old_data` / `new_data` içindeki `password_hash` gibi alanlar log yazılmadan önce uygulama katmanında maskelenir

### Argon2id
- `password_hash` ve `refresh_token_hash` uygulama katmanında hash'lenerek kaydedilir
- Veritabanı düzeyinde hash fonksiyonu tanımlanmaz; bu işlem API/backend servisine aittir

### Fiziksel Silme Yasağı
- `users`, `products`, `brands`, `categories`, `catalogs`, `files` tabloları yalnızca soft delete
- `audit_logs` hiçbir koşulda silinemez (RLS politikası + uygulama katmanı kontrolü)
