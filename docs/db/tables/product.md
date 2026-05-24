# Product Modulu — Urun Yonetimi Tablolari

## Modül Genel Bakis

Product modulu; marka, kategori, ana urun kaydini, teknik ozellikleri ve gorsel/lojistik bilgileri barindiran tabloları kapsар. `product_technical_details` ile `product_display` tablolarinin `products` tablosundan kasitli olarak ayrilmasi, sorgu esnekligi ve veri bagimsizligi saglar: teknik veri ile ambalaj/lojistik verisi farkli kullanicilara, farkli sikliklarda ve farkli izinlerle gosterilebilir.

---

## Tablo: `brands`

### Amac

Urun markalarini tanimlar. Bir marka birden fazla urune sahip olabilir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL UNIQUE` | Marka adi (ornegin: Philips, Osram, Heka) |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | URL dostu benzersiz tanim (ornegin: heka) |
| `description` | `TEXT` | `NULLABLE` | Marka aciklamasi |
| `website_url` | `TEXT` | `NULLABLE` | Marka web sitesi |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Aktif mi? |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete |

### Iliskiler

- `brands.id` → `products.brand_id` (bire-cok)

### RLS Politikalari

- `authenticated` okuyabilir.
- `manager`, `admin` olusturabilir, guncelleyebilir.
- `admin` soft-delete uygulayabilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_brands_slug` | B-tree UNIQUE (partial: `deleted_at IS NULL`) | Slug ile hizli arama |
| `idx_brands_is_active` | B-tree (partial: `is_active = true`) | Aktif marka listesi |

### Ornek Veri

| Alan | Deger |
|---|---|
| `name` | `Heka` |
| `slug` | `heka` |
| `is_active` | `true` |

---

## Tablo: `categories`

### Amac

Urun kategorilerini hiyerarsik yapida tutar. Oz-referansli `parent_id` ile alt-ust kategori iliskisi kurulur (ornegin: Elektrik → Aydinlatma → LED Ampul).

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `parent_id` | `UUID` | `NULLABLE FK → categories.id ON DELETE RESTRICT` | Ust kategori (NULL ise kok kategori) |
| `name` | `TEXT` | `NOT NULL` | Kategori adi |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | URL dostu benzersiz tanim |
| `description` | `TEXT` | `NULLABLE` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Ayni seviyedeki kategoriler arasi siralama |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | |

### Iliskiler

- `categories.parent_id` → `categories.id` (oz-referans)
- `categories.id` → `products.category_id` (bire-cok)

### RLS Politikalari

- `authenticated` okuyabilir.
- `manager`, `admin` olusturabilir, guncelleyebilir.
- Ust kategorisi olan bir kategori silinemez (`ON DELETE RESTRICT`).

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_categories_parent_id` | B-tree | Alt kategori sorgulari |
| `idx_categories_slug` | B-tree UNIQUE (partial: `deleted_at IS NULL`) | Slug ile arama |

### Ornek Veri

| `name` | `parent_id` | `slug` |
|---|---|---|
| Elektrik | NULL | `elektrik` |
| Aydinlatma | (Elektrik ID) | `aydinlatma` |
| LED Ampul | (Aydinlatma ID) | `led-ampul` |

---

## Tablo: `products`

### Amac

Her fiziksel ürünü temsil eden ana kayittir. Urun kodu, bagli marka, kategori, uretim durumu ve genel meta bilgileri burada tutulur. Teknik ozellikler ve gorsel/lojistik verisi ayri tablolarda saklanir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `code` | `TEXT` | `NOT NULL UNIQUE` | Urun kodu (ornegin: ERD-266) |
| `name` | `TEXT` | `NOT NULL` | Urun adi / tam aciklama |
| `product_type` | `TEXT` | `NULLABLE` | Urun tipi (ornegin: 2835/10D) |
| `brand_id` | `UUID` | `NOT NULL FK → brands.id ON DELETE RESTRICT` | Bagli marka |
| `category_id` | `UUID` | `NOT NULL FK → categories.id ON DELETE RESTRICT` | Bagli kategori |
| `status` | `TEXT` | `NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','discontinued','archived'))` | Urun durumu |
| `description` | `TEXT` | `NULLABLE` | Uzun aciklama |
| `short_description` | `TEXT` | `NULLABLE` | Kisa tanitim metni |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | URL dostu kimlik |
| `created_by` | `UUID` | `NOT NULL FK → users.id` | Kaydi olusturan kullanici |
| `updated_by` | `UUID` | `NULLABLE FK → users.id` | Son guncelleyen kullanici |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete |

