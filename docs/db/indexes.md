# Index Stratejisi

## Genel Prensipler

1. **Ihtiyac kadar index:** Fazla index yazma performansini dusurup disk alanini tuketime; yalnizca gercek sorgu ihtiyaclarina gore index tanimlanir.
2. **Partial index onceligi:** `WHERE` kosuluyla sinirli partial index'ler, tablo tarama maliyetini dusurur ve index boyutunu kucar tutar. Soft delete (`deleted_at IS NULL`) ve durum filtreleri (`status = 'active'`) icin partial index tercih edilir.
3. **Composite index kolon sirasi:** En secici (cardinality yuksek) veya `WHERE` kosuluyla en cok kullanilan kolon basa alinir.
4. **FK index zorunlulugu:** PostgreSQL, foreign key kolonlarina otomatik olarak index olusturmaz. JOIN performansini saglamak icin tum FK kolonlarina manuel index eklenir.
5. **GIN index — JSONB sorgulamalari:** `certificates`, `metadata`, `device_info` gibi JSONB kolonlarinda anahtar veya deger bazli sorgu yapiliyorsa GIN index kullanilir.
6. **Index bakimi:** Tablo buyumesiyle birlikte `REINDEX` veya `VACUUM ANALYZE` planlanmalidir; otomatik vacuum ayarlari gozden gecirilir.

---

## Modül Bazinda Tum Index Onerileri

---

### auth Modulu

#### `users` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_users_email` | `email` | B-tree | `WHERE deleted_at IS NULL` | Login akisinda e-posta ile hizli arama |
| `idx_users_supabase_auth_id` | `supabase_auth_id` | B-tree UNIQUE | — | Supabase Auth callback'lerinde eslestirme |
| `idx_users_phone` | `phone` | B-tree | `WHERE deleted_at IS NULL AND phone IS NOT NULL` | SMS OTP akisinda telefon araması |
| `idx_users_is_active` | `is_active` | B-tree | `WHERE is_active = true AND deleted_at IS NULL` | Aktif kullanici listesi; admin paneli |

#### `user_roles` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_user_roles_user_id` | `user_id` | B-tree | — | Kullanicinin rollerini getirme |
| `idx_user_roles_role_id` | `role_id` | B-tree | — | Role sahip kullanicilari listeleme |

#### `role_permissions` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_role_permissions_role_id` | `role_id` | B-tree | — | Rolun izinlerini getirme |
| `idx_role_permissions_permission_id` | `permission_id` | B-tree | — | Izne sahip rolleri bulma |

#### `sessions` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_sessions_user_id` | `user_id` | B-tree | `WHERE revoked_at IS NULL AND expires_at > now()` | Kullanicinin aktif oturumlari |
| `idx_sessions_refresh_token_hash` | `refresh_token_hash` | B-tree UNIQUE | — | Token yenileme isleminde dogrulama |
| `idx_sessions_expires_at` | `expires_at` | B-tree | — | Suresi gecmis oturum temizligi |

#### `otp_verifications` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_otp_user_purpose` | `(user_id, purpose)` | B-tree | `WHERE used_at IS NULL AND expires_at > now()` | Aktif OTP sorgulama |
| `idx_otp_expires_at` | `expires_at` | B-tree | — | Gecmis OTP temizligi |

#### `rate_limit_logs` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_rate_limit_identifier_action` | `(identifier, action_type)` | B-tree | `WHERE blocked_until IS NOT NULL OR attempt_count > 0` | Her istekte rate limit kontrolu; kritik performans |
| `idx_rate_limit_window_start` | `window_start` | B-tree | — | Eski pencere temizligi |
| `idx_rate_limit_blocked_until` | `blocked_until` | B-tree | `WHERE blocked_until IS NOT NULL` | Bloke kontrolu |

---

### product Modulu

#### `brands` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_brands_slug` | `slug` | B-tree UNIQUE | `WHERE deleted_at IS NULL` | Slug ile marka bulma |
| `idx_brands_is_active` | `is_active` | B-tree | `WHERE is_active = true AND deleted_at IS NULL` | Aktif marka listesi |

#### `categories` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_categories_parent_id` | `parent_id` | B-tree | `WHERE deleted_at IS NULL` | Alt kategori sorgulari |
| `idx_categories_slug` | `slug` | B-tree UNIQUE | `WHERE deleted_at IS NULL` | Slug ile kategori bulma |

#### `products` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_products_code` | `code` | B-tree UNIQUE | `WHERE deleted_at IS NULL` | Urun kodu ile hizli arama; B2B entegrasyon |
| `idx_products_brand_id` | `brand_id` | B-tree | `WHERE deleted_at IS NULL` | Markaya gore urun listeleme |
| `idx_products_category_id` | `category_id` | B-tree | `WHERE deleted_at IS NULL` | Kategoriye gore urun listeleme |
| `idx_products_status` | `status` | B-tree | `WHERE deleted_at IS NULL` | Durum bazli filtreleme |
| `idx_products_slug` | `slug` | B-tree UNIQUE | `WHERE deleted_at IS NULL` | Slug ile erisim |
| `idx_products_brand_category` | `(brand_id, category_id)` | B-tree | `WHERE deleted_at IS NULL AND status = 'active'` | Marka+kategori kombine filtresi; katalog sayfasi |

