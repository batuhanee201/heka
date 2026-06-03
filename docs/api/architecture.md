# API Mimari Tasarımı

## 1. Katman Mimarisi

Her HTTP isteği aşağıdaki katmanlardan sırayla geçer:

```
[HTTP İsteği]
      |
      v
[Middleware Stack]
  1. Rate Limiter      — IP / kullanıcı bazlı istek sayısı kontrolü
  2. Auth Middleware   — JWT doğrulama, token geçerlilik kontrolü
  3. Role Guard        — app_metadata.role claim kontrolü
  4. Validation        — Request body/query/params şema doğrulaması
      |
      v
[Controller]           — İstek/yanıt formatlama; iş mantığı içermez
      |
      v
[Service]              — İş kuralları, orkestrasyon, transaction yönetimi
      |
      v
[Repository]           — Veritabanı sorguları (Supabase client)
      |
      v
[Supabase / PostgreSQL]
      |
      v
[Audit Log Middleware] — Kritik değişiklikler audit_logs tablosuna yazılır
      |
      v
[HTTP Yanıtı]
```

### Katman Sorumlulukları

| Katman | Sorumluluk | Kısıtlama |
|---|---|---|
| Controller | HTTP sözleşmesi: istek parse, yanıt formatla | İş mantığı içermez |
| Service | İş kuralları, doğrulama mantığı, transaction | Veritabanı detaylarını bilmez |
| Repository | SQL sorguları, Supabase çağrıları | İş kuralı uygulamaz |
| Middleware | Yatay kesit (cross-cutting) endişeler | Request context'i değiştirebilir |

---

## 2. Middleware Stack Detayı

### 2.1 Rate Limiter (1. sıra)

Her istekten önce çalışır. `rate_limit_logs` tablosu ve uygulama belleği (sliding window) birlikte kullanılır.

- IP adresi `X-Forwarded-For` header'ından alınır (reverse proxy arkasında çalışma varsayımı).
- Limit aşımında `429 Too Many Requests` döner; işlem zinciri kırılır.
- Detay için bkz. [rate-limiting.md](rate-limiting.md).

### 2.2 Auth Middleware (2. sıra)

`Authorization: Bearer <token>` header'ı parse edilir.

- Token yoksa `401 Unauthorized` döner.
- Token imzası Supabase JWT secret ile doğrulanır.
- Token süresi `exp` claim ile kontrol edilir.
- Geçerli token, `request.user` context'ine atanır.
- `Public` olarak işaretlenen endpoint'lerde bu middleware atlanır.

### 2.3 Role Guard (3. sıra)

JWT'deki `app_metadata.role` claim'i, endpoint'in gerektirdiği rolle karşılaştırılır.

- Yetki yoksa `403 Forbidden` döner.
- Rol hiyerarşisi: `admin > manager > viewer`.
- Birden fazla rol izin veriliyorsa `OR` mantığı uygulanır.

### 2.4 Validation Middleware (4. sıra)

Request body, query parametreleri ve path parametreleri JSON Schema veya Zod şemasına göre doğrulanır.

- Doğrulama hatası `422 Unprocessable Entity` döner.
- Hata mesajları alan bazında ayrıntılıdır (bkz. hata yapısı).
- XSS ve SQL injection için girdi temizleme bu katmanda yapılır.

### 2.5 Audit Log (Response sonrası)

Handler başarıyla tamamlandıktan sonra, şu koşulları sağlayan istekler audit_logs tablosuna yazılır:

- Veri değiştiren tüm metodlar: POST, PATCH, PUT, DELETE
- Kimlik doğrulama olayları: login, logout, OTP doğrulama
- Yönetimsel işlemler: rol atama/kaldırma, kullanıcı devre dışı bırakma

---

## 3. Hata Yönetimi Stratejisi

### Standart Hata Yanıt Yapısı

```
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "E-posta veya şifre hatalı.",
    "details": null,
    "request_id": "req_01HZ..."
  }
}
```

`details` alanı yalnızca validation hatalarında dolu gelir:

```
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "İstek doğrulaması başarısız.",
    "details": [
      { "field": "email", "message": "Geçerli bir e-posta adresi giriniz." },
      { "field": "password", "message": "Şifre en az 8 karakter olmalıdır." }
    ],
    "request_id": "req_01HZ..."
  }
}
```

### HTTP Status Kodu Eşlemeleri

