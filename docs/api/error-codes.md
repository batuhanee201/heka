# Hata Kodları Kataloğu

Tüm API hataları aşağıdaki standart formatta döner:

```
{
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Oturum süreniz doldu. Lütfen yeniden giriş yapın.",
    "details": null,
    "request_id": "req_01HZ..."
  }
}
```

---

## AUTH — Kimlik Doğrulama Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | Authorization header bulunamadı | İsteğe `Authorization: Bearer <token>` header'ı ekleyin |
| `AUTH_TOKEN_INVALID` | 401 | JWT formatı hatalı veya imzası geçersiz | Geçerli bir access token kullanın |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token süresi dolmuş | `/v1/auth/refresh` ile yeni token alın |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token bulunamadı veya iptal edilmiş | Yeniden giriş yapın |
| `AUTH_REFRESH_TOKEN_EXPIRED` | 401 | Refresh token süresi dolmuş (30 gün) | Yeniden giriş yapın |
| `AUTH_INVALID_CREDENTIALS` | 401 | E-posta veya şifre hatalı | Bilgileri kontrol edip tekrar deneyin |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | E-posta adresi doğrulanmamış | E-postanızdaki doğrulama linkine tıklayın |
| `AUTH_ACCOUNT_DISABLED` | 403 | Hesap yönetici tarafından devre dışı bırakılmış | Yönetici ile iletişime geçin |
| `AUTH_ACCOUNT_DELETED` | 403 | Hesap silinmiş | Yönetici ile iletişime geçin |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | Bu işlem için yetkiniz yok | Gerekli rol veya izin için yönetici ile iletişime geçin |
| `AUTH_EMAIL_ALREADY_EXISTS` | 409 | Bu e-posta ile kayıtlı aktif hesap var | Farklı e-posta kullanın veya mevcut hesabınıza giriş yapın |
| `AUTH_PHONE_ALREADY_EXISTS` | 409 | Bu telefon numarası başka hesapta kullanımda | Farklı telefon numarası kullanın |
| `AUTH_EMAIL_ALREADY_VERIFIED` | 400 | E-posta zaten doğrulanmış | Doğrulama tekrar yapmanıza gerek yok |
| `AUTH_OTP_INVALID` | 400 | OTP kodu hatalı veya süresi dolmuş | Yeni doğrulama kodu isteyin |
| `AUTH_OTP_MAX_ATTEMPTS` | 400 | OTP için maksimum deneme sayısı aşıldı | Yeni doğrulama kodu isteyin |
| `AUTH_PHONE_NOT_SET` | 400 | Kullanıcıya telefon numarası eklenmemiş | Önce profil güncelleme ile telefon ekleyin |
| `AUTH_SESSION_NOT_FOUND` | 404 | Oturum bulunamadı | Oturum süresi dolmuş olabilir |
| `AUTH_SESSION_NOT_OWNED` | 403 | Bu oturum başka kullanıcıya ait | Yalnızca kendi oturumlarınızı kapatabilirsiniz |
| `AUTH_CANNOT_DEACTIVATE_SELF` | 400 | Kendi hesabınızı devre dışı bırakamazsınız | Başka bir admin'den yardım isteyin |
| `AUTH_CANNOT_DELETE_SELF` | 400 | Kendi hesabınızı silemezsiniz | Başka bir admin'den yardım isteyin |

---

## VALIDATION — Girdi Doğrulama Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `VALIDATION_FAILED` | 422 | İstek gövdesi doğrulama kurallarını geçemiyor | `error.details` dizisindeki alan hatalarını inceleyin |
| `VALIDATION_REQUIRED_FIELD` | 422 | Zorunlu alan eksik | Belirtilen alanı isteğe ekleyin |
| `VALIDATION_INVALID_FORMAT` | 422 | Alan formatı geçersiz (email, uuid, tarih vs.) | Alan formatını düzeltin |
| `VALIDATION_INVALID_ENUM` | 422 | Geçersiz enum değeri | Kabul edilen değerler listesine bakın |
| `VALIDATION_MIN_LENGTH` | 422 | Değer minimum uzunluk koşulunu karşılamıyor | Değerin uzunluğunu artırın |
| `VALIDATION_MAX_LENGTH` | 422 | Değer maksimum uzunluğu aşıyor | Değeri kısaltın |
| `VALIDATION_MIN_VALUE` | 422 | Sayısal değer minimum değerin altında | Daha büyük bir değer girin |
| `VALIDATION_MAX_VALUE` | 422 | Sayısal değer maksimum değeri aşıyor | Daha küçük bir değer girin |
| `VALIDATION_CATEGORY_DEPTH` | 422 | Kategori derinliği maksimum seviyeyi (5) aşıyor | Daha az iç içe geçmiş bir kategori yapısı kullanın |
| `VALIDATION_INVALID_DATE_RANGE` | 422 | Tarih aralığı geçersiz (bitiş, başlangıçtan önce) | Tarih aralığını düzeltin |

---

