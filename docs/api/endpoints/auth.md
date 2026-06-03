# Auth Modülü — Endpoint Referansı

## Endpoint Özet Tablosu

| Method | Path | Açıklama | Kimlik Doğrulama | Rol | Rate Limit |
|---|---|---|---|---|---|
| POST | /v1/auth/register | Yeni kullanıcı kaydı | Hayır | — | 5 istek / 1 saat (IP) |
| POST | /v1/auth/login | Kullanıcı girişi | Hayır | — | 10 istek / 15 dk (IP + email) |
| POST | /v1/auth/logout | Oturumu kapat | Evet | viewer+ | — |
| POST | /v1/auth/refresh | Access token yenile | Hayır (cookie) | — | 30 istek / 1 dk (IP) |
| POST | /v1/auth/forgot-password | Şifre sıfırlama e-postası gönder | Hayır | — | 3 istek / 1 saat (IP + email) |
| POST | /v1/auth/reset-password | Yeni şifre belirle | Hayır | — | 3 istek / 1 saat (IP + email) |
| POST | /v1/auth/verify-email | E-posta OTP doğrulama | Hayır | — | 5 istek / 1 saat (IP) |
| POST | /v1/auth/resend-verification | Doğrulama e-postasını tekrar gönder | Hayır | — | 3 istek / 1 saat (IP + email) |
| POST | /v1/auth/verify-phone | SMS OTP doğrulama | Evet | viewer+ | 5 istek / 1 saat (IP + user) |
| GET  | /v1/auth/me | Giriş yapan kullanıcının profili | Evet | viewer+ | — |
| PATCH | /v1/auth/me | Profil güncelle | Evet | viewer+ | 10 istek / 1 dk (user) |
| GET  | /v1/auth/sessions | Aktif oturumları listele | Evet | viewer+ | — |
| DELETE | /v1/auth/sessions/:id | Belirli bir oturumu kapat | Evet | viewer+ | — |

---

## POST /v1/auth/register

### Açıklama
Sisteme yeni kullanıcı kaydı yapar. Başarılı kayıt sonrasında e-posta doğrulama OTP'si gönderilir; hesap e-posta doğrulanana kadar tam aktif sayılmaz.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `email` | string | Evet | RFC 5322 uyumlu e-posta adresi |
| `password` | string | Evet | En az 8 karakter, en az 1 büyük harf, 1 sayı |
| `full_name` | string | Evet | Tam ad (2-100 karakter) |
| `phone` | string | Hayır | E.164 formatında telefon (+905001234567) |

### Başarılı Yanıt — 201 Created

| Alan | Tip | Açıklama |
|---|---|---|
| `data.user_id` | string (UUID) | Oluşturulan kullanıcının ID'si |
| `data.email` | string | Kayıt e-posta adresi |
| `data.message` | string | "Doğrulama e-postası gönderildi" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 409 | AUTH_EMAIL_ALREADY_EXISTS | Bu e-posta ile kayıtlı aktif hesap var |
| 422 | VALIDATION_FAILED | Girdi doğrulama hatası (alan detaylarıyla) |
| 429 | RATE_LIMIT_EXCEEDED | Kayıt limiti aşıldı |
| 500 | SERVER_ERROR | Beklenmeyen hata |

### İş Kuralları

- E-posta ve kullanıcı kaydı tek transaction içinde oluşturulur; herhangi bir adım başarısız olursa tümü geri alınır.
- Yeni kullanıcıya otomatik olarak `viewer` rolü atanır.
- Kayıt sırasında silinen (soft-deleted) hesapla aynı e-posta kullanılıyorsa `409` döner; bu e-posta reaktive edilemez (admin müdahalesi gerekir).
- Şifre plain-text olarak hiçbir yerde loglanmaz; Argon2id hash sunucu tarafında hesaplanır.

---

## POST /v1/auth/login

