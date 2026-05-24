# Auth Modulu — Kimlik Dogrulama ve Yetkilendirme Tablolari

## Module Genel Bakis

Auth modulu; kullanici yonetimi, rol ve izin sistemi, oturum yonetimi, OTP dogrulama ve rate limiting tablolarini kapsar. Supabase Auth ile entegre calisir; Supabase'in kendi `auth.users` tablosu kimlik dogrulama islemlerini yonetirken, bu moduldeki `users` tablosu uygulama duzeyinde genisletilmis profil ve yetkilendirme bilgilerini tutar.

---

## Tablo: `users`

### Amac

Sisteme kayitli kullanicilarin uygulama duzeyindeki profil bilgilerini ve durum bilgilerini tutar. Supabase Auth'taki `auth.users` kaydina `supabase_auth_id` ile eslestirilerek baglaniir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Uygulama duzeyinde birincil anahtar |
| `supabase_auth_id` | `UUID` | `NOT NULL UNIQUE` | Supabase Auth'taki kullanici ID'si |
| `email` | `TEXT` | `NOT NULL UNIQUE` | Kullanici e-posta adresi (dogrulanmis olmasi gerekir) |
| `phone` | `TEXT` | `UNIQUE NULLABLE` | Telefon numarasi (E.164 formati, ornegin +905001234567) |
| `full_name` | `TEXT` | `NOT NULL` | Gosterim adi |
| `password_hash` | `TEXT` | `NOT NULL` | Argon2id ile hashlenmiş sifre (Supabase Auth sifresine ek, ozel auth akislari icin) |
| `email_verified` | `BOOLEAN` | `NOT NULL DEFAULT false` | E-posta dogrulamasi tamamlandi mi? |
| `phone_verified` | `BOOLEAN` | `NOT NULL DEFAULT false` | Telefon dogrulamasi tamamlandi mi? |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Hesap aktif mi? (admin tarafindan devre disi birakilabilir) |
| `last_login_at` | `TIMESTAMPTZ` | `NULLABLE` | Son basarili giris zamani |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Hesap olusturma zamani |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Son guncelleme zamani |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete zamani |

### Iliskiler

- `users.id` → `user_roles.user_id` (bire-cok)
- `users.id` → `sessions.user_id` (bire-cok)
- `users.id` → `otp_verifications.user_id` (bire-cok)
- `users.id` → `files.uploaded_by` (bire-cok)
- `users.id` → `audit_logs.user_id` (bire-cok)

### Unique Constraint Notu

`email` ve `phone` kolonlarinda `WHERE deleted_at IS NULL` filtreli partial unique index kullanilir; bu sayede silinmis hesaplar unique kisitlamanin disinda kalir.

### RLS Politikalari

- `authenticated` rol yalnizca kendi kaydini okuyabilir ve guncelleyebilir.
- `admin` rolu tum kayitlari okuyabilir, guncelleyebilir ve soft-delete uygulayabilir.
- Hicbir rol baska bir kullanicinin `password_hash` alanini okuyamaz (kolon duzeyinde kisitlama veya view ile gizlenir).
- `public` rol erisimi tamamen kapatilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_users_email` | B-tree (partial: `deleted_at IS NULL`) | Login sorgularinda e-posta ile arama |
| `idx_users_supabase_auth_id` | B-tree UNIQUE | Supabase Auth callback'lerinde hizli eslestirme |
| `idx_users_phone` | B-tree (partial: `deleted_at IS NULL`) | SMS dogrulama akislarinda telefon ile arama |
| `idx_users_is_active` | B-tree (partial: `is_active = true`) | Aktif kullanici listelerinde filtreleme |

### Ornek Veri

| Alan | Deger |
|---|---|
| `id` | `a1b2c3d4-...` |
| `email` | `ali.kaya@firma.com` |
| `phone` | `+905001234567` |
| `full_name` | `Ali Kaya` |
| `email_verified` | `true` |
| `phone_verified` | `true` |
| `is_active` | `true` |

---

## Tablo: `roles`

### Amac

Sistemdeki rolleri tanimlar. Roller, izinlerin gruplandirildigi birimlerdir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL UNIQUE` | Rol adi (ornegin: admin, manager, viewer) |
| `description` | `TEXT` | `NULLABLE` | Rolun ne ise yaradigi |
| `is_system` | `BOOLEAN` | `NOT NULL DEFAULT false` | Sistem tarafindan olusturulan ve silinemez roller |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Oneri Gelen Roller