## PRODUCT — Ürün Modülü Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `PRODUCT_NOT_FOUND` | 404 | Ürün bulunamadı veya silinmiş | Ürün ID'sini kontrol edin |
| `PRODUCT_CODE_EXISTS` | 409 | Bu ürün kodu zaten kullanımda | Farklı bir ürün kodu seçin |
| `PRODUCT_BRAND_NOT_FOUND` | 404 | Belirtilen marka bulunamadı | Geçerli bir marka ID kullanın |
| `PRODUCT_BRAND_SLUG_EXISTS` | 409 | Bu slug başka markada kullanımda | Farklı bir slug seçin |
| `PRODUCT_BRAND_HAS_PRODUCTS` | 409 | Bu markaya bağlı aktif ürün var; silinemez | Önce ürünleri başka markaya taşıyın veya silin |
| `PRODUCT_CATEGORY_NOT_FOUND` | 404 | Belirtilen kategori bulunamadı | Geçerli bir kategori ID kullanın |
| `PRODUCT_CATEGORY_PARENT_NOT_FOUND` | 404 | Üst kategori bulunamadı | Geçerli bir parent_id kullanın |
| `PRODUCT_CATEGORY_SLUG_EXISTS` | 409 | Bu slug başka kategoride kullanımda | Farklı bir slug seçin |
| `PRODUCT_CATEGORY_HAS_CHILDREN` | 409 | Alt kategorisi olan kategori silinemez | Önce alt kategorileri silin |
| `PRODUCT_CATEGORY_HAS_PRODUCTS` | 409 | Bu kategoride ürün var; silinemez | Önce ürünleri başka kategoriye taşıyın |
| `PRODUCT_CATEGORY_CIRCULAR` | 422 | Kategori taşıma döngüsel bağımlılık oluşturuyor | Farklı bir üst kategori seçin |
| `PRODUCT_TECHNICAL_DETAILS_NOT_FOUND` | 404 | Teknik detay henüz oluşturulmamış | PUT ile teknik detayları oluşturun |
| `PRODUCT_DISPLAY_NOT_FOUND` | 404 | Display bilgisi henüz oluşturulmamış | PUT ile display bilgisini oluşturun |
| `PRODUCT_BARCODE_EXISTS` | 409 | Bu barkod başka üründe kullanımda | Farklı barkod numarası kullanın |

---

## CATALOG — Katalog Modülü Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `CATALOG_NOT_FOUND` | 404 | Katalog bulunamadı veya silinmiş | Katalog ID'sini kontrol edin |
| `CATALOG_ARCHIVED_IMMUTABLE` | 409 | Arşivlenmiş katalog değiştirilemez | Yeni bir katalog oluşturun |
| `CATALOG_ACTIVE_NO_DELETE` | 409 | Aktif katalog silinemez | Önce kataloğu arşivleyin |
| `CATALOG_PUBLISH_EMPTY` | 422 | Boş katalog yayımlanamaz (en az 1 ürün gerekli) | Kataloğa ürün ekledikten sonra yayımlayın |
| `CATALOG_ITEM_NOT_FOUND` | 404 | Katalog kalemi bulunamadı | Ürün ID'sini ve katalog ID'sini kontrol edin |
| `CATALOG_ITEM_DUPLICATE` | 409 | Bu ürün katalogda zaten mevcut | Ürün bu kataloğa tekrar eklenemez |
| `CATALOG_REORDER_INCOMPLETE` | 400 | Yeniden sıralama isteğindeki ürünler katalog kalemleriyle uyuşmuyor | Tüm kalem ID'lerini doğru gönderin |
| `CATALOG_PRODUCT_INACTIVE` | 422 | Aktif olmayan ürün kataloğa eklenemez | Ürünü önce aktifleştirin |
| `PRICING_NOT_FOUND` | 404 | Fiyat kaydı bulunamadı | Fiyat ID'sini kontrol edin |
| `PRICING_DUPLICATE_ACTIVE` | 422 | Aynı ürün+katalog+para birimi için çakışan tarihli aktif fiyat var | Mevcut fiyat kaydını güncelleyin veya tarih aralığını ayarlayın |

---

## FILE — Dosya Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `FILE_NOT_FOUND` | 404 | Dosya bulunamadı veya silinmiş | Dosya ID'sini kontrol edin |
| `FILE_ACCESS_DENIED` | 403 | Bu dosyaya erişim yetkisi yok | Gerekli rol için yönetici ile iletişime geçin |
| `FILE_MIME_NOT_ALLOWED` | 400 | Bu bucket'ta izin verilmeyen dosya tipi | Desteklenen dosya tiplerini kontrol edin |
| `FILE_SIZE_EXCEEDED` | 400 | Dosya boyutu bucket sınırını aşıyor | Dosya boyutunu küçültün |
| `FILE_EMPTY` | 400 | Boş dosya yüklenemez | Geçerli içerikli bir dosya gönderin |
| `FILE_ENTITY_NOT_FOUND` | 404 | İlişkilendirilmek istenen kayıt bulunamadı | entity_id ve entity_type değerlerini kontrol edin |
| `FILE_RELATION_NOT_FOUND` | 404 | Dosya ilişkisi bulunamadı | Relation ID'sini kontrol edin |
| `FILE_RELATION_DUPLICATE` | 409 | Bu dosya-kayıt-ilişki tipi kombinasyonu zaten var | Mevcut ilişkiyi güncelleyin |
| `FILE_RELATION_TYPE_INVALID` | 422 | Bu entity tipi için geçersiz relation_type | Geçerli ilişki tiplerini belgede inceleyin |
| `FILE_INVALID_ENTITY_TYPE` | 400 | entityType değeri geçersiz | Desteklenen entity tiplerini kullanın: products, catalogs, brands |
| `FILE_UPLOAD_LIMIT_EXCEEDED` | 429 | 24 saatlik dosya yükleme limiti aşıldı | 24 saat sonra tekrar deneyin |