#### `product_technical_details` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_ptd_product_id` | `product_id` | B-tree UNIQUE | — | Bire-bir ilisi join; FK |
| `idx_ptd_socket_type` | `socket_type` | B-tree | `WHERE socket_type IS NOT NULL` | Duy tipine gore filtreleme |
| `idx_ptd_energy_class` | `energy_efficiency_class` | B-tree | `WHERE energy_efficiency_class IS NOT NULL` | Enerji sinifi bazli filtreleme |
| `idx_ptd_dimmable` | `dimmable` | B-tree | `WHERE dimmable = true` | Dim destekli urun filtresi |
| `idx_ptd_power_lm` | `(power_w, light_output_lm)` | B-tree | — | Guc/lumen araliginda arama |

#### `product_display` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_pd_product_id` | `product_id` | B-tree UNIQUE | — | Bire-bir iliski join; FK |
| `idx_pd_barcode` | `barcode` | B-tree UNIQUE | `WHERE barcode IS NOT NULL AND deleted_at IS NULL` | Barkod tarayici ile urun arama |
| `idx_pd_certificates` | `certificates` | GIN | — | Sertifika tipine gore JSONB sorgulama |

---

### catalog Modulu

#### `catalogs` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_catalogs_slug` | `slug` | B-tree UNIQUE | `WHERE deleted_at IS NULL` | Slug ile katalog bulma |
| `idx_catalogs_status` | `status` | B-tree | `WHERE deleted_at IS NULL` | Aktif katalog sorgulari |
| `idx_catalogs_valid_dates` | `(valid_from, valid_to)` | B-tree | `WHERE deleted_at IS NULL` | Belirli tarihte gecerli katalog |

#### `catalog_items` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_catalog_items_catalog_id` | `catalog_id` | B-tree | — | Katalog icindeki tum urunler |
| `idx_catalog_items_product_id` | `product_id` | B-tree | — | Urunun hangi kataloglarda oldugu |
| `idx_catalog_items_sort` | `(catalog_id, sort_order)` | B-tree | — | Sirali katalog icerik listesi |

#### `pricing` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_pricing_product_id` | `product_id` | B-tree | — | Urune ait fiyatlar |
| `idx_pricing_catalog_id` | `catalog_id` | B-tree | `WHERE catalog_id IS NOT NULL` | Katalog bazli fiyat sorgulari |
| `idx_pricing_product_currency` | `(product_id, currency, price_type)` | B-tree | `WHERE valid_to IS NULL OR valid_to >= current_date` | Aktif fiyat sorgusunda en hizli yol |
| `idx_pricing_valid_dates` | `(valid_from, valid_to)` | B-tree | — | Tarih araliginda gecerli fiyat |

---

### files Modulu

#### `files` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_files_storage_path` | `storage_path` | B-tree UNIQUE | — | Storage yolu ile tekil dosya erisimi |
| `idx_files_uploaded_by` | `uploaded_by` | B-tree | `WHERE deleted_at IS NULL` | Kullanicinin dosyalarini listeleme |
| `idx_files_bucket_name` | `bucket_name` | B-tree | `WHERE deleted_at IS NULL` | Bucket bazli sorgular |
| `idx_files_mime_type` | `mime_type` | B-tree | `WHERE deleted_at IS NULL` | Tip bazli filtreleme |
| `idx_files_metadata` | `metadata` | GIN | — | Metadata JSONB sorgulari |

#### `file_relations` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_file_relations_file_id` | `file_id` | B-tree | — | Dosyanin bagli oldugu varliklari bulma |
| `idx_file_relations_entity` | `(entity_type, entity_id)` | B-tree | — | Varlığa ait tum dosyalar (en sik sorgu) |
| `idx_file_relations_entity_relation` | `(entity_type, entity_id, relation_type)` | B-tree | — | Varlık + relation_type filtresi |

---

### audit Modulu

#### `audit_logs` Tablosu

| Index Adi | Kolonlar | Tip | Partial Kosul | Gerekcesi |
|---|---|---|---|---|
| `idx_audit_logs_user_id` | `user_id` | B-tree | — | Kullanicinin olay gecmisi |
| `idx_audit_logs_event_type` | `event_type` | B-tree | — | Olay tipi bazli sorgular |
| `idx_audit_logs_event_category` | `event_category` | B-tree | — | Kategori bazli filtreleme |
| `idx_audit_logs_entity` | `(entity_type, entity_id)` | B-tree | — | Belirli varlığin degisiklik gecmisi |
| `idx_audit_logs_created_at` | `created_at` | B-tree | — | Zaman araliginda olay sorgulama (DESC siralama) |
| `idx_audit_logs_severity_critical` | `(severity, created_at)` | B-tree | `WHERE severity IN ('warning','error','critical')` | Kritik olay monitöring paneli |
| `idx_audit_logs_ip_address` | `ip_address` | B-tree | — | IP bazli guvenlik sorgulari |

---

## Index Toplam Ozeti

| Modul | Tablo Sayisi | Toplam Index |
|---|---|---|
| auth | 7 | ~18 |
| product | 5 | ~19 |
| catalog | 3 | ~10 |
| files | 2 | ~10 |
| audit | 1 | ~7 |
| **Toplam** | **18** | **~64** |

---

## Performans Izleme Onerileri

- `pg_stat_user_indexes` gorunumu ile hangi indexlerin kullanilmadigi duzenli kontrol edilmeli; kullanilmayan index'ler kaldirilmalidir.
- `pg_stat_statements` ile en yuksek maliyetli sorgular tespit edilmeli ve gerekirse yeni index'ler eklenmelidir.
- Tablo buyumesiyle birlikte `EXPLAIN ANALYZE` sonuclari gozden gecirilmeli; sequential scan varligi yeni index ihtiyacina isaret eder.
- Partitioned tablolarda (ornegin audit_logs) her partition icin ayri index yonetimi gereklidir.