### Iliskiler

- `products.brand_id` → `brands.id`
- `products.category_id` → `categories.id`
- `products.id` → `product_technical_details.product_id` (bire-bir)
- `products.id` → `product_display.product_id` (bire-bir)
- `products.id` → `catalog_items.product_id` (bire-cok)
- `products.id` → `pricing.product_id` (bire-cok)
- `products.id` → `file_relations.entity_id` (polimorfik, bire-cok)

### RLS Politikalari

- `authenticated` (`deleted_at IS NULL` ve `status != 'draft'`) kayitlari okuyabilir.
- `manager`, `admin` tum kayitlari okuyabilir; olusturabilir ve guncelleyebilir.
- `admin` soft-delete uygulayabilir.
- `viewer` yalnizca aktif urunleri okuyabilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_products_code` | B-tree UNIQUE (partial: `deleted_at IS NULL`) | Urun kodu ile hizli erisim |
| `idx_products_brand_id` | B-tree | Markaya gore filtreleme |
| `idx_products_category_id` | B-tree | Kategoriye gore filtreleme |
| `idx_products_status` | B-tree (partial: `deleted_at IS NULL`) | Durum bazli listeleme |
| `idx_products_slug` | B-tree UNIQUE (partial: `deleted_at IS NULL`) | Slug ile arama |

### Ornek Veri

| Alan | Deger |
|---|---|
| `code` | `ERD-266` |
| `name` | `G4 2W 3000K LED Ampul` |
| `product_type` | `2835/10D` |
| `status` | `active` |
| `slug` | `erd-266-g4-2w-3000k-led-ampul` |

---

## Tablo: `product_technical_details`

### Amac

Urune ait teknik ve performans ozelliklerini tutar. `products` tablosuyla bire-bir iliskisi vardir. Bu ayri tablo sayesinde teknik veriye yonelik ozel sorgular, izinler ve guncelleme akislari bagimsiz olarak yonetilebilir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID` | `NOT NULL UNIQUE FK → products.id ON DELETE CASCADE` | Bagli urun (bire-bir zorlar) |
| `socket_type` | `TEXT` | `NULLABLE` | Duy tipi (ornegin: G4, E27, GU10) |
| `voltage_range` | `TEXT` | `NULLABLE` | Voltaj araligi (ornegin: 220-240V AC) |
| `power_w` | `NUMERIC(6,2)` | `NULLABLE CHECK (power_w > 0)` | Guc tuketimi (Watt) |
| `light_output_lm` | `NUMERIC(8,2)` | `NULLABLE CHECK (light_output_lm >= 0)` | Isik akisi (Lumen) |
| `color_temp_k` | `INTEGER` | `NULLABLE CHECK (color_temp_k BETWEEN 1000 AND 10000)` | Renk sicakligi (Kelvin) |
| `color_rendering_index` | `NUMERIC(4,1)` | `NULLABLE` | CRI degeri |
| `beam_angle_deg` | `NUMERIC(5,2)` | `NULLABLE` | Isik acisi (derece) |
| `dimmable` | `BOOLEAN` | `NOT NULL DEFAULT false` | Dim destegi var mi? |
| `energy_efficiency_class` | `TEXT` | `NULLABLE CHECK (energy_efficiency_class IN ('A','B','C','D','E','F','G'))` | Enerji verimlilik sinifi |
| `lifetime_hours` | `INTEGER` | `NULLABLE CHECK (lifetime_hours > 0)` | Beklenen omur (saat) |
| `ip_rating` | `TEXT` | `NULLABLE` | IP koruma sinifi (ornegin: IP44) |
| `operating_temp_min_c` | `NUMERIC(5,1)` | `NULLABLE` | Min calisma sicakligi (°C) |
| `operating_temp_max_c` | `NUMERIC(5,1)` | `NULLABLE` | Max calisma sicakligi (°C) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Iliskiler

