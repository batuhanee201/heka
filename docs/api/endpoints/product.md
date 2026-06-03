# Product Modülü — Endpoint Referansı

## Endpoint Özet Tablosu

| Method | Path | Açıklama | Kimlik Doğrulama | Rol | Rate Limit |
|---|---|---|---|---|---|
| GET    | /v1/brands | Marka listesi | Evet | viewer+ | — |
| POST   | /v1/brands | Yeni marka oluştur | Evet | manager+ | 30/dk |
| GET    | /v1/brands/:id | Marka detayı | Evet | viewer+ | — |
| PATCH  | /v1/brands/:id | Marka güncelle | Evet | manager+ | 30/dk |
| DELETE | /v1/brands/:id | Marka sil (soft) | Evet | admin | 30/dk |
| GET    | /v1/categories | Kategori listesi (tree destekli) | Evet | viewer+ | — |
| POST   | /v1/categories | Yeni kategori oluştur | Evet | manager+ | 30/dk |
| GET    | /v1/categories/:id | Kategori detayı | Evet | viewer+ | — |
| PATCH  | /v1/categories/:id | Kategori güncelle | Evet | manager+ | 30/dk |
| DELETE | /v1/categories/:id | Kategori sil (soft) | Evet | admin | 30/dk |
| GET    | /v1/products | Ürün listesi (filtreli) | Evet | viewer+ | — |
| POST   | /v1/products | Yeni ürün oluştur | Evet | manager+ | 30/dk |
| GET    | /v1/products/:id | Ürün detayı | Evet | viewer+ | — |
| PATCH  | /v1/products/:id | Ürün güncelle | Evet | manager+ | 30/dk |
| DELETE | /v1/products/:id | Ürün sil (soft) | Evet | admin | 30/dk |
| GET    | /v1/products/:id/technical-details | Teknik detay getir | Evet | viewer+ | — |
| PUT    | /v1/products/:id/technical-details | Teknik detay kaydet (upsert) | Evet | manager+ | 30/dk |
| GET    | /v1/products/:id/display | Display/lojistik bilgisi getir | Evet | viewer+ | — |
| PUT    | /v1/products/:id/display | Display bilgisi kaydet (upsert) | Evet | manager+ | 30/dk |

---

## GET /v1/brands

### Açıklama
Sistemdeki marka listesini döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `q` | string | Marka adına göre metin arama |
| `sort` | string | Sıralama alanı (`name`, `-name`, `created_at`, `-created_at`) |
| `limit` | integer | Sayfa başına kayıt (varsayılan: 20, maks: 100) |
| `after` | string | Cursor tabanlı sayfalama |

### Başarılı Yanıt — 200 OK

`data` dizisi her marka için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Marka adı |
| `slug` | string | URL-safe tekil tanımlayıcı |
| `created_at` | string | Oluşturma tarihi |
| `updated_at` | string | Son güncelleme tarihi |

---

## POST /v1/brands

### Açıklama
Yeni marka oluşturur.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Evet | Marka adı (2-100 karakter) |
| `slug` | string | Hayır | Belirtilmezse `name`'den otomatik üretilir |

### Başarılı Yanıt — 201 Created

Oluşturulan marka nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 409 | PRODUCT_BRAND_SLUG_EXISTS | Bu slug başka markada kullanımda |
| 422 | VALIDATION_FAILED | Girdi doğrulama hatası |

---

## GET /v1/brands/:id

### Açıklama
Tek marka kaydını döner.

### Başarılı Yanıt — 200 OK

Marka nesnesi (POST yanıtıyla aynı format).

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_BRAND_NOT_FOUND | Marka bulunamadı |

---

## PATCH /v1/brands/:id

