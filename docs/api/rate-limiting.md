# Rate Limiting Stratejisi

## Genel Yaklaşım

Heka API, iki katmanlı rate limiting uygular:

1. **Ağ/CDN Katmanı (Cloudflare veya Supabase API Gateway):** IP bazlı ham istek sınırı. Aşırı yük veya DDoS saldırılarında veritabanına hiç ulaşmadan engel.
2. **Uygulama Katmanı:** `rate_limit_logs` tablosu üzerinden hassas endpoint bazlı, IP + kullanıcı kimliği kombinasyonu ile ince taneli kontrol.

---

## Algoritma Kararı: Sliding Window

Sabit pencere (fixed window) yerine **sliding window** algoritması tercih edilmiştir.

| Özellik | Fixed Window | Sliding Window |
|---|---|---|
| Pencere başında sıfırlama | Evet — pencere sınırında iki kat istek mümkün | Hayır — sürekli kayan pencere |
| Uygulama karmaşıklığı | Düşük | Orta |
| Kullanıcı deneyimi | Pencere sınırında ani reset davranışı | Düzgün dağılım |
| Veritabanı sorgusu | Daha basit | `window_start` zamanı hesabı gerektirir |

Hassas endpoint'lerde (login, OTP) pencere sınırı saldırısına (burst attack) karşı sliding window daha koruyucudur.

---

## Endpoint Bazında Limit Tablosu

### Kimlik Doğrulama Endpoint'leri

| Endpoint | Pencere | Limit | Bloke Süresi | Identifier |
|---|---|---|---|---|
| POST /v1/auth/login | 15 dakika | 10 istek | 30 dakika | IP + email |
| POST /v1/auth/register | 1 saat | 5 istek | 1 saat | IP |
| POST /v1/auth/forgot-password | 1 saat | 3 istek | 2 saat | IP + email |
| POST /v1/auth/reset-password | 1 saat | 3 istek | 2 saat | IP + email |
| POST /v1/auth/verify-email | 1 saat | 5 istek | 1 saat | IP |
| POST /v1/auth/resend-verification | 1 saat | 3 istek | 1 saat | IP + email |
| POST /v1/auth/verify-phone | 1 saat | 5 istek | 1 saat | IP + user_id |
| POST /v1/auth/refresh | 1 dakika | 30 istek | 5 dakika | IP |

### Genel API Endpoint'leri

| Endpoint Grubu | Pencere | Limit | Identifier |
|---|---|---|---|
| GET (okuma — genel) | 1 dakika | 120 istek | user_id |
| POST / PATCH / PUT (yazma) | 1 dakika | 30 istek | user_id |
| DELETE | 1 dakika | 20 istek | user_id |
| Admin endpoint'leri | 1 dakika | 60 istek | user_id |
| Dosya yükleme | 1 dakika | 20 istek | user_id |
| Dosya yükleme (günlük) | 24 saat | 500 istek | user_id |

### B2B API Key Erişimi (İlerleyen Faz)

| Endpoint Grubu | Pencere | Limit | Identifier |
|---|---|---|---|
| Genel okuma | 1 dakika | 300 istek | api_key |
| Yazma işlemleri | 1 dakika | 60 istek | api_key |

---

## Rate Limit Header'ları

Her API yanıtında aşağıdaki header'lar bulunur:

| Header | Açıklama | Örnek |
|---|---|---|
| `X-RateLimit-Limit` | İlgili penceredeki toplam istek hakkı | `120` |
| `X-RateLimit-Remaining` | Mevcut pencerede kalan istek hakkı | `87` |
| `X-RateLimit-Reset` | Pencerenin sıfırlanacağı Unix timestamp (saniye) | `1748123456` |
| `X-RateLimit-Policy` | Hangi politikanın uygulandığı (opsiyonel) | `120;w=60` |

429 yanıtlarında ek olarak:

| Header | Açıklama | Örnek |
|---|---|---|
| `Retry-After` | Kaç saniye sonra tekrar denenebileceği | `1800` |

---

## Limit Aşımı Yanıt Formatı

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
    "request_id": "req_01HZ..."
  }
}
```

---

## IP Bazlı vs Kullanıcı Bazlı Limit Kararı

| Durum | Identifier Stratejisi | Gerekçe |
|---|---|---|
| Kimlik doğrulama gerektirmeyen endpoint | IP adresi | Kullanıcı kimliği henüz bilinmiyor |
| Login, forgot-password | IP + email kombinasyonu | Tek IP'den çok sayıda farklı hesaba saldırı önlenir |
| Kimlik doğrulanmış endpoint | user_id | Farklı IP'lerden gelen aynı kullanıcı hesabı korunur (VPN rotasyonu etkisiz) |
| Dosya yükleme | user_id (dakika) + user_id (günlük) | İki katmanlı koruma; hem anlık hem kümülatif sınır |

### Reverse Proxy Arkasında IP Tespiti

- `X-Forwarded-For` header'ının ilk IP'si kullanılır.
- `X-Real-IP` yedek olarak kontrol edilir.
- Trusted proxy listesi konfigürasyonda tanımlanır; doğrudan bağlantılarda `req.socket.remoteAddress` kullanılır.

---

## Bloke Bildirimi Politikası

- Kullanıcıya hesap varlığını açıklayan bilgi sızdırılmaz; mevcut olmayan bir e-posta ile yapılan deneme de bloke mesajı alır.
- Bloke mesajı `Retry-After` saniyesini içerir; kullanıcı ne kadar bekleyeceğini bilir.
- Admin panelinden bloke durumu görülebilir; elle kaldırılabilir.
- Bloke atlatmak için proxy/IP değiştirme girişimleri uygulama katmanında email bazlı limit ile yakalanır.

---

## Rate Limit Log Temizleme

`rate_limit_logs` tablosundaki eski kayıtlar büyüme kontrolü için periyodik temizlenir:

- `window_start` + pencere süresi + bloke süresi geçen kayıtlar günlük iş (cron) ile silinir.
- Silme öncesi kayıt sayısı ve temizleme özeti uygulama log'una yazılır.
- Temizleme agresif olmaktan kaçınır; güvenlik analizi için son 30 günlük kayıtlar korunur.