| Rol | Aciklama |
|---|---|
| `admin` | Tam sistem erisimi |
| `manager` | Urun/katalog yonetimi, kullanici okuma |
| `viewer` | Yalnizca okuma erisimi |
| `public` | Kimlik dogrulamasi olmadan erisilen kaynaklar |

### RLS Politikalari

- `authenticated` tum rolleri okuyabilir.
- `admin` rol olusturabilir, guncelleyebilir; `is_system = true` kayitlari silemez.

---

## Tablo: `permissions`

### Amac

Atomik is eylemleri bazinda izin tanimlarini tutar.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `code` | `TEXT` | `NOT NULL UNIQUE` | `{modul}.{eylem}` formati (ornegin: `product.create`) |
| `description` | `TEXT` | `NULLABLE` | Iznin aciklamasi |
| `module` | `TEXT` | `NOT NULL` | Hangi modüle ait (product, catalog, files, auth) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Ornek Izin Kodlari

| Kod | Aciklama |
|---|---|
| `product.create` | Urun olusturma |
| `product.read` | Urun okuma |
| `product.update` | Urun guncelleme |
| `product.delete` | Urun soft-delete |
| `catalog.create` | Katalog olusturma |
| `catalog.read` | Katalog okuma |
| `files.upload` | Dosya yukleme |
| `files.delete` | Dosya silme |
| `auth.manage_users` | Kullanici yonetimi |

### RLS Politikalari

- `authenticated` tum izinleri okuyabilir.
- `admin` izin olusturabilir; sistemde tanimli izinler korunur.

---

## Tablo: `user_roles`

### Amac

Kullanici ile rol arasindaki coka-cok iliskiyi tutar.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `user_id` | `UUID` | `NOT NULL FK → users.id` | |
| `role_id` | `UUID` | `NOT NULL FK → roles.id` | |
| `assigned_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Rol atama zamani |
| `assigned_by` | `UUID` | `NULLABLE FK → users.id` | Rol atayan kullanici |

`PRIMARY KEY (user_id, role_id)` — composite PK.

### RLS Politikalari

- `admin` ekleyebilir, silebilir.
- `authenticated` yalnizca kendi user_id'sini iceren satirlari okuyabilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_user_roles_user_id` | B-tree | Kullanicinin rollerini sorgularken |
| `idx_user_roles_role_id` | B-tree | Role sahip kullanicilari listelerken |

---

## Tablo: `role_permissions`

### Amac

Rol ile izin arasindaki coka-cok iliskiyi tutar.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `role_id` | `UUID` | `NOT NULL FK → roles.id` | |
| `permission_id` | `UUID` | `NOT NULL FK → permissions.id` | |
| `granted_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `granted_by` | `UUID` | `NULLABLE FK → users.id` | |

`PRIMARY KEY (role_id, permission_id)` — composite PK.

### RLS Politikalari

- `admin` ekleyebilir, silebilir.
- `authenticated` okuyabilir (izin sorgulama icin).

---

## Tablo: `sessions`

### Amac

Aktif kullanici oturumlarini, refresh token'lari ve oturum surelerini yonetir.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NOT NULL FK → users.id ON DELETE CASCADE` | |
| `refresh_token_hash` | `TEXT` | `NOT NULL UNIQUE` | Refresh token'in argon2id hashli hali |
| `device_info` | `JSONB` | `NULLABLE` | Cihaz adi, isletim sistemi, tarayici bilgisi |
| `ip_address` | `INET` | `NULLABLE` | Oturumun baslatildigi IP adresi |
| `user_agent` | `TEXT` | `NULLABLE` | HTTP User-Agent string |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Refresh token gecerlilik sonu |
| `last_active_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Son aktivite zamani |
| `revoked_at` | `TIMESTAMPTZ` | `NULLABLE` | Manuel iptal zamani (logout, admin aksiyonu) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Oturum Yonetimi Kurallari

- Refresh token suresi: 30 gun (yapilandirilabilir).
- Access token suresi: 15 dakika.
- `expires_at` gecmis veya `revoked_at` dolu satirlar gecersiz oturum sayilir.
- Kullanici sifresini degistirdiginde tum aktif oturumlari iptal edilir.
- Temizlik islemi: Surecli gecmis oturumlar periyodik job ile fiziksel olarak silinebilir (audit log'a yazildiktan sonra).

### RLS Politikalari

- `authenticated` yalnizca kendi `user_id`'sine ait oturumlari okuyabilir.
- `admin` tum oturumlari okuyabilir ve iptal edebilir.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_sessions_user_id` | B-tree | Kullanicinin aktif oturumlarini sorgularken |
| `idx_sessions_refresh_token_hash` | B-tree UNIQUE | Token dogrulama islemlerinde |
| `idx_sessions_expires_at` | B-tree | Gecmis oturumlar temizligi icin |