### Açıklama
E-posta ve şifre ile giriş yapar. Başarılı girişte access token (response body) ve refresh token (httpOnly cookie) döner.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `email` | string | Evet | Kayıtlı e-posta |
| `password` | string | Evet | Kullanıcı şifresi |
| `device_info` | object | Hayır | `{name, os, browser}` — oturum kaydı için |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.access_token` | string | JWT access token |
| `data.token_type` | string | "Bearer" |
| `data.expires_in` | integer | Saniye cinsinden geçerlilik (900) |
| `data.user.id` | string | Kullanıcı UUID |
| `data.user.email` | string | E-posta |
| `data.user.full_name` | string | Ad soyad |
| `data.user.role` | string | Kullanıcı rolü |

Refresh token `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth` olarak set edilir.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 401 | AUTH_INVALID_CREDENTIALS | E-posta veya şifre hatalı |
| 403 | AUTH_EMAIL_NOT_VERIFIED | E-posta doğrulanmamış |
| 403 | AUTH_ACCOUNT_DISABLED | Hesap devre dışı bırakılmış |
| 422 | VALIDATION_FAILED | Girdi doğrulama hatası |
| 429 | RATE_LIMIT_LOGIN | Giriş denemesi limiti aşıldı |

### İş Kuralları

- Başarısız girişlerde hesap varlığını açıklayan bilgi sızdırılmaz; tüm hatalı giriş durumları `AUTH_INVALID_CREDENTIALS` kodu ile döner.
- Rate limit hem IP hem de e-posta kombinasyonu üzerinden hesaplanır.
- Başarılı girişte `last_login_at` güncellenir ve audit_logs kaydı oluşturulur.

---

## POST /v1/auth/logout

### Açıklama
Mevcut oturumu kapatır. Refresh token geçersiz kılınır.

### Request Body

Boş. Refresh token httpOnly cookie'den alınır.

### Başarılı Yanıt — 204 No Content

Yanıt body'si yoktur. Cookie temizlenir.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 401 | AUTH_TOKEN_INVALID | Geçersiz veya eksik access token |

### İş Kuralları

- Yalnızca mevcut oturum kapatılır; diğer cihazlardaki oturumlar etkilenmez.
- Tüm oturumları kapatmak için her oturum için ayrı DELETE `/v1/auth/sessions/:id` çağrısı yapılır.

---

## POST /v1/auth/refresh

### Açıklama
Süresi dolmuş veya dolmak üzere olan access token'ı yeniler. Token rotation uygulanır.

### Request Body

Boş. Refresh token httpOnly cookie'den okunur. Cookie yoksa body'de `refresh_token` alanı kabul edilir (native uygulama desteği için).

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `refresh_token` | string | Hayır | Cookie yoksa buradan okunur |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.access_token` | string | Yeni JWT access token |
| `data.token_type` | string | "Bearer" |
| `data.expires_in` | integer | 900 (saniye) |

Yeni refresh token `Set-Cookie` ile güncellenir.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 401 | AUTH_REFRESH_TOKEN_INVALID | Token bulunamadı veya iptal edilmiş |
| 401 | AUTH_REFRESH_TOKEN_EXPIRED | Token süresi dolmuş |
| 429 | RATE_LIMIT_EXCEEDED | Token yenileme limiti aşıldı |

### İş Kuralları

- Eski refresh token kullanıldıktan sonra geçersiz hale gelir; token rotation zorunludur.
- Daha önce kullanılmış bir refresh token tekrar kullanılmaya çalışılırsa güvenlik ihlali olarak işaretlenir ve tüm kullanıcı oturumları iptal edilir.

---

## POST /v1/auth/forgot-password

### Açıklama
Şifre sıfırlama OTP kodu e-posta ile gönderir.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `email` | string | Evet | Kayıtlı e-posta adresi |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.message` | string | "Şifre sıfırlama talimatları e-posta adresinize gönderildi" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 422 | VALIDATION_FAILED | Geçersiz e-posta formatı |
| 429 | RATE_LIMIT_PASSWORD_RESET | Limit aşıldı |

### İş Kuralları

- E-posta sistemde kayıtlı olmasa bile başarı mesajı döner (hesap numaralama saldırısı önleme).
- OTP kodu 10 dakika geçerlidir.
- Aynı anda yalnızca bir aktif şifre sıfırlama OTP'si olabilir; yeni istek öncekini geçersiz kılar.

---

## POST /v1/auth/reset-password

### Açıklama
OTP kodu ile yeni şifre belirler.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `email` | string | Evet | Hesap e-posta adresi |
| `code` | string | Evet | 6 haneli OTP kodu |
| `new_password` | string | Evet | Yeni şifre (en az 8 karakter, güçlük kuralı) |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.message` | string | "Şifre başarıyla güncellendi" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | AUTH_OTP_INVALID | Hatalı veya süresi dolmuş OTP |
| 400 | AUTH_OTP_MAX_ATTEMPTS | Maksimum deneme aşıldı |
| 422 | VALIDATION_FAILED | Şifre kurallarına uymayan yeni şifre |
| 429 | RATE_LIMIT_PASSWORD_RESET | Limit aşıldı |

### İş Kuralları

- Şifre başarıyla sıfırlandıktan sonra kullanıcının tüm aktif oturumları iptal edilir.
- OTP 3 hatalı girişten sonra kilitlenir; yeni `forgot-password` isteği gerekir.

---

## POST /v1/auth/verify-email