---

## RATE_LIMIT — Rate Limit Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `RATE_LIMIT_EXCEEDED` | 429 | Genel rate limit aşıldı | `Retry-After` header'ına göre bekleyin |
| `RATE_LIMIT_LOGIN` | 429 | Giriş denemesi limiti aşıldı (10/15dk) | 30 dakika bekleyin |
| `RATE_LIMIT_OTP` | 429 | OTP gönderme limiti aşıldı (5/saat) | 1 saat bekleyin |
| `RATE_LIMIT_PASSWORD_RESET` | 429 | Şifre sıfırlama limiti aşıldı (3/saat) | 2 saat bekleyin |
| `RATE_LIMIT_TOKEN_REFRESH` | 429 | Token yenileme limiti aşıldı (30/dk) | 1 dakika bekleyin |
| `RATE_LIMIT_WRITE` | 429 | Yazma işlemi limiti aşıldı (30/dk) | 1 dakika bekleyin |

---

## ADMIN — Admin Modülü Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `ADMIN_USER_NOT_FOUND` | 404 | Kullanıcı bulunamadı | Kullanıcı ID'sini kontrol edin |
| `ADMIN_ROLE_NOT_FOUND` | 404 | Rol bulunamadı | Rol ID'sini kontrol edin |
| `ADMIN_ROLE_NAME_EXISTS` | 409 | Bu isimde rol zaten var | Farklı bir rol adı seçin |
| `ADMIN_USER_ROLE_NOT_FOUND` | 404 | Bu rol kullanıcıda atanmış değil | Önce rolün atanmış olduğunu doğrulayın |
| `ADMIN_LAST_ADMIN_ROLE` | 400 | Sistemdeki son admin'in rolü kaldırılamaz | Önce başka bir kullanıcıya admin rolü atayın |
| `ADMIN_AUDIT_LOG_NOT_FOUND` | 404 | Denetim günlüğü kaydı bulunamadı | Log ID'sini kontrol edin |
| `ADMIN_SYSTEM_ROLE_IMMUTABLE` | 409 | Sistem rolü değiştirilemez veya silinemez | Sistem rolleri korumalıdır |

---

## SERVER — Sunucu Hataları

| Kod | HTTP Status | Açıklama | Çözüm Önerisi |
|---|---|---|---|
| `SERVER_ERROR` | 500 | Beklenmeyen sunucu hatası | `request_id`'yi not alıp destek ekibiyle paylaşın |
| `SERVER_DATABASE_ERROR` | 500 | Veritabanı bağlantı veya sorgu hatası | Birkaç dakika sonra tekrar deneyin |
| `SERVER_STORAGE_ERROR` | 500 | Supabase Storage erişim hatası | Birkaç dakika sonra tekrar deneyin |
| `SERVER_EXTERNAL_SERVICE_ERROR` | 502 | E-posta veya SMS servisi erişilemiyor | Birkaç dakika sonra tekrar deneyin |
| `SERVER_SERVICE_UNAVAILABLE` | 503 | Servis geçici olarak kullanılamıyor | `Retry-After` header'ına göre bekleyin |
| `SERVER_TIMEOUT` | 504 | İstek zaman aşımına uğradı | Daha küçük veri aralığı ile tekrar deneyin |

---

## Hata Yanıtı Örnekleri

### Tek Hata

```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Belirtilen ürün bulunamadı.",
    "details": null,
    "request_id": "req_01HZ8X9Y..."
  }
}
```

### Doğrulama Hatası (Çok Alanlı)

```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "İstek doğrulaması başarısız.",
    "details": [
      { "field": "email", "code": "VALIDATION_INVALID_FORMAT", "message": "Geçerli bir e-posta adresi giriniz." },
      { "field": "password", "code": "VALIDATION_MIN_LENGTH", "message": "Şifre en az 8 karakter olmalıdır." }
    ],
    "request_id": "req_01HZ8X9Z..."
  }
}
```

### Rate Limit Hatası

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1748123456
Retry-After: 1800

{
  "error": {
    "code": "RATE_LIMIT_LOGIN",
    "message": "Çok fazla giriş denemesi yapıldı. Lütfen 30 dakika sonra tekrar deneyin.",
    "details": null,
    "request_id": "req_01HZ8XA0..."
  }
}
```
