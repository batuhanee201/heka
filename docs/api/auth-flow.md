# Kimlik Doğrulama Akışları

## 1. Kayıt Akışı (Register → Email OTP → Aktif Hesap)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant SB as Supabase Auth
    participant DB as PostgreSQL
    participant Mail as E-posta Servisi

    K->>API: POST /v1/auth/register {email, password, full_name}
    API->>API: Rate limit kontrolü (IP bazlı)
    API->>API: Girdi doğrulama (email format, şifre güçü)
    API->>DB: users tablosunda email var mı?
    alt Email zaten kayıtlı
        API-->>K: 409 Conflict — AUTH_EMAIL_ALREADY_EXISTS
    end
    API->>SB: auth.signUp(email, password)
    SB-->>API: supabase_auth_id
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT users (supabase_auth_id, email, full_name, password_hash)
    API->>DB: INSERT user_roles (user_id, role_id=viewer)
    API->>DB: INSERT otp_verifications (user_id, channel=email, purpose=email_verification)
    API->>DB: COMMIT
    API->>Mail: OTP kodunu gönder
    API-->>K: 201 Created {user_id, email, message: "Doğrulama e-postası gönderildi"}
    Note over K,Mail: Kullanıcı e-postadaki 6 haneli kodu girer
    K->>API: POST /v1/auth/verify-email {user_id, code}
    API->>DB: otp_verifications'da code_hash kontrol
    alt OTP geçersiz veya süresi dolmuş
        API-->>K: 400 Bad Request — AUTH_OTP_INVALID
    end
    API->>DB: UPDATE users SET email_verified=true
    API->>DB: UPDATE otp_verifications SET used_at=now()
    API-->>K: 200 OK {message: "E-posta doğrulandı"}
```

---

## 2. Giriş Akışı (Login → Access Token + Refresh Token)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL
    participant SB as Supabase Auth

    K->>API: POST /v1/auth/login {email, password}
    API->>API: Rate limit kontrolü (IP + email, 10 deneme / 15 dk)
    API->>DB: users tablosunda email var mı? is_active=true? email_verified=true?
    alt Hesap bulunamadı veya aktif değil
        API->>DB: rate_limit_logs güncelle (attempt_count++)
        API-->>K: 401 Unauthorized — AUTH_INVALID_CREDENTIALS
    end
    API->>API: Argon2id ile şifre doğrulama (constant-time compare)
    alt Şifre hatalı
        API->>DB: rate_limit_logs güncelle
        API-->>K: 401 Unauthorized — AUTH_INVALID_CREDENTIALS
    end
    API->>SB: Supabase Auth ile oturum oluştur
    API->>DB: INSERT sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
    API->>DB: UPDATE users SET last_login_at=now()
    API->>DB: INSERT audit_logs (event_type=login)
    API->>DB: rate_limit_logs güncelle (attempt_count=0)
    API-->>K: 200 OK {access_token, expires_in: 900}
    Note over K,API: refresh_token httpOnly cookie olarak set edilir
```

---

## 3. Token Yenileme Akışı (Refresh → Yeni Access Token)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL

    K->>API: POST /v1/auth/refresh (httpOnly cookie: refresh_token)
    API->>API: Rate limit kontrolü (30 istek / 1 dk — IP bazlı)
    API->>DB: sessions tablosunda refresh_token_hash kontrol
    alt Token bulunamadı veya revoked_at dolu
        API-->>K: 401 Unauthorized — AUTH_REFRESH_TOKEN_INVALID
    end
    alt Token süresi dolmuş (expires_at < now())
        API->>DB: sessions kaydını revoke et
        API-->>K: 401 Unauthorized — AUTH_REFRESH_TOKEN_EXPIRED
    end
    Note over API,DB: Token Rotation başlıyor
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE sessions SET revoked_at=now() (eski token)
    API->>DB: INSERT sessions (yeni refresh_token_hash, yeni expires_at)
    API->>DB: COMMIT
    API-->>K: 200 OK {access_token, expires_in: 900}
    Note over K,API: Yeni refresh_token httpOnly cookie olarak güncellenir
