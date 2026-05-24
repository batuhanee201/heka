# Migration ve Versioning Stratejisi

## Genel Yaklasim

Heka projesi, Supabase'in yerel migration sistemi uzerine insa edilmis, **versiyonlu ve geri alinabilir** bir migration stratejisi izler. Her degisiklik; timestamp ile adlandirilmis, tek amacli ve idempotent migration dosyalarinda belgelenir.

---

## Dosya Isimlendirme Konvansiyonu

```
{YYYYMMDDHHMMSS}_{aciklayici_isim}.sql
```

Ornekler:
```
20250101000001_create_extensions.sql
20250101000002_create_core_functions.sql
20250101000100_create_users_table.sql
20250101000200_create_roles_permissions.sql
```

- Timestamp prefix, migration siralamasi icin kullanilir.
- Aciklayici isim ne yapildigini anlatilacar sekilde yazilir (`create`, `alter`, `add`, `drop`, `seed` gibi fiiller ile baslar).
- Her migration dosyasi tek bir amaca hizmet eder; karisik degisiklikler tek dosyaya yazilmaz.

---

## Migration Dizin Yapisi

```
supabase/
└── migrations/
    ├── 20250101000001_create_extensions.sql
    ├── 20250101000002_create_core_functions.sql
    ├── 20250101000003_create_updated_at_trigger.sql
    ├── 20250101000100_create_users_table.sql
    ├── 20250101000101_create_users_indexes.sql
    ├── 20250101000102_enable_rls_users.sql
    ├── 20250101000200_create_roles_permissions.sql
    ...
    └── 20250601000001_add_product_ip_rating.sql
```

---

## Migration Oncelik Sirasi

Tablolar arasi bagimliliklar nedeniyle asagidaki sirada olusturulmalidir:

### Asama 1 — Temel Altyapi

| Sira | Dosya Amaci | Aciklama |
|---|---|---|
| 1 | `create_extensions` | `uuid-ossp`, `pgcrypto` gibi PostgreSQL uzantilari etkinlestirilir |
| 2 | `create_core_functions` | `gen_random_uuid()`, `set_updated_at()` gibi yardimci fonksiyonlar tanimlanir |
| 3 | `create_updated_at_trigger_function` | Tum tablolarda kullanilacak ortak `updated_at` trigger fonksiyonu tanimlanir |

### Asama 2 — Auth Modulu

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 4 | `create_users_table` | Supabase Auth'a bagimli |
| 5 | `create_roles_table` | Bagimsiz |
| 6 | `create_permissions_table` | Bagimsiz |
| 7 | `create_user_roles_table` | `users`, `roles` |
| 8 | `create_role_permissions_table` | `roles`, `permissions` |
| 9 | `create_sessions_table` | `users` |
| 10 | `create_otp_verifications_table` | `users` |
| 11 | `create_rate_limit_logs_table` | Bagimsiz |
| 12 | `enable_rls_auth_tables` | Tum auth tablolari |
| 13 | `create_auth_indexes` | Tum auth tablolari |
| 14 | `create_auth_rls_policies` | `users`, `roles`, `sessions`, vb. |

### Asama 3 — Product Modulu

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 15 | `create_brands_table` | Bagimsiz |
| 16 | `create_categories_table` | `categories` (oz-referans) |
| 17 | `create_products_table` | `brands`, `categories`, `users` |
| 18 | `create_product_technical_details_table` | `products` |
| 19 | `create_product_display_table` | `products` |
| 20 | `enable_rls_product_tables` | Urun tablolari |
| 21 | `create_product_indexes` | Urun tablolari |
| 22 | `create_product_rls_policies` | Urun tablolari |

### Asama 4 — Catalog Modulu

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 23 | `create_catalogs_table` | `users` |
| 24 | `create_catalog_items_table` | `catalogs`, `products` |
| 25 | `create_pricing_table` | `products`, `catalogs`, `users` |
| 26 | `enable_rls_catalog_tables` | Katalog tablolari |
| 27 | `create_catalog_indexes` | Katalog tablolari |
| 28 | `create_catalog_rls_policies` | Katalog tablolari |

### Asama 5 — Files Modulu

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 29 | `create_files_table` | `users` |
| 30 | `create_file_relations_table` | `files` |
| 31 | `enable_rls_files_tables` | Dosya tablolari |
| 32 | `create_files_indexes` | Dosya tablolari |
| 33 | `create_files_rls_policies` | Dosya tablolari |

