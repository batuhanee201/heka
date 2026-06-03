# Files Modülü — Endpoint Referansı

## Endpoint Özet Tablosu

| Method | Path | Açıklama | Kimlik Doğrulama | Rol | Rate Limit |
|---|---|---|---|---|---|
| POST   | /v1/files/upload | Dosya yükle | Evet | manager+ | 20 istek/dk |
| GET    | /v1/files/:id | Dosya meta verisi getir | Evet | viewer+ | — |
| DELETE | /v1/files/:id | Dosyayı sil (soft) | Evet | admin | 30/dk |
| POST   | /v1/files/:id/relations | Dosyayı bir kayda ilişkilendir | Evet | manager+ | 30/dk |
| GET    | /v1/:entityType/:entityId/files | Bir kaydın dosyalarını listele | Evet | viewer+ | — |
| DELETE | /v1/file-relations/:id | Dosya ilişkisini kaldır | Evet | manager+ | 30/dk |

---

## Desteklenen Dosya Tipleri ve Boyut Sınırları

| Bucket | İzin Verilen MIME Tipleri | Maksimum Boyut |
|---|---|---|
| `product-images` | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml` | 5 MB |
| `product-documents` | `application/pdf` | 20 MB |
| `catalogs` | `application/pdf` | 50 MB |
| `brand-assets` | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | 10 MB |
| `private-uploads` | Herhangi (güvenli MIME kontrolü yapılır) | 100 MB |

Dosya tipi kontrolu yalnızca dosya adı uzantısına değil, Content-Type header ve dosyanın magic bytes (başlık imzası) analizi ile yapılır. Uzantı sahteciliği (extension spoofing) engellenir.

---

## Bucket Yapısı

| Bucket | Erişim Tipi | Amaç |
|---|---|---|
| `product-images` | Private (signed URL) / Public (is_public=true olanlar) | Ürün görselleri |
| `product-documents` | Private (signed URL) | Ürün teknik dökümanları, data sheet'ler |
| `catalogs` | Private (signed URL) | Katalog PDF dosyaları |
| `brand-assets` | Private (signed URL) | Marka logoları ve materyalleri |
| `private-uploads` | Private (signed URL) | Genel özel dosyalar |

Storage path formatı: `{bucket}/{yil}/{ay}/{uuid}.{ext}` — örnek: `product-images/2026/05/a1b2c3d4.jpg`

---

## Supabase Storage ile İlişki ve URL Kararı

### Public URL vs Signed URL Kararı

| Durum | URL Tipi | Gerekçe |
|---|---|---|
| `files.is_public = true` ve `product-images` bucket | Public URL | Katalog sayfalarında doğrudan CDN üzerinden sunulur; performans öncelikli |
| `files.is_public = false` veya hassas bucket | Signed URL | Kimlik doğrulama gerektiren erişim; 1 saat geçerli |
| Katalog PDF'leri | Signed URL | B2B müşteri bazlı erişim kontrolü |
| Brand assets | Signed URL | İçerik koruması |

### Yükleme Akışı — Direkt Upload

Heka API **direkt upload** yaklaşımı kullanır (presigned URL değil). Gerekçe:
- Dosya yükleme öncesinde sunucu tarafında MIME tipi, boyut ve yetki kontrolü yapılabilmesi
- Upload sonrası metadata kaydının atomik oluşturulması
- `file_relations` kaydının aynı transaction'da bağlanabilmesi

```
[İstemci] --multipart/form-data--> [Heka API]
                                        |
                            [MIME + boyut doğrulama]
                                        |
                            [Supabase Storage'a yükle]
                                        |
                        [files tablosuna metadata kaydet]
                                        |
                            [file_relations kaydı oluştur]
                                        |
                         [Dosya meta verisi + URL döner]
```

---

## POST /v1/files/upload

### Açıklama
Multipart form-data ile dosya yükler. Yükleme sonrası isteğe bağlı olarak bir kayda ilişkilendirir.

### Request (Content-Type: multipart/form-data)

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `file` | binary | Evet | Yüklenen dosya |
| `bucket` | string | Evet | Hedef bucket adı (`product-images`, `catalogs`, `brand-assets`, `product-documents`, `private-uploads`) |
| `is_public` | boolean | Hayır | Varsayılan: false |
| `entity_type` | string | Hayır | İlişkilendirilecek kayıt tipi (`product`, `catalog`, `brand`) |
| `entity_id` | string | Hayır | İlişkilendirilecek kayıt UUID |
| `relation_type` | string | Hayır | İlişki tipi (`main_image`, `gallery`, `document`, `pdf`) |

### Başarılı Yanıt — 201 Created

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | Dosya UUID |
| `data.original_filename` | string | Orijinal dosya adı |
| `data.mime_type` | string | MIME tipi |
| `data.size_bytes` | integer | Dosya boyutu (byte) |
| `data.bucket_name` | string | Depolandığı bucket |
| `data.storage_path` | string | Storage içi yol |
| `data.url` | string | Public URL veya null (private dosyalarda signed URL üretmek için `/v1/files/:id` kullanılır) |
| `data.relation_id` | string\|null | Oluşturulan ilişki UUID (entity_type verilmişse) |
| `data.uploaded_at` | string | Yükleme zamanı |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | FILE_MIME_NOT_ALLOWED | Bu bucket'ta izin verilmeyen dosya tipi |
| 400 | FILE_SIZE_EXCEEDED | Dosya boyutu bucket sınırını aşıyor |
| 400 | FILE_EMPTY | Boş dosya yüklenemez |
| 404 | FILE_ENTITY_NOT_FOUND | entity_id geçersiz |
| 422 | VALIDATION_FAILED | Eksik veya hatalı alan |

### İş Kuralları

- MIME tipi hem Content-Type header hem de dosya başlık imzası (magic bytes) ile doğrulanır.
- `entity_type` ve `entity_id` birlikte verilmek zorundadır; ikisi birden verilmezse ilişki oluşturulmaz.
- Dosya yükleme ve metadata kaydı atomik değildir: Storage'a yükleme başarılı olup metadata kaydı başarısız olursa orphan dosya temizleme görevi devreye girer.
- Aynı kullanıcı 24 saatte maksimum 500 dosya yükleyebilir (kullanıcı bazlı limit).

---

## GET /v1/files/:id

### Açıklama
Dosya meta verisini ve erişim URL'sini döner. Private dosyalar için signed URL üretilir.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `signed_url_ttl` | integer | Signed URL geçerlilik süresi (saniye, varsayılan: 3600, maks: 86400) |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | UUID |
| `data.original_filename` | string | Orijinal ad |
| `data.mime_type` | string | MIME tipi |
| `data.size_bytes` | integer | Boyut (byte) |
| `data.bucket_name` | string | Bucket adı |
| `data.is_public` | boolean | Public mi? |
| `data.url` | string | Public URL veya signed URL |
| `data.url_expires_at` | string\|null | Signed URL geçerlilik sonu (public ise null) |
| `data.uploaded_by` | string | Yükleyen kullanıcı UUID |
| `data.uploaded_at` | string | Yükleme zamanı |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 403 | FILE_ACCESS_DENIED | Bu dosyaya erişim yetkisi yok |
| 404 | FILE_NOT_FOUND | Dosya bulunamadı |

### İş Kuralları

- Signed URL üretimi loglanır; üretimi yapan kullanıcı kaydedilir.
- Private dosyalara yalnızca `manager` veya `admin` erişebilir; `viewer` yalnızca public dosyaları görebilir.

---

## DELETE /v1/files/:id

### Açıklama
Dosyayı soft-delete ile siler. Fiziksel silme günlük temizleme görevi tarafından yapılır.

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 403 | FILE_ACCESS_DENIED | Silme yetkisi yok |
| 404 | FILE_NOT_FOUND | Dosya bulunamadı |

### İş Kuralları

- `deleted_at` doldurulur; Storage'dan fiziksel silme hemen yapılmaz.
- 30 gün sonra arka plan görevi Storage'dan fiziksel olarak siler.
- Soft-delete sonrası dosyaya bağlı tüm `file_relations` kayıtları geçersiz sayılır (uygulama katmanında kontrol edilir).
- Silme işlemi audit_logs'a yazılır.

---

## POST /v1/files/:id/relations

### Açıklama
Mevcut bir dosyayı bir kayda ilişkilendirir. Aynı dosya birden fazla kayda ilişkilendirilebilir.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `entity_type` | string | Evet | `product`, `catalog`, `brand` |
| `entity_id` | string | Evet | İlişkilendirilecek kayıt UUID |
| `relation_type` | string | Evet | `main_image`, `gallery`, `document`, `pdf`, `thumbnail` |
| `sort_order` | integer | Hayır | Sıralama (özellikle gallery için) |

### Başarılı Yanıt — 201 Created

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | İlişki UUID |
| `data.file_id` | string | Dosya UUID |
| `data.entity_type` | string | Kayıt tipi |
| `data.entity_id` | string | Kayıt UUID |
| `data.relation_type` | string | İlişki tipi |
| `data.sort_order` | integer | Sıra |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | FILE_NOT_FOUND | Dosya bulunamadı |
| 404 | FILE_ENTITY_NOT_FOUND | entity_id geçersiz |
| 409 | FILE_RELATION_DUPLICATE | Bu dosya-kayıt-ilişki tipi kombinasyonu zaten var |
| 422 | FILE_RELATION_TYPE_INVALID | Bu entity_type için geçersiz relation_type |

### İş Kuralları

- Bir ürünün yalnızca bir `main_image` ilişkisi olabilir; ikinci `main_image` eklenmek istenirse mevcut `main_image` ilişkisi önce kaldırılmalıdır.
- `entity_type` değerleri: `product`, `catalog`, `brand` (ilerleyen fazda genişletilebilir).

---

## GET /v1/:entityType/:entityId/files

### Açıklama
Belirli bir kaydın dosyalarını listeler.

### Path Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `entityType` | string | `products`, `catalogs`, `brands` |
| `entityId` | string | Kayıt UUID |

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `relation_type` | string | İlişki tipi filtresi (`main_image`, `gallery`, `document` vs.) |
| `sort` | string | `sort_order`, `created_at`, `-created_at` |
| `limit` | integer | Varsayılan: 20, maks: 100 |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her dosya için:

| Alan | Tip | Açıklama |
|---|---|---|
| `relation_id` | string | İlişki UUID |
| `relation_type` | string | İlişki tipi |
| `sort_order` | integer | Sıra |
| `file.id` | string | Dosya UUID |
| `file.original_filename` | string | Orijinal ad |
| `file.mime_type` | string | MIME tipi |
| `file.size_bytes` | integer | Boyut |
| `file.url` | string | Public URL (private ise null; `/v1/files/:id` üzerinden signed URL alınır) |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | FILE_INVALID_ENTITY_TYPE | entityType geçersiz |
| 404 | FILE_ENTITY_NOT_FOUND | Kayıt bulunamadı |

---

## DELETE /v1/file-relations/:id

### Açıklama
Dosya ile kayıt arasındaki ilişkiyi kaldırır. Dosyanın kendisi silinmez; yalnızca ilişki kaydı silinir.

### Path Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `id` | string | İlişki UUID |

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | FILE_RELATION_NOT_FOUND | İlişki bulunamadı |

### İş Kuralları

- İlişki kaldırıldıktan sonra dosyanın başka ilişkisi kalmadıysa dosya "orphan" durumuna girer.
- Orphan dosyalar günlük arka plan görevi tarafından tespit edilip 30 gün sonra fiziksel olarak silinir.