---

## Tablo: `otp_verifications`

### Amac

E-posta ve SMS kanal uzerinden gonderilen tek kullanimlik sifrelerin (OTP) dogrulama kayitlarini tutar.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NOT NULL FK → users.id ON DELETE CASCADE` | |
| `channel` | `TEXT` | `NOT NULL CHECK (channel IN ('email','sms'))` | Gonderim kanali |
| `purpose` | `TEXT` | `NOT NULL CHECK (purpose IN ('email_verification','phone_verification','password_reset','login_2fa'))` | OTP amaci |
| `code_hash` | `TEXT` | `NOT NULL` | OTP kodunun hashli hali (plain text saklanmaz) |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | OTP gecerlilik sonu (tipik 10 dakika) |
| `used_at` | `TIMESTAMPTZ` | `NULLABLE` | Basarili dogrulama zamani |
| `attempt_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Yanlis giris sayaci (3 hatada kilitlenir) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Davranis Kurallari

- Bir OTP en fazla 3 kez yanlis girilebilir; sonrasinda `attempt_count >= 3` ile bloke edilir.
- `used_at` dolu olan OTP'ler tekrar kullanilamaz.
- `expires_at` gecmis OTP'ler gecersiz sayilir.

### RLS Politikalari

- Hicbir rol OTP kodunu okuyamaz (yalnizca uygulama servis katmani erisir).
- `admin` tum kayitlari okuyabilir (denetim amacli).

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_otp_user_purpose` | B-tree (user_id, purpose) | Aktif OTP sorgusu |
| `idx_otp_expires_at` | B-tree | Gecmis OTP temizligi |

---

## Tablo: `rate_limit_logs`

### Amac

Hassas endpoint'lere yapilan istek sayisini takip eder ve kotu niyetli deneme saldirilarini (brute-force) engeller.

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `identifier` | `TEXT` | `NOT NULL` | IP adresi, kullanici ID'si veya e-posta; rate limit hedefi |
| `action_type` | `TEXT` | `NOT NULL CHECK (action_type IN ('login','otp_request','password_reset','otp_verify'))` | Hangi eylem |
| `attempt_count` | `INTEGER` | `NOT NULL DEFAULT 1` | Mevcut penceredeki deneme sayisi |
| `window_start` | `TIMESTAMPTZ` | `NOT NULL` | Rate limit penceresinin baslangic zamani |
| `blocked_until` | `TIMESTAMPTZ` | `NULLABLE` | Bu zamana kadar bloke (NULL ise bloke degil) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

### Rate Limit Kurallari

| Eylem | Pencere | Maks Deneme | Bloke Suresi |
|---|---|---|---|
| `login` | 15 dakika | 10 | 30 dakika |
| `otp_request` | 1 saat | 5 | 1 saat |
| `otp_verify` | 10 dakika | 3 | 1 saat |
| `password_reset` | 1 saat | 3 | 2 saat |

### RLS Politikalari

- Uygulama servis katmani (service role) yazabilir.
- `admin` okuyabilir.
- Hicbir `authenticated` kullanici kendi rate limit kaydini okuyamaz veya degistiremez.

### Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_rate_limit_identifier_action` | B-tree (identifier, action_type) | Her istekte rate limit kontrolu |
| `idx_rate_limit_window_start` | B-tree | Eski pencerelerin temizligi |