- `product_technical_details.product_id` → `products.id` (bire-bir, CASCADE sil)

### RLS Politikalari

- `authenticated` aktif urunlerin teknik detaylarini okuyabilir.
- `manager`, `admin` olusturabilir ve guncelleyebilir.
- `viewer` yalnizca okuyabilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_ptd_product_id` | B-tree UNIQUE | Urun ID'si ile hizli erisim (FK + bire-bir) |
| `idx_ptd_energy_class` | B-tree | Enerji sinifina gore filtreleme |
| `idx_ptd_dimmable` | B-tree (partial: `dimmable = true`) | Dim destekli urunler |
| `idx_ptd_socket_type` | B-tree | Duy tipine gore filtreleme |

### Ornek Veri (ERD-266)

| Alan | Deger |
|---|---|
| `socket_type` | `G4` |
| `voltage_range` | `220-240V AC` |
| `power_w` | `2.00` |
| `light_output_lm` | `150.00` |
| `color_temp_k` | `3000` |
| `dimmable` | `true` |
| `energy_efficiency_class` | `G` |
| `lifetime_hours` | `15000` |

---

## Tablo: `product_display`

### Amac

Urune ait ambalaj, lojistik, barkod, QR kod ve sertifika bilgilerini tutar. `products` tablosuyla bire-bir iliskisi vardir. B2B bağlamında bu veriler katalog, etiket ve ihracat dokumani uretiminde kullanilir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `product_id` | `UUID` | `NOT NULL UNIQUE FK → products.id ON DELETE CASCADE` | Bagli urun (bire-bir zorlar) |
| `package_qty` | `INTEGER` | `NULLABLE CHECK (package_qty > 0)` | Koli/paket icindeki adet (ornegin: 100 Pcs) |
| `box_size_mm` | `TEXT` | `NULLABLE` | Kutu boyutu (ornegin: 8x16.5x9.5mm) |
| `box_weight_gr` | `NUMERIC(10,2)` | `NULLABLE CHECK (box_weight_gr > 0)` | Kutu agirligi (gram) |
| `barcode` | `TEXT` | `UNIQUE NULLABLE` | EAN/UPC barkod numarasi |
| `qr_code_data` | `TEXT` | `NULLABLE` | QR kod icerigi veya URL |
| `certificates` | `JSONB` | `NULLABLE` | Sertifika bilgileri (bkz. not) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### `certificates` JSONB Yapisi

`certificates` alani asagidaki yapida JSON veri saklar:

```
{
  "emc": true,
  "erp": true,
  "tse": false,
  "ce": true,
  "rohs": true,
  "lvd": true
}
```

Mevcut sertifika tipleri: `emc`, `erp`, `tse`, `ce`, `rohs`, `lvd`. Gelecekteki ek sertifikalar bu yapiya eklenerek genisletilebilir.

### Iliskiler

- `product_display.product_id` → `products.id` (bire-bir, CASCADE sil)

### RLS Politikalari

- `authenticated` aktif urunlerin gorsel/lojistik bilgilerini okuyabilir.
- `manager`, `admin` olusturabilir ve guncelleyebilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_pd_product_id` | B-tree UNIQUE | FK + bire-bir zorunlulugu |
| `idx_pd_barcode` | B-tree UNIQUE | Barkod tarama ile urun arama |
| `idx_pd_certificates` | GIN | Sertifika tipine gore filtreleme (JSONB) |

### Ornek Veri (ERD-266)

| Alan | Deger |
|---|---|
| `package_qty` | `100` |
| `box_size_mm` | `8x16.5x9.5mm` |
| `box_weight_gr` | `370.00` |
| `barcode` | `8691234567890` |
| `certificates` | `{"emc": true, "erp": true, "ce": true, "rohs": true, "lvd": true, "tse": false}` |
