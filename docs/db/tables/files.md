# Files Modulu — Dosya Yonetimi Tablolari

## Modül Genel Bakis

Files modulu; Supabase Storage'a yuklenen dosyalarin metadata kayitlarini ve bu dosyalarin sisteme ait herhangi bir kayda baglanmasini saglar. Polimorfik `file_relations` tasarimi sayesinde dosyalar; urunlere, kataloglara, markalara veya ileride eklenecek herhangi bir varlığa tek bir mekanizma ile iliskilendirilebilir.

---

## Tablo: `files`

### Amac

Yuklenen her dosyanin metadata bilgisini tutar. Dosyanin gercek icerigini degil, Supabase Storage'daki konumunu ve erisim bilgilerini saklar. Bu ayri tablo sayesinde:
- Ayni dosya birden fazla kayda baglanabilir (kopya yaratmadan).
- Dosya erisim kontrolu tek noktada yonetilir.
- Dosya temizligi (orphan cleanup) kolaylasir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `bucket_name` | `TEXT` | `NOT NULL` | Supabase Storage bucket adi (ornegin: `product-images`, `catalogs`) |
| `storage_path` | `TEXT` | `NOT NULL UNIQUE` | Bucket icindeki tam yol (ornegin: `products/erd-266/main.webp`) |
| `original_filename` | `TEXT` | `NOT NULL` | Kullanicinin yuklediginde dosyanin orijinal adi |
| `mime_type` | `TEXT` | `NOT NULL` | Dosya MIME tipi (ornegin: `image/webp`, `application/pdf`) |
| `size_bytes` | `BIGINT` | `NOT NULL CHECK (size_bytes > 0)` | Dosya boyutu (byte) |
| `width_px` | `INTEGER` | `NULLABLE` | Goruntu genisligi (yalnizca gorsel dosyalar icin) |
| `height_px` | `INTEGER` | `NULLABLE` | Goruntu yuksekligi (yalnizca gorsel dosyalar icin) |
| `alt_text` | `TEXT` | `NULLABLE` | Erisilebilirlik icin gorsel aciklama metni |
| `metadata` | `JSONB` | `NULLABLE` | Ekstra meta (renk paleti, thumbnail yolu, vb.) |
| `uploaded_by` | `UUID` | `NOT NULL FK → users.id ON DELETE RESTRICT` | Dosyayi yukleyen kullanici |
| `is_public` | `BOOLEAN` | `NOT NULL DEFAULT false` | Dosya genel erisime acik mi? |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete (Storage'dan hemen silinmez; retention politikasina gore kaldirilir) |

### Bucket Yapisi

| Bucket Adi | Amac | Erisim |
|---|---|---|
| `product-images` | Urun gorselleri | `authenticated` okuyabilir |
| `product-documents` | Teknik dokumanlar, veri sayfalari | `authenticated` okuyabilir |
| `catalogs` | PDF kataloglar | `authenticated` okuyabilir |
| `brand-assets` | Marka logosu, basim dosyalari | `authenticated` okuyabilir |
| `private-uploads` | Ic kullanim, gizli belgeler | `admin`, `manager` erisir |

### Iliskiler

- `files.uploaded_by` → `users.id`
- `files.id` → `file_relations.file_id` (bire-cok)

### RLS Politikalari

- `is_public = true` olan dosyalari herk es okuyabilir (CDN uzerinden).
- `is_public = false` olan dosyalari yalnizca `authenticated` ve ilgili role sahip kullanicilar okuyabilir.
- Dosyayi yukleyen kullanici (`uploaded_by`) kendi dosyasini guncelleyebilir ve soft-delete uygulayabilir.
- `admin` tum dosya kayitlarini yonetebilir.
- Hicbir kullanici baskasinin `private-uploads` bucket'indaki dosyasina erisemez.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_files_storage_path` | B-tree UNIQUE | Storage yolu ile hizli erisim |
| `idx_files_uploaded_by` | B-tree | Kullanic inin yukledigilerini listeme |
| `idx_files_bucket_name` | B-tree | Bucket bazli sorgular |
| `idx_files_mime_type` | B-tree | Tip bazli filtreleme (ornegin sadece PDF'ler) |
| `idx_files_deleted_at` | B-tree (partial: `deleted_at IS NULL`) | Aktif dosyalar |

### Ornek Veri

| Alan | Deger |
|---|---|
| `bucket_name` | `product-images` |
| `storage_path` | `products/erd-266/main.webp` |
| `original_filename` | `ERD-266-ampul.webp` |
| `mime_type` | `image/webp` |
| `size_bytes` | `124800` |
| `width_px` | `800` |
| `height_px` | `800` |
| `alt_text` | `Heka ERD-266 G4 2W LED Ampul` |
| `is_public` | `true` |

---

## Tablo: `file_relations`

### Amac

Bir dosyayi sisteme ait herhangi bir kayda (urun, katalog, marka, vb.) polimorfik olarak baglar. `entity_type` kolonu hedef tablonun adi, `entity_id` ise o tablodaki kayidin ID'sini tutar. `relation_type` kolonu ise dosyanin iliskili kayittaki rolunu aciklar (ana gorsel, galeri, PDF dokuman, vb.).

### Tasarim Karari: Polimorfik Iliski

Her varlık tipi icin ayri bir `{entity}_files` baglanti tablosu olusturmak yerine tek bir `file_relations` tablosu kullanilmistir. Bu yaklasim:
- Yeni modul eklendiginde migrations gereksinimini azaltir.
- Dosya sorgu mantigi tek yerde toplanir.
- Dezavantaji: Foreign key kisitlamasi veritabani seviyesinde uygulanamaz; bu kurallara uygulama katmaninda veya trigger ile uyulmasi gerekir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `file_id` | `UUID` | `NOT NULL FK → files.id ON DELETE CASCADE` | Bagli dosya |
| `entity_type` | `TEXT` | `NOT NULL CHECK (entity_type IN ('product','catalog','brand','category'))` | Hedef varlık tipi |
| `entity_id` | `UUID` | `NOT NULL` | Hedef varlığin ID'si |
| `relation_type` | `TEXT` | `NOT NULL DEFAULT 'general' CHECK (relation_type IN ('main_image','gallery','thumbnail','document','certificate','brochure','general'))` | Iliskinin anlami / rolu |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Galeriler gibi sirali gosterimlerde siralama |
| `created_by` | `UUID` | `NULLABLE FK → users.id` | Iliski kuran kullanici |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

`UNIQUE (file_id, entity_type, entity_id, relation_type)` — Ayni dosya ayni kayda ayni rolle iki kez eklenemez.

### Ana Gorsel Kurali

Bir urunun yalnizca bir `main_image` olmali. Bu kural uygulama katmaninda veya veritabani constraint'i ile zorunlu kilinir:
- Partial unique index: `UNIQUE (entity_type, entity_id, relation_type) WHERE relation_type = 'main_image'`

### Iliskiler

- `file_relations.file_id` → `files.id`
- `file_relations.entity_id` → (polimorfik; `entity_type`'a gore `products.id`, `catalogs.id`, vb.)

### RLS Politikalari

- `authenticated` iliskilendirilmis varliklara erisebiliyorsa dosya iliskisini de okuyabilir.
- `manager`, `admin` ekleyebilir, silebilir.
- Soft delete dosya kapsaminda yonetilir; `file_relations` kayitlari fiziksel olarak silinebilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_file_relations_file_id` | B-tree | Dosyanin bagli oldugu varliklari sorgulama |
| `idx_file_relations_entity` | B-tree (entity_type, entity_id) | Belirli bir varlığa ait dosyalari cekme (en sik kullanilan sorgu) |
| `idx_file_relations_entity_relation` | B-tree (entity_type, entity_id, relation_type) | Tiplerine gore dosyalari filtreleme (ornegin sadece gallery) |

### Ornek Veri

| Alan | Deger |
|---|---|
| `file_id` | (ERD-266 main gorsel dosya ID) |
| `entity_type` | `product` |
| `entity_id` | (ERD-266 urun ID) |
| `relation_type` | `main_image` |
| `sort_order` | `0` |

| Alan | Deger |
|---|---|
| `file_id` | (Heka 2025 LED PDF dosya ID) |
| `entity_type` | `catalog` |
| `entity_id` | (Heka 2025 LED katalog ID) |
| `relation_type` | `brochure` |
| `sort_order` | `0` |
