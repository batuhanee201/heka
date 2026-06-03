# Catalog Modülü — Endpoint Referansı

## Endpoint Özet Tablosu

| Method | Path | Açıklama | Kimlik Doğrulama | Rol | Rate Limit |
|---|---|---|---|---|---|
| GET    | /v1/catalogs | Katalog listesi | Evet | viewer+ | — |
| POST   | /v1/catalogs | Yeni katalog oluştur | Evet | manager+ | 30/dk |
| GET    | /v1/catalogs/:id | Katalog detayı | Evet | viewer+ | — |
| PATCH  | /v1/catalogs/:id | Katalog güncelle | Evet | manager+ | 30/dk |
| DELETE | /v1/catalogs/:id | Katalog sil (soft) | Evet | admin | 30/dk |
| GET    | /v1/catalogs/:id/items | Katalog kalemlerini listele | Evet | viewer+ | — |
| POST   | /v1/catalogs/:id/items | Kaleme ürün ekle | Evet | manager+ | 30/dk |
| DELETE | /v1/catalogs/:id/items/:productId | Kataloğdan ürün çıkar | Evet | manager+ | 30/dk |
| PATCH  | /v1/catalogs/:id/items/reorder | Kalem sıralamasını güncelle | Evet | manager+ | 30/dk |
| GET    | /v1/products/:id/pricing | Ürün fiyatlarını listele | Evet | viewer+ | — |
| POST   | /v1/products/:id/pricing | Yeni fiyat tanımla | Evet | manager+ | 30/dk |
| PATCH  | /v1/pricing/:id | Fiyat kaydını güncelle | Evet | manager+ | 30/dk |
| DELETE | /v1/pricing/:id | Fiyat kaydını sil | Evet | admin | 30/dk |

---

## GET /v1/catalogs

### Açıklama
Katalog listesini döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `status` | string | `draft`, `active`, `archived` |
| `q` | string | Katalog adına göre arama |
| `valid_from` | string | Bu tarihten sonra geçerli kataloglar (YYYY-MM-DD) |
| `valid_to` | string | Bu tarihe kadar geçerli kataloglar |
| `sort` | string | `name`, `-name`, `created_at`, `-created_at`, `valid_from`, `-valid_from` |
| `limit` | integer | Sayfa başına kayıt (varsayılan: 20, maks: 100) |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her katalog için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Katalog adı |
| `status` | string | `draft`, `active`, `archived` |
| `valid_from` | string\|null | Geçerlilik başlangıç tarihi (YYYY-MM-DD) |
| `valid_to` | string\|null | Geçerlilik bitiş tarihi |
| `item_count` | integer | Katalogdaki ürün sayısı |
| `created_at` | string | Oluşturma tarihi |
| `updated_at` | string | Son güncelleme |

---

## POST /v1/catalogs