```

---

## 4. Şifre Sıfırlama Akışı (Forgot → OTP → Reset)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL
    participant Mail as E-posta Servisi

    K->>API: POST /v1/auth/forgot-password {email}
    API->>API: Rate limit kontrolü (3 istek / 1 saat — IP + email)
    Note over API: Hesap var mı yok mu aynı yanıt döner (enumeration önleme)
    API->>DB: users tablosunda email ara (sessizce)
    alt Email kayıtlı değilse
        API-->>K: 200 OK {message: "Şifre sıfırlama e-postası gönderildi"} (sahte başarı)
    end
    API->>DB: INSERT otp_verifications (user_id, channel=email, purpose=password_reset)
    API->>Mail: OTP kodunu gönder
    API-->>K: 200 OK {message: "Şifre sıfırlama e-postası gönderildi"}

    K->>API: POST /v1/auth/reset-password {email, code, new_password}
    API->>DB: otp_verifications kontrol (purpose=password_reset, used_at IS NULL, expires_at > now(), attempt_count < 3)
    alt OTP geçersiz
        API->>DB: otp attempt_count++
        API-->>K: 400 Bad Request — AUTH_OTP_INVALID
    end
    API->>DB: BEGIN TRANSACTION
    API->>API: Argon2id ile yeni şifre hash'leme
    API->>DB: UPDATE users SET password_hash=yeni_hash
    API->>DB: UPDATE otp_verifications SET used_at=now()
    API->>DB: UPDATE sessions SET revoked_at=now() WHERE user_id=X (tüm oturumları kapat)
    API->>DB: INSERT audit_logs (event_type=password_reset)
    API->>DB: COMMIT
    API-->>K: 200 OK {message: "Şifre başarıyla güncellendi"}
```

---

## 5. Telefon Doğrulama Akışı (SMS OTP)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL
    participant SMS as SMS Servisi

    K->>API: PATCH /v1/auth/me {phone: "+905001234567"}
    API->>API: E.164 format doğrulama
    API->>DB: phone başka kullanıcıda var mı? (partial unique index)
    alt Telefon zaten kullanımda
        API-->>K: 409 Conflict — AUTH_PHONE_ALREADY_EXISTS
    end
    API->>DB: UPDATE users SET phone=yeni_numara, phone_verified=false
    API->>DB: INSERT otp_verifications (user_id, channel=sms, purpose=phone_verification)
    API->>SMS: OTP gönder
    API-->>K: 200 OK {message: "SMS doğrulama kodu gönderildi"}

    K->>API: POST /v1/auth/verify-phone {code}
    API->>API: Rate limit kontrolü (5 istek / 1 saat)
    API->>DB: otp_verifications kontrol (channel=sms, purpose=phone_verification)
    alt OTP hatalı (maks 3 deneme)
        API->>DB: attempt_count++
        API-->>K: 400 Bad Request — AUTH_OTP_INVALID
    end
    API->>DB: UPDATE users SET phone_verified=true
    API->>DB: UPDATE otp_verifications SET used_at=now()
    API-->>K: 200 OK {message: "Telefon numarası doğrulandı"}
```

---

## 6. Çıkış Akışı (Logout → Token İptal)

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL

    K->>API: POST /v1/auth/logout
    Note over K,API: Authorization: Bearer <access_token> header'ı gerekli
    API->>API: JWT doğrulama
    API->>DB: sessions tablosunda mevcut refresh token'ı bul
    API->>DB: UPDATE sessions SET revoked_at=now()
    API->>DB: INSERT audit_logs (event_type=logout)
    API-->>K: 204 No Content
    Note over K,API: Client tarafında httpOnly cookie temizlenir
```

---

## 7. Rate Limit Aşımı Durumu

```mermaid
sequenceDiagram
    actor K as Kullanıcı
    participant API as Heka API
    participant DB as PostgreSQL

    K->>API: POST /v1/auth/login (11. deneme, 15 dakika içinde)
    API->>DB: rate_limit_logs kontrol (identifier=IP+email, action_type=login)
    DB-->>API: attempt_count=10, blocked_until=NULL
    API->>DB: UPDATE rate_limit_logs SET attempt_count=11, blocked_until=now()+30min
    API-->>K: 429 Too Many Requests
    Note over API,K: Header: X-RateLimit-Limit: 10
    Note over API,K: Header: X-RateLimit-Remaining: 0
    Note over API,K: Header: X-RateLimit-Reset: 1748123456
    Note over API,K: Header: Retry-After: 1800

    Note over K: 30 dakika sonra...
    K->>API: POST /v1/auth/login
    API->>DB: rate_limit_logs kontrol (blocked_until < now())
    Note over API,DB: Bloke süresi geçti, istek işleniyor
    API-->>K: Normal akış devam eder
```

---

## Genel Güvenlik Notları

| Durum | Davranış |
|---|---|
| Var olmayan e-posta ile login | Mevcut hesapla aynı hata mesajı (enumeration önleme) |
| Var olmayan e-posta ile forgot-password | Sahte başarı yanıtı |
| Doğrulanmamış e-posta ile login | 403 döner; doğrulama tamamlanması istenir |
| Devre dışı hesapla login | 403 döner; genel mesaj |
| Şüpheli token rotation (eski token tekrar kullanımı) | Tüm kullanıcı oturumları iptal edilir |