### Asama 6 — Audit Modulu

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 34 | `create_audit_logs_table` | `users` |
| 35 | `enable_rls_audit_logs` | `audit_logs` |
| 36 | `create_audit_indexes` | `audit_logs` |
| 37 | `create_audit_rls_policies` | `audit_logs` |

### Asama 7 — Seed Verisi

| Sira | Dosya Amaci | Bagimlilik |
|---|---|---|
| 38 | `seed_roles` | `roles` |
| 39 | `seed_permissions` | `permissions` |
| 40 | `seed_role_permissions` | `roles`, `permissions` |
| 41 | `seed_admin_user` | `users`, `user_roles` (sadece development/staging) |

---

## Migration Yazma Kurallari

### 1. Idempotency

Her migration `IF NOT EXISTS` veya kontrol bloklariyla yazilmali; ayni migration iki kez calistirildiginda hata vermemelidir.

### 2. Geri Alma (Rollback) Plani

Her migration'in bir rollback senaryosu dusunulmeli, buyuk migrasyonlar icin rollback adimi belgelenmelidir. Supabase CLI'in `db reset` komutu yalnizca development ortaminda kullanilmalidir.

### 3. Veri Kaybina Yol Acan Migrationlar

- Kolon silme, tablo silme veya tip degistirme gibi destructive islemler icin ayri bir onay sureci uygulanir.
- Production ortaminda destructive migration oncesinde mutlaka yedek alinir.
- `DROP COLUMN` veya `DROP TABLE` yerine once `deprecated_` prefix ile yeniden adlandirma, daha sonra fiziksel silme tercih edilir.

### 4. Buyuk Tablolarda Degisiklik

- Buyuk tablolara kolon ekleme veya index olusturma, tablo uzerinde lock alir. Production'da `CREATE INDEX CONCURRENTLY` kullanilmalidir.
- Cok buyuk tablolarda `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` ifadesi PostgreSQL 11+ surumlerinde lock olmadan calisir (sabit default deger icin); ancak her durumda test edilmesi onerilir.

### 5. Migration Onaylama Sureci

```
Development → Staging → Production
```

- Her migration once `development` ortaminda yazilir ve test edilir.
- `staging` ortaminda gercek benzeri veriyle dogrulanir.
- Production'a gecis oncesinde en az bir diger gelistirici tarafindan gozden gecirilir (PR review).

---

## Versioning ve Takip

Supabase, uygulanan migration'lari `supabase_migrations.schema_migrations` tablosunda otomatik takip eder. Bu tablo:
- Uygulanan migration versiyonunu,
- Uygulama zamanini,
- Checksum bilgisini saklar.

Uygulanan bir migration'in dosyasi asla degistirilmez. Var olan bir degisiklik icin yeni bir migration dosyasi yazilir.

---

## Ortam Bazinda Strateji

| Ortam | Strateji | Notlar |
|---|---|---|
| `development` | `supabase db reset` kullanilabilir | Tam temizleme ve yeniden olusturma |
| `staging` | Yalnizca ileri migration | Geri alma testi burada yapilir |
| `production` | Yalnizca ileri migration | Degisiklik oncesi yedek zorunlu |

---

## Ornek Migration Senaryolari

### Yeni Kolon Ekleme

Urun tablosuna `warranty_years` kolonu eklemek icin:
- Yeni dosya: `20250601000001_add_warranty_years_to_products.sql`
- Icerik: `ALTER TABLE products ADD COLUMN warranty_years SMALLINT NULLABLE`
- Geri alma: `ALTER TABLE products DROP COLUMN warranty_years`

### Yeni Tablo Ekleme

Gelecekteki `customers` modulu icin:
- Asama: Auth modülünden sonra, catalog modülünden once (musteri fiyatlari katalog tablosuna baglanabilir)
- Dosya: `20250701000001_create_customers_table.sql`

### RLS Politika Degisikligi

- Mevcut politika `DROP POLICY` ile kaldirilir, yeni politika eklenir.
- Tum bu adimlar tek bir migration dosyasinda yapilir.
- Dosya: `20250601000002_update_products_rls_manager_draft_access.sql`