### Açıklama
Marka bilgilerini kısmen günceller.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Hayır | Yeni marka adı |
| `slug` | string | Hayır | Yeni slug (mevcut ürünlerin URL'lerini etkileyebilir) |

### Başarılı Yanıt — 200 OK

Güncellenmiş marka nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_BRAND_NOT_FOUND | Marka bulunamadı |
| 409 | PRODUCT_BRAND_SLUG_EXISTS | Slug çakışması |
| 422 | VALIDATION_FAILED | Geçersiz girdi |

---

## DELETE /v1/brands/:id

### Açıklama
Markayı soft-delete ile siler.

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_BRAND_NOT_FOUND | Marka bulunamadı |
| 409 | PRODUCT_BRAND_HAS_PRODUCTS | Bu markaya bağlı aktif ürün var; silme engellendi |

### İş Kuralları

- Aktif ürünleri olan marka silinemez; önce ürünlerin başka markaya taşınması veya silinmesi gerekir.
- Silme işlemi `deleted_at` doldurularak yapılır; fiziksel silme yapılmaz.

---

## GET /v1/categories

### Açıklama
Kategori listesini döner. `tree=true` parametresi ile hiyerarşik ağaç yapısı döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `tree` | boolean | `true` ise iç içe ağaç yapısı, `false` ise düz liste |
| `parent_id` | string | Belirli ebeveynin alt kategorileri |
| `q` | string | Kategori adına göre arama |
| `sort` | string | Sıralama (`name`, `-name`) |
| `limit` | integer | Düz liste modunda sayfalama (tree modunda uygulanmaz) |
| `after` | string | Cursor (düz liste modu) |

### Başarılı Yanıt — 200 OK (Düz Liste)

`data` dizisi her kategori için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `parent_id` | string\|null | Üst kategori UUID |
| `name` | string | Kategori adı |
| `slug` | string | URL-safe tanımlayıcı |
| `depth` | integer | Ağaçtaki derinlik (root=0) |
| `created_at` | string | Oluşturma tarihi |

### Başarılı Yanıt — 200 OK (Tree Modu `?tree=true`)

`data` dizisi root kategorileri; her kategori `children` dizisi içerir:

```
{
  "data": [
    {
      "id": "...",
      "name": "Ampuller",
      "slug": "ampuller",
      "children": [
        { "id": "...", "name": "LED Ampuller", "slug": "led-ampuller", "children": [] }
      ]
    }
  ]
}
```

---

## POST /v1/categories

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Evet | Kategori adı |
| `parent_id` | string | Hayır | Üst kategori UUID; belirtilmezse root kategori |
| `slug` | string | Hayır | Otomatik üretilir |

### Başarılı Yanıt — 201 Created

Oluşturulan kategori nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_CATEGORY_PARENT_NOT_FOUND | parent_id geçersiz |
| 409 | PRODUCT_CATEGORY_SLUG_EXISTS | Slug çakışması |
| 422 | VALIDATION_CATEGORY_DEPTH | Maksimum kategori derinliği (5 seviye) aşıldı |

---

## PATCH /v1/categories/:id

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Hayır | Yeni kategori adı |
| `parent_id` | string\|null | Hayır | Kategorinin taşınacağı yeni ebeveyn |
| `slug` | string | Hayır | Yeni slug |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_CATEGORY_NOT_FOUND | Kategori bulunamadı |
| 409 | PRODUCT_CATEGORY_CIRCULAR | parent_id döngüsel bağımlılık oluşturuyor |
| 422 | VALIDATION_CATEGORY_DEPTH | Yeni konumda derinlik aşıldı |

### İş Kuralları

- Kategori taşınırken (parent_id değişimi) alt kategoriler de taşınır; derinlik yeniden hesaplanır.
- Bir kategori kendi alt kategorisi yapılamaz (döngüsel referans kontrolü).

---

## DELETE /v1/categories/:id

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_CATEGORY_NOT_FOUND | Bulunamadı |
| 409 | PRODUCT_CATEGORY_HAS_CHILDREN | Alt kategorisi olan kategori silinemez |
| 409 | PRODUCT_CATEGORY_HAS_PRODUCTS | Aktif ürünleri olan kategori silinemez |

---

## GET /v1/products

### Açıklama
Ürün listesini filtreli ve sıralı olarak döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `q` | string | Ürün kodu veya adında metin arama |
| `brand_id` | string | Marka filtresi (UUID) |
| `category_id` | string | Kategori filtresi (UUID); alt kategorileri de kapsar |
| `status` | string | `active`, `draft`, `discontinued` |
| `dimmable` | boolean | Dimmer destekli filtresi |
| `socket_type` | string | Duy tipi (örn: E27, GU10) |
| `energy_class` | string | Enerji sınıfı (örn: A, A+, A++) |
| `sort` | string | `name`, `-name`, `created_at`, `-created_at`, `code`, `-code` |
| `limit` | integer | Sayfa başına kayıt (varsayılan: 20, maks: 100) |
| `after` | string | Cursor |
| `include` | string | Dahil edilecek ilişkili veri: `technical_details`, `display`, `brand`, `category` (virgülle ayrılmış) |

### Başarılı Yanıt — 200 OK

`data` dizisi her ürün için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `code` | string | Ürün kodu (tekil) |
| `name` | string | Ürün adı |
| `brand_id` | string | Marka UUID |
| `category_id` | string | Kategori UUID |
| `status` | string | `active`, `draft`, `discontinued` |
| `created_at` | string | Oluşturma tarihi |
| `updated_at` | string | Güncelleme tarihi |
| `brand` | object\|null | `include=brand` istenirse |
| `category` | object\|null | `include=category` istenirse |
| `technical_details` | object\|null | `include=technical_details` istenirse |
| `display` | object\|null | `include=display` istenirse |

---

## POST /v1/products

### Açıklama
Yeni ürün oluşturur. Teknik detay ve display bilgileri aynı istekte gönderilebilir.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `code` | string | Evet | Benzersiz ürün kodu |
| `name` | string | Evet | Ürün adı |
| `brand_id` | string | Evet | Marka UUID |
| `category_id` | string | Evet | Kategori UUID |
| `status` | string | Hayır | Varsayılan: `draft` |
| `description` | string | Hayır | Ürün açıklaması |
| `technical_details` | object | Hayır | Teknik detaylar (aşağıya bakın) |
| `display` | object | Hayır | Display/lojistik bilgileri (aşağıya bakın) |

`technical_details` alanı:

| Alan | Tip | Açıklama |
|---|---|---|
| `socket_type` | string | Duy tipi (E14, E27, GU10, B22 vs.) |
| `voltage` | string | Voltaj (örn: "220-240V") |
| `power_w` | number | Güç (Watt) |
| `light_lm` | number | Işık akısı (Lümen) |
| `color_temp_k` | integer | Renk sıcaklığı (Kelvin) |
| `dimmable` | boolean | Dimmer desteği |
| `energy_class` | string | Enerji sınıfı (A, A+, A++, B, C, D) |
| `lifetime_hours` | integer | Beklenen ömür (saat) |

`display` alanı:

| Alan | Tip | Açıklama |
|---|---|---|
| `package_qty` | integer | Kutu başına adet |
| `box_size` | string | Kutu boyutu (örn: "30x20x10cm") |
| `box_weight_gr` | number | Kutu ağırlığı (gram) |
| `barcode` | string | Barkod numarası |
| `qr_code` | string | QR kod değeri |
| `certificates` | object | JSONB sertifika bilgileri (CE, RoHS vs.) |

### Başarılı Yanıt — 201 Created

Oluşturulan ürün nesnesi (teknik detay ve display dahil).

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_BRAND_NOT_FOUND | brand_id geçersiz |
| 404 | PRODUCT_CATEGORY_NOT_FOUND | category_id geçersiz |
| 409 | PRODUCT_CODE_EXISTS | Ürün kodu başka üründe kullanımda |
| 422 | VALIDATION_FAILED | Girdi doğrulama hatası |

### İş Kuralları

- Ürün oluşturma tek transaction içinde gerçekleşir; teknik detay veya display kaydı başarısız olursa ana ürün kaydı da geri alınır.
- `status=active` ile oluşturmak için marka ve kategori aktif olmalıdır.

---

## GET /v1/products/:id

### Açıklama
Tek ürün kaydını döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `include` | string | `technical_details`, `display`, `brand`, `category`, `files` (virgülle ayrılmış) |

### Başarılı Yanıt — 200 OK

Ürün nesnesi; `include` parametresine göre genişletilmiş.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı veya silinmiş |

---

## PATCH /v1/products/:id

### Request Body

Tüm alanlar opsiyonel; yalnızca gönderilen alanlar güncellenir.

| Alan | Tip | Açıklama |
|---|---|---|
| `name` | string | Ürün adı |
| `brand_id` | string | Yeni marka |
| `category_id` | string | Yeni kategori |
| `status` | string | `active`, `draft`, `discontinued` |
| `description` | string | Açıklama |

### Başarılı Yanıt — 200 OK

Güncellenmiş ürün nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 409 | PRODUCT_CODE_EXISTS | Kod çakışması |
| 422 | VALIDATION_FAILED | Geçersiz girdi |

### İş Kuralları

- `status` değişikliği audit_logs'a yazılır.
- Kataloglarda aktif olan ürün `discontinued` yapılabilir; ancak katalog yayınlarında uyarı oluşturulur.

---

## DELETE /v1/products/:id

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Bulunamadı |

### İş Kuralları

- Soft-delete uygulanır (`deleted_at` doldurulur).
- Ürüne bağlı dosya ilişkileri temizleme görevi başlatılır (event-driven; anlık değil).
- Aktif kataloglardaki `catalog_items` kayıtları silinmez; katalog düzeyinde uyarı üretilir.

---

## GET /v1/products/:id/technical-details

### Açıklama
Ürünün teknik özelliklerini döner.

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | UUID |
| `data.product_id` | string | Ürün UUID |
| `data.socket_type` | string | Duy tipi |
| `data.voltage` | string | Voltaj |
| `data.power_w` | number | Güç (Watt) |
| `data.light_lm` | number | Lümen |
| `data.color_temp_k` | integer | Kelvin |
| `data.dimmable` | boolean | Dimmer desteği |
| `data.energy_class` | string | Enerji sınıfı |
| `data.lifetime_hours` | integer | Ömür (saat) |
| `data.updated_at` | string | Son güncelleme |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 404 | PRODUCT_TECHNICAL_DETAILS_NOT_FOUND | Teknik detay henüz oluşturulmamış |

---

## PUT /v1/products/:id/technical-details

### Açıklama
Teknik detayları kaydeder (upsert: yoksa oluşturur, varsa tamamını değiştirir).

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `socket_type` | string | Evet | E14, E27, GU10, B22, MR16 ... |
| `voltage` | string | Evet | Voltaj aralığı |
| `power_w` | number | Evet | Pozitif sayı (Watt) |
| `light_lm` | number | Evet | Pozitif sayı (Lümen) |
| `color_temp_k` | integer | Evet | 1000-10000 arası Kelvin değeri |
| `dimmable` | boolean | Evet | — |
| `energy_class` | string | Evet | A, A+, A++, B, C, D, E, F, G |
| `lifetime_hours` | integer | Hayır | Pozitif tam sayı |

### Başarılı Yanıt — 200 OK

Güncellenmiş teknik detay nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 422 | VALIDATION_FAILED | Geçersiz değerler |

---

## GET /v1/products/:id/display

### Açıklama
Ürünün ambalaj, barkod ve lojistik bilgilerini döner.

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | UUID |
| `data.product_id` | string | Ürün UUID |
| `data.package_qty` | integer | Kutu başına adet |
| `data.box_size` | string | Kutu boyutu |
| `data.box_weight_gr` | number | Ağırlık (gram) |
| `data.barcode` | string\|null | Barkod |
| `data.qr_code` | string\|null | QR kod |
| `data.certificates` | object | Sertifika bilgileri |
| `data.updated_at` | string | Son güncelleme |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 404 | PRODUCT_DISPLAY_NOT_FOUND | Display bilgisi henüz oluşturulmamış |

---

## PUT /v1/products/:id/display

### Açıklama
Display bilgilerini kaydeder (upsert).

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `package_qty` | integer | Hayır | Pozitif tam sayı |
| `box_size` | string | Hayır | Serbest metin (örn: "30x20x10cm") |
| `box_weight_gr` | number | Hayır | Pozitif sayı (gram) |
| `barcode` | string | Hayır | Tekil barkod numarası |
| `qr_code` | string | Hayır | QR kod değeri |
| `certificates` | object | Hayır | `{"CE": true, "RoHS": true, "ErP": "2021/2019"}` formatı |

### Başarılı Yanıt — 200 OK

Güncellenmiş display nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 409 | PRODUCT_BARCODE_EXISTS | Barkod başka üründe kullanımda |
| 422 | VALIDATION_FAILED | Geçersiz değerler |