| HTTP Status | Kullanım Durumu |
|---|---|
| 200 OK | Başarılı GET, PATCH, PUT |
| 201 Created | Başarılı POST (kayıt oluşturuldu) |
| 204 No Content | Başarılı DELETE |
| 400 Bad Request | Eksik/hatalı istek yapısı (JSON parse hatası, eksik header) |
| 401 Unauthorized | Kimlik doğrulama yok veya token geçersiz |
| 403 Forbidden | Kimlik doğrulandı fakat yetki yok |
| 404 Not Found | Kaynak bulunamadı |
| 409 Conflict | Çakışma (duplicate email, unique constraint ihlali) |
| 422 Unprocessable Entity | İstek yapısı geçerli fakat doğrulama kuralları geçilemiyor |
| 429 Too Many Requests | Rate limit aşıldı |
| 500 Internal Server Error | Beklenmeyen sunucu hatası |
| 503 Service Unavailable | Supabase/bağımlı servis erişilemiyor |

### Hata Kodları

Tam katalog için bkz. [error-codes.md](error-codes.md). Kod formatı: `{MODUL}_{EYLEM}_{DURUM}` (örnek: `AUTH_TOKEN_EXPIRED`, `PRODUCT_NOT_FOUND`).

### Hata Loglama Kuralları

- 5xx hatalar her zaman structured log'a yazılır ve Sentry'e raporlanır.
- 4xx hatalar sadece güvenlik ilgili olanlar (401, 403, 429) loglanır; 404 loglanmaz.
- Hata mesajlarında kullanıcıya sistem iç yapısı açıklanmaz (stack trace, SQL sorgusu vs.).

---

## 4. Request/Response Standartları

### Başarılı Yanıt Zarfları

**Tekil kaynak:**
```
{
  "data": { ...kaynak alanları... }
}
```

**Liste (pagination ile):**
```
{
  "data": [ ...kayıt dizisi... ],
  "pagination": {
    "next_cursor": "eyJpZCI6Ij...",
    "prev_cursor": null,
    "has_more": true,
    "limit": 20
  }
}
```

### Pagination Query Parametreleri

| Parametre | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `limit` | integer | 20 | Sayfa başına kayıt sayısı (maks: 100) |
| `after` | string | — | Bu cursor'dan sonrasını getir (ileri sayfalama) |
| `before` | string | — | Bu cursor'dan öncesini getir (geri sayfalama) |

Detay için bkz. [pagination.md](pagination.md).

### Sıralama (Sorting) Query Parametreleri

| Parametre | Format | Örnek |
|---|---|---|
| `sort` | `{alan}` veya `-{alan}` (azalan için `-`) | `sort=-created_at` veya `sort=name` |

Birden fazla alan: `sort=-created_at,name`

### Filtreleme (Filtering) Query Parametreleri

Filtreleme parametreleri endpoint bazında tanımlanır. Genel format:

| Parametre | Format | Örnek |
|---|---|---|
| Tam eşleşme | `{alan}={deger}` | `status=active` |
| Çoklu değer | `{alan}[]={deger}` | `status[]=active&status[]=draft` |
| Tarih aralığı | `{alan}_from` / `{alan}_to` | `created_at_from=2026-01-01` |
| Metin arama | `q={arama}` | `q=ampul` |

---

## 5. API Versiyonlama Stratejisi

- Tüm endpoint'ler `/v1/` prefix'i ile başlar.
- Geriye dönük uyumsuz değişiklikler yeni major versiyon gerektirir (`/v2/`).
- Minor değişiklikler (yeni opsiyonel alan ekleme, yeni endpoint ekleme) mevcut versiyonda yapılabilir.
- Eski versiyon en az **6 ay** desteklenir.
- Kaldırılacak endpoint'ler en az **3 ay** önce `Deprecation: true` ve `Sunset: <tarih>` header'ları ile işaretlenir.

### Geriye Dönük Uyumsuz Değişiklik Örnekleri

- Mevcut bir alanın kaldırılması
- Mevcut bir alanın tipinin değiştirilmesi
- Zorunlu yeni bir alan eklenmesi
- URL yapısının değiştirilmesi
- Kimlik doğrulama mekanizmasının değiştirilmesi

---

## 6. CORS Politikası

| Kural | Değer |
|---|---|
| İzin verilen origin'ler | Ortam değişkeninden yönetilen whitelist (örn: `https://app.heka.app`) |
| Wildcard origin | Hiçbir production endpoint'inde `*` kullanılmaz |
| İzin verilen metodlar | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| İzin verilen header'lar | `Content-Type`, `Authorization`, `X-Request-ID` |
| Credentials | `true` (httpOnly cookie için zorunlu) |
| Max-Age | 86400 saniye (preflight cache) |

Geliştirme ortamında `localhost:3000` ve `localhost:5173` (Vite/frontend geliştirme) whitelist'e eklenir; bu konfigürasyon production'a taşınmaz.