### Açıklama
Kayıt sırasında gönderilen e-posta OTP kodunu doğrular.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `user_id` | string | Evet | Kayıt olan kullanıcı UUID'si |
| `code` | string | Evet | 6 haneli OTP kodu |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.message` | string | "E-posta başarıyla doğrulandı" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | AUTH_OTP_INVALID | Hatalı veya süresi dolmuş OTP |
| 400 | AUTH_OTP_MAX_ATTEMPTS | 3 hatalı deneme limiti aşıldı |
| 400 | AUTH_EMAIL_ALREADY_VERIFIED | E-posta zaten doğrulanmış |

---

## POST /v1/auth/resend-verification

### Açıklama
E-posta doğrulama kodunu tekrar gönderir.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `email` | string | Evet | Doğrulanmamış e-posta |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.message` | string | "Doğrulama kodu tekrar gönderildi" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | AUTH_EMAIL_ALREADY_VERIFIED | E-posta zaten doğrulanmış |
| 429 | RATE_LIMIT_OTP | OTP gönderme limiti aşıldı |

### İş Kuralları

- E-posta sistemde yoksa sessiz başarı döner (enumeration önleme).
- Yeni OTP gönderildiğinde önceki geçersiz hale gelir.

---

## POST /v1/auth/verify-phone

### Açıklama
SMS ile gönderilen OTP kodunu doğrular. Önce `/v1/auth/me PATCH` ile telefon numarası eklenmiş olmalıdır.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `code` | string | Evet | 6 haneli SMS OTP kodu |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.message` | string | "Telefon numarası doğrulandı" |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | AUTH_OTP_INVALID | Hatalı veya süresi dolmuş OTP |
| 400 | AUTH_PHONE_NOT_SET | Kullanıcının telefon numarası yok |
| 401 | AUTH_TOKEN_INVALID | Kimlik doğrulaması gerekli |

---

## GET /v1/auth/me

### Açıklama
Giriş yapmış kullanıcının profil bilgilerini döner.

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.id` | string | Kullanıcı UUID |
| `data.email` | string | E-posta |
| `data.full_name` | string | Ad soyad |
| `data.phone` | string\|null | Telefon numarası |
| `data.email_verified` | boolean | E-posta doğrulandı mı |
| `data.phone_verified` | boolean | Telefon doğrulandı mı |
| `data.role` | string | Kullanıcı rolü |
| `data.last_login_at` | string | Son giriş tarihi (ISO 8601) |
| `data.created_at` | string | Hesap oluşturma tarihi |

### İş Kuralları

- `password_hash` ve diğer güvenlik alanları hiçbir zaman yanıtta yer almaz.

---

## PATCH /v1/auth/me

### Açıklama
Giriş yapmış kullanıcının profil bilgilerini günceller.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `full_name` | string | Hayır | 2-100 karakter |
| `phone` | string | Hayır | E.164 formatı; değiştirilince `phone_verified=false` olur ve SMS OTP gönderilir |

### Başarılı Yanıt — 200 OK

Güncellenmiş kullanıcı profili (`GET /v1/auth/me` yanıt formatıyla aynı).

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 409 | AUTH_PHONE_ALREADY_EXISTS | Bu telefon başka hesapta kullanımda |
| 422 | VALIDATION_FAILED | Geçersiz format |

### İş Kuralları

- E-posta bu endpoint üzerinden değiştirilemez.
- Telefon numarası değiştirildiğinde `phone_verified` false olarak sıfırlanır ve SMS OTP gönderilir.

---

## GET /v1/auth/sessions

### Açıklama
Kullanıcının aktif oturumlarını listeler.

### Query Parametreleri

| Parametre | Açıklama |
|---|---|
| `limit` | Sayfa başına kayıt (varsayılan: 20) |
| `after` | Cursor tabanlı sayfalama |

### Başarılı Yanıt — 200 OK

`data` dizisi her oturum için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Oturum UUID |
| `ip_address` | string | Oturumun IP adresi |
| `user_agent` | string | Tarayıcı/uygulama bilgisi |
| `device_info` | object | Cihaz adı, OS, tarayıcı |
| `created_at` | string | Oturum oluşturma zamanı |
| `last_active_at` | string | Son aktivite zamanı |
| `is_current` | boolean | Bu isteği yapan oturum mu? |

### İş Kuralları

- Yalnızca aktif (revoked_at IS NULL ve expires_at > now()) oturumlar listelenir.
- Admin kendi oturumlarına ek olarak diğer kullanıcıların oturumlarını da görebilir (admin endpoint'i üzerinden).

---

## DELETE /v1/auth/sessions/:id

### Açıklama
Belirli bir oturumu kapatır (remote logout).

### Path Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `id` | string (UUID) | Kapatılacak oturum ID'si |

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 403 | AUTH_SESSION_NOT_OWNED | Bu oturum başka kullanıcıya ait |
| 404 | AUTH_SESSION_NOT_FOUND | Oturum bulunamadı |

### İş Kuralları

- Kullanıcı yalnızca kendi oturumlarını kapatabilir.
- Admin `/v1/admin/users/:id` üzerinden başka kullanıcı oturumlarını kapatabilir.
- Audit log kaydı oluşturulur.
