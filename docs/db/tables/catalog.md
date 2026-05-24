# Catalog Modulu — Katalog ve Fiyatlandirma Tablolari

## Modül Genel Bakis

Catalog modulu; urun kataloglarini, katalog iceriklerini ve fiyat tanimlarini yonetir. B2B baglaminda bir katalog, belirli bir musteri segmentine veya donem icinacik sunulan urun listesidir. Fiyatlandirma katmani; para birimi, gecerlilik tarihi ve katalog/urun bazli esneklik saglar.

---

## Tablo: `catalogs`

### Amac

Urun kataloglarini tanimlar. Her katalog bir ad, durum bilgisi ve gecerlilik araligi tasir. Bir katalog aktif oldugunda bagli tum urunler ve fiyatlar gecerli kabul edilir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL` | Katalog adi (ornegin: 2025 Yil Sonu Katalogu) |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | URL dostu benzersiz tanim |
| `description` | `TEXT` | `NULLABLE` | Katalog aciklamasi |
| `status` | `TEXT` | `NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived'))` | Katalog durumu |
| `valid_from` | `DATE` | `NULLABLE` | Gecerlilik baslangic tarihi |
| `valid_to` | `DATE` | `NULLABLE` | Gecerlilik bitis tarihi |
| `created_by` | `UUID` | `NOT NULL FK → users.id` | Olusturan kullanici |
| `updated_by` | `UUID` | `NULLABLE FK → users.id` | Son guncelleyen |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete |

### CHECK Constraint

`valid_from` ve `valid_to` gecerlilik araliginda `valid_from <= valid_to` kurali uygulanir.

### Iliskiler

- `catalogs.id` → `catalog_items.catalog_id` (bire-cok)
- `catalogs.id` → `pricing.catalog_id` (bire-cok)

### RLS Politikalari

- `authenticated` `status = 'active'` ve `deleted_at IS NULL` olan kataloglari okuyabilir.
- `manager`, `admin` tum durumdaki kataloglari okuyabilir; olusturabilir ve guncelleyebilir.
- `admin` soft-delete uygulayabilir.
- `viewer` yalnizca aktif kataloglari okuyabilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_catalogs_slug` | B-tree UNIQUE (partial: `deleted_at IS NULL`) | Slug ile hizli erisim |
| `idx_catalogs_status` | B-tree (partial: `deleted_at IS NULL`) | Aktif katalog sorgulari |
| `idx_catalogs_valid_dates` | B-tree (valid_from, valid_to) | Belirli tarihte gecerli katalog sorgulari |

### Ornek Veri

| Alan | Deger |
|---|---|
| `name` | `Heka 2025 LED Urun Katalogu` |
| `slug` | `heka-2025-led` |
| `status` | `active` |
| `valid_from` | `2025-01-01` |
| `valid_to` | `2025-12-31` |

---

## Tablo: `catalog_items`

### Amac

Bir katalogtaki urunlerin listesini ve katalog icindeki siralama bilgisini tutar. Bu tablo; katalog ile urun arasindaki coka-cok iliskiyi temsil eder.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `catalog_id` | `UUID` | `NOT NULL FK → catalogs.id ON DELETE CASCADE` | Bagli katalog |
| `product_id` | `UUID` | `NOT NULL FK → products.id ON DELETE RESTRICT` | Kataloga eklenen urun |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Katalog icinde gosterim sirasi |
| `notes` | `TEXT` | `NULLABLE` | Urun icin katalog ozel notu |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

`UNIQUE (catalog_id, product_id)` — Ayni urun bir kataloğa iki kez eklenemez.

### Iliskiler

- `catalog_items.catalog_id` → `catalogs.id`
- `catalog_items.product_id` → `products.id`

### RLS Politikalari

- `authenticated` aktif kataloglarin kalemlerini okuyabilir.
- `manager`, `admin` kalem ekleyebilir, guncelleyebilir, silebilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_catalog_items_catalog_id` | B-tree | Kataloğun tum urunlerini cekme |
| `idx_catalog_items_product_id` | B-tree | Bir urunun hangi kataloglarda oldugunu bulma |
| `idx_catalog_items_sort` | B-tree (catalog_id, sort_order) | Sirali listeleme |

### Ornek Veri

| `catalog_id` | `product_id` | `sort_order` |
|---|---|---|
| (Heka 2025 LED katalog ID) | (ERD-266 urun ID) | `1` |

---

## Tablo: `pricing`

### Amac

Urun veya katalog bazinda fiyat tanimlarini, para birimini ve gecerlilik araligini tutar. Bir urunun ayni anda birden fazla fiyat tanimi olabilir (farkli para birimleri veya farkli kataloglar icin). Aktif fiyati belirlemek icin gecerlilik tarihleri sorgulanir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID` | `NOT NULL FK → products.id ON DELETE CASCADE` | Fiyatlanan urun |
| `catalog_id` | `UUID` | `NULLABLE FK → catalogs.id ON DELETE SET NULL` | Bagli katalog (NULL ise genel liste fiyati) |
| `price` | `NUMERIC(12,4)` | `NOT NULL CHECK (price >= 0)` | Birim fiyat |
| `currency` | `TEXT` | `NOT NULL DEFAULT 'TRY' CHECK (char_length(currency) = 3)` | ISO 4217 para birimi kodu (ornegin: TRY, USD, EUR) |
| `price_type` | `TEXT` | `NOT NULL DEFAULT 'list' CHECK (price_type IN ('list','wholesale','promo'))` | Fiyat turu |
| `valid_from` | `DATE` | `NULLABLE` | Fiyat gecerlilik baslangici |
| `valid_to` | `DATE` | `NULLABLE` | Fiyat gecerlilik bitisi |
| `created_by` | `UUID` | `NOT NULL FK → users.id` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### CHECK Constraint

`valid_from` ve `valid_to` ikisi de dolu ise `valid_from <= valid_to` zorunludur.

### Aktif Fiyat Sorgu Mantigi

Bir urunun bugune ait gecerli fiyatini bulmak icin:
- `product_id` eslesmesi
- `valid_from <= bugun` (veya NULL)
- `valid_to >= bugun` (veya NULL)
- Tercihli siralamayla en guncel kayit secilir.

### Iliskiler

- `pricing.product_id` → `products.id`
- `pricing.catalog_id` → `catalogs.id`

### RLS Politikalari

- `authenticated` aktif fiyatlari okuyabilir.
- `manager`, `admin` olusturabilir, guncelleyebilir.
- `viewer` yalnizca aktif ve gecerli fiyatlari okuyabilir.
- `public` role fiyat verisi gosterilmez (B2B gizliligi).

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_pricing_product_id` | B-tree | Urune ait fiyatlari sorgulama |
| `idx_pricing_catalog_id` | B-tree | Katalog fiyat sorgulari |
| `idx_pricing_currency` | B-tree | Para birimi bazli sorgulama |
| `idx_pricing_valid_dates` | B-tree (valid_from, valid_to) | Gecerli fiyat araligi sorgulari |
| `idx_pricing_product_currency_type` | B-tree (product_id, currency, price_type) | Aktif fiyat sorgusunda composite index |

### Ornek Veri

| Alan | Deger |
|---|---|
| `product_id` | (ERD-266 ID) |
| `catalog_id` | (Heka 2025 LED katalog ID) |
| `price` | `45.5000` |
| `currency` | `TRY` |
| `price_type` | `wholesale` |
| `valid_from` | `2025-01-01` |
| `valid_to` | `2025-12-31` |