### Açıklama
Yeni katalog oluşturur. Başlangıç durumu `draft`'tır.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Evet | Katalog adı (3-200 karakter) |
| `description` | string | Hayır | Katalog açıklaması |
| `valid_from` | string | Hayır | Geçerlilik başlangıcı (YYYY-MM-DD) |
| `valid_to` | string | Hayır | Geçerlilik sonu (valid_from'dan büyük olmalı) |

### Başarılı Yanıt — 201 Created

Oluşturulan katalog nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 422 | VALIDATION_FAILED | Girdi doğrulama hatası |
| 422 | CATALOG_INVALID_DATE_RANGE | valid_to, valid_from'dan önce veya eşit |

---

## GET /v1/catalogs/:id

### Açıklama
Tek katalog kaydını döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `include` | string | `items` — katalog kalemlerini de döner (büyük kataloglarda performans dikkate alınmalı; pagination ile kullanılması önerilir) |

### Başarılı Yanıt — 200 OK

Katalog nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | CATALOG_NOT_FOUND | Katalog bulunamadı |

---

## PATCH /v1/catalogs/:id

### Açıklama
Katalog bilgilerini günceller. `status` değişimi özel iş kurallarına tabidir.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Hayır | Yeni katalog adı |
| `description` | string | Hayır | Açıklama |
| `status` | string | Hayır | `draft`, `active`, `archived` |
| `valid_from` | string | Hayır | Geçerlilik başlangıcı |
| `valid_to` | string | Hayır | Geçerlilik sonu |

### Başarılı Yanıt — 200 OK

Güncellenmiş katalog nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | CATALOG_NOT_FOUND | Bulunamadı |
| 409 | CATALOG_ARCHIVED_IMMUTABLE | Arşivlenmiş katalog güncellenemez |
| 422 | CATALOG_PUBLISH_EMPTY | Boş katalog `active` yapılamaz (en az 1 kalem gerekli) |
| 422 | CATALOG_INVALID_DATE_RANGE | Tarih aralığı geçersiz |

### İş Kuralları

- `draft` → `active` geçişi: katalogda en az 1 aktif ürün bulunmalıdır.
- `active` → `archived` geçişi: geri alınamaz; arşivlenmiş katalog değiştirilemez.
- `archived` → herhangi bir durum: izin verilmez.
- Status değişimi audit_logs'a yazılır.

---

## DELETE /v1/catalogs/:id

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | CATALOG_NOT_FOUND | Bulunamadı |
| 409 | CATALOG_ACTIVE_NO_DELETE | Aktif katalog silinemez; önce arşivleyin |

---

## GET /v1/catalogs/:id/items

### Açıklama
Kataloğun ürün kalemlerini sıralı olarak listeler.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `include` | string | `product` — ürün detaylarını dahil et; `pricing` — fiyat bilgilerini dahil et |
| `limit` | integer | Sayfa başına kayıt (varsayılan: 50, maks: 100) |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her kalem için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Kalem UUID |
| `catalog_id` | string | Katalog UUID |
| `product_id` | string | Ürün UUID |
| `sort_order` | integer | Katalog içi sıra numarası |
| `product` | object\|null | `include=product` istenirse |
| `pricing` | array\|null | `include=pricing` istenirse (geçerli fiyatlar) |

---

## POST /v1/catalogs/:id/items

### Açıklama
Kataloğa ürün ekler.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `product_id` | string | Evet | Eklenecek ürün UUID |
| `sort_order` | integer | Hayır | Sıra numarası; belirtilmezse sona eklenir |

### Başarılı Yanıt — 201 Created

Oluşturulan kalem nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | CATALOG_NOT_FOUND | Katalog bulunamadı |
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 409 | CATALOG_ITEM_DUPLICATE | Bu ürün katalogda zaten var |
| 409 | CATALOG_ARCHIVED_IMMUTABLE | Arşivlenmiş kataloğa ürün eklenemez |
| 422 | CATALOG_PRODUCT_INACTIVE | Aktif olmayan ürün eklenemez |

### İş Kuralları

- Arşivlenmiş ve active kataloglara ürün eklemek için farklı yetkiler gerekebilir; active katalog içerik değişikliği loglanır.
- Aynı ürün bir kataloğa yalnızca bir kez eklenebilir.

---

## DELETE /v1/catalogs/:id/items/:productId

### Açıklama
Katalogdan ürünü çıkarır.

### Path Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `id` | string | Katalog UUID |
| `productId` | string | Çıkarılacak ürün UUID |

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | CATALOG_ITEM_NOT_FOUND | Ürün bu katalogda yok |
| 409 | CATALOG_ARCHIVED_IMMUTABLE | Arşivlenmiş katalogdan çıkarılamaz |

---

## PATCH /v1/catalogs/:id/items/reorder

### Açıklama
Katalog kalemlerinin sırasını toplu günceller.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `items` | array | Evet | Sıra güncellenecek kalemler dizisi |
| `items[].product_id` | string | Evet | Ürün UUID |
| `items[].sort_order` | integer | Evet | Yeni sıra numarası (0'dan başlar) |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.updated_count` | integer | Güncellenen kalem sayısı |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | CATALOG_REORDER_INCOMPLETE | İstekteki ürün ID'leri katalog kalemleriyle eşleşmiyor |
| 404 | CATALOG_NOT_FOUND | Katalog bulunamadı |
| 409 | CATALOG_ARCHIVED_IMMUTABLE | Arşivlenmiş katalog güncellenemez |

### İş Kuralları

- Tüm katalog kalemleri tek işlemde güncellenir (transaction).
- `items` dizisinde kataloğun tüm kalemlerinin yer alması zorunlu değildir; yalnızca gönderilen kalemler güncellenir.

---

## GET /v1/products/:id/pricing

### Açıklama
Ürüne ait tüm fiyat tanımlarını listeler.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `catalog_id` | string | Belirli katalogdaki fiyatları filtrele |
| `currency` | string | Para birimi filtresi (TRY, USD, EUR) |
| `active_only` | boolean | `true` ise yalnızca güncel geçerli fiyatlar (valid_from <= today <= valid_to) |
| `sort` | string | `valid_from`, `-valid_from`, `price`, `-price` |
| `limit` | integer | Varsayılan: 20, maks: 100 |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her fiyat için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `product_id` | string | Ürün UUID |
| `catalog_id` | string\|null | İlişkili katalog (null ise genel fiyat) |
| `price` | number | Fiyat değeri |
| `currency` | string | Para birimi (TRY, USD, EUR) |
| `valid_from` | string\|null | Geçerlilik başlangıcı |
| `valid_to` | string\|null | Geçerlilik sonu |
| `created_at` | string | Oluşturma tarihi |

---

## POST /v1/products/:id/pricing

### Açıklama
Ürün için yeni fiyat tanımlar.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `price` | number | Evet | Pozitif ondalık sayı |
| `currency` | string | Evet | ISO 4217 para birimi kodu (TRY, USD, EUR) |
| `catalog_id` | string | Hayır | Katalog bazlı fiyat için UUID; genel fiyat için boş |
| `valid_from` | string | Hayır | Geçerlilik başlangıcı (YYYY-MM-DD) |
| `valid_to` | string | Hayır | Geçerlilik sonu |

### Başarılı Yanıt — 201 Created

Oluşturulan fiyat nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRODUCT_NOT_FOUND | Ürün bulunamadı |
| 404 | CATALOG_NOT_FOUND | catalog_id geçersiz |
| 422 | CATALOG_INVALID_DATE_RANGE | valid_to, valid_from'dan önce |
| 422 | PRICING_DUPLICATE_ACTIVE | Aynı ürün+katalog+para birimi için çakışan tarihli aktif fiyat var |

### İş Kuralları

- Aynı ürün, katalog ve para birimi kombinasyonu için çakışan tarih aralıklı fiyat oluşturulamaz.
- Fiyat oluşturma audit_logs'a yazılır.

---

## PATCH /v1/pricing/:id

### Açıklama
Mevcut fiyat kaydını günceller.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `price` | number | Hayır | Yeni fiyat |
| `valid_from` | string | Hayır | Yeni başlangıç tarihi |
| `valid_to` | string | Hayır | Yeni bitiş tarihi |

### Başarılı Yanıt — 200 OK

Güncellenmiş fiyat nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRICING_NOT_FOUND | Fiyat kaydı bulunamadı |
| 422 | PRICING_DUPLICATE_ACTIVE | Güncelleme çakışan fiyat yaratıyor |

---

## DELETE /v1/pricing/:id

### Açıklama
Fiyat kaydını siler.

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | PRICING_NOT_FOUND | Fiyat kaydı bulunamadı |

### İş Kuralları

- Fiyat kaydı silinirken audit_logs'a önceki değer yazılır.
- Geçmişe ait fiyat kayıtları silinebilir; ancak aktif kataloglarda gösterilmeye devam edebilir (katalog yayımlandığında snapshot alınması önerilir — ilerleyen faz).
