# Audit Modulu — Olay Kayitlari Tablosu

## Modül Genel Bakis

Audit modulu; sistemde gerceklesen kritik tum olaylarin degismez, kronolojik ve sorgulanabilir kaydini tutar. Bu kayitlar; guvenlik denetimleri, sorun tespiti, uyumluluk gereksinimleri ve degisiklik gecmisi ihtiyaclarini karsilar.

Audit loglari yazilabilir ancak **guncellenmez ve silinemez**. Bu, loglarin butunlugunun korunmasi icin temel bir kuraldur.

---

## Tablo: `audit_logs`

### Amac

Asagidaki olay kategorilerini tek, tutarli bir yapida saklar:
- Kimlik dogrulama olaylari (login, logout, sifre degisikligi)
- Veri degisiklikleri (INSERT, UPDATE, DELETE)
- Yetkilendirme degisiklikleri (rol atama/kaldirma, izin degisikligi)
- Dosya islemleri (yukleme, silme)
- Guvenlik olaylari (basarisiz giris, bloke edilen IP, OTP hatasi)

### Kolonlar

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NULLABLE FK → users.id ON DELETE SET NULL` | Olayı tetikleyen kullanici (sistem olaylarinda NULL olabilir) |
| `actor_type` | `TEXT` | `NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user','system','api'))` | Olayı tetikleyen aktör tipi |
| `event_type` | `TEXT` | `NOT NULL` | Olay tipi kodu (bkz. Olay Tipleri tablosu) |
| `event_category` | `TEXT` | `NOT NULL CHECK (event_category IN ('auth','data','permission','file','security','system'))` | Olayın üst kategorisi |
| `entity_type` | `TEXT` | `NULLABLE` | Etkilenen varlık tipi (ornegin: `product`, `user`, `catalog`) |
| `entity_id` | `UUID` | `NULLABLE` | Etkilenen varlığin ID'si |
| `old_data` | `JSONB` | `NULLABLE` | Degisiklik oncesi veri goruntusu (UPDATE/DELETE icin) |
| `new_data` | `JSONB` | `NULLABLE` | Degisiklik sonrasi veri goruntusu (INSERT/UPDATE icin) |
| `metadata` | `JSONB` | `NULLABLE` | Olaya ozgu ek bilgiler (basarisiz giris sebebi, reddedilen izin kodu, vb.) |
| `ip_address` | `INET` | `NULLABLE` | Istegin kaynak IP adresi |
| `user_agent` | `TEXT` | `NULLABLE` | HTTP User-Agent string |
| `request_id` | `TEXT` | `NULLABLE` | Takip icin istek izleme kimligi (correlation ID) |
| `severity` | `TEXT` | `NOT NULL DEFAULT 'info' CHECK (severity IN ('debug','info','warning','error','critical'))` | Olay onemi seviyesi |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Olay zamani (UTC) |

### Onemli Kural: Degismezlik

- `audit_logs` tablosunda `UPDATE` ve `DELETE` islemleri **yasaktir**.
- RLS politikasi yalnizca INSERT'e izin verir; hic kimse guncelleme veya silme yapamaz.
- Uzun vadeli depolama icin partitioning veya harici SIEM entegrasyonu planlanmalidir.

---

## Olay Tipleri

### auth Kategorisi

| `event_type` | Aciklama |
|---|---|
| `auth.login.success` | Basarili giris |
| `auth.login.failed` | Basarisiz giris denemesi |
| `auth.logout` | Kullanici cikisi |
| `auth.password.changed` | Sifre degistirme |
| `auth.password.reset_requested` | Sifre sifirlama talebi |
| `auth.email.verified` | E-posta dogrulandi |
| `auth.phone.verified` | Telefon dogrulandi |
| `auth.otp.sent` | OTP gonderildi |
| `auth.otp.verified` | OTP dogrulandi |
| `auth.otp.failed` | Yanlis OTP girildi |
| `auth.account.locked` | Hesap kilitlendi (cok fazla hata) |
| `auth.session.revoked` | Oturum iptal edildi |

### data Kategorisi

| `event_type` | Aciklama |
|---|---|
| `data.product.created` | Urun olusturuldu |
| `data.product.updated` | Urun guncellendi |
| `data.product.deleted` | Urun soft-delete yapildi |
| `data.product.restored` | Urun soft-delete geri alindi |
| `data.catalog.created` | Katalog olusturuldu |
| `data.catalog.updated` | Katalog guncellendi |
| `data.catalog.deleted` | Katalog silindi |
| `data.pricing.created` | Fiyat tanimi olusturuldu |
| `data.pricing.updated` | Fiyat guncellendi |
| `data.user.created` | Kullanici olusturuldu |
| `data.user.updated` | Kullanici profili guncellendi |
| `data.user.deactivated` | Kullanici devre disi birakildi |

### permission Kategorisi

| `event_type` | Aciklama |
|---|---|
| `permission.role.assigned` | Kullaniciya rol atandi |
| `permission.role.revoked` | Kullanicidan rol kaldirildi |
| `permission.role.created` | Yeni rol olusturuldu |
| `permission.role.deleted` | Rol silindi |
| `permission.grant.added` | Role izin eklendi |
| `permission.grant.removed` | Rolden izin kaldirildi |

### file Kategorisi

| `event_type` | Aciklama |
|---|---|
| `file.uploaded` | Dosya yuklendi |
| `file.deleted` | Dosya silindi |
| `file.relation.created` | Dosya bir kayda baglandi |
| `file.relation.removed` | Dosya iliskisi kaldirildi |

### security Kategorisi

| `event_type` | Aciklama |
|---|---|
| `security.rate_limit.blocked` | IP veya kullanici rate limit nedeniyle blokelendi |
| `security.unauthorized_access` | Yetkisiz erisim girisimi |
| `security.suspicious_activity` | Suphelie aktivite tespit edildi |

---

## Veri Hassasiyeti

`old_data` ve `new_data` alanlarinda hassas bilgiler **asla saklanmaz**:
- `password_hash`, `refresh_token_hash`, `code_hash` gibi gizli alanlar log'a yazilmadan once maskelenir.
- Maskeleme kurali: ilgili alan `"***REDACTED***"` degeriyle log'a yazilir.

---

## Iliskiler

- `audit_logs.user_id` → `users.id` (ON DELETE SET NULL — kullanici silinse de log korunur)
- `entity_type` + `entity_id` polimorfik referans (FK zorunlulugu yok; esneklik saglar)

---

## RLS Politikalari

- INSERT: `authenticated` (service role araciligiyla) yazabilir.
- SELECT: `admin` tum kayitlari okuyabilir; `manager` yalnizca `event_category IN ('data','file')` kayitlarini okuyabilir.
- UPDATE: Hic kimse guncelleme yapamaz.
- DELETE: Hic kimse silemez.
- `security` ve `auth` kategorisindeki loglar yalnizca `admin` tarafindan okunabilir.

---

## Index Onerileri

| Index | Tip | Gerekcesi |
|---|---|---|
| `idx_audit_logs_user_id` | B-tree | Kullaniciya gore olay gecmisi |
| `idx_audit_logs_event_type` | B-tree | Olay tipine gore filtreleme |
| `idx_audit_logs_event_category` | B-tree | Kategori bazli listeleme |
| `idx_audit_logs_entity` | B-tree (entity_type, entity_id) | Belirli bir varlığin degisiklik gecmisi |
| `idx_audit_logs_created_at` | B-tree | Zaman araligina gore filtreleme |
| `idx_audit_logs_severity` | B-tree (partial: `severity IN ('warning','error','critical')`) | Kritik olaylarin hizli sorgulanmasi |
| `idx_audit_logs_ip_address` | B-tree | IP bazli guvenlik sorgulari |

---

## Partitioning Stratejisi

Tablo buyumesine karsi uzun vadede asagidaki yaklasim onerilir:
- `created_at` kolonu uzerinden **aylik range partitioning** uygulanir.
- Her ay icin yeni bir partition otomatik olusturulur.
- 12-24 aydan eski veriler cold storage veya harici log yonetim sistemine (SIEM) tasınır.
- Bu sayede sorgu performansi korunur ve yedekleme maliyeti azalir.

---

## Ornek Veri

### Basarili Login Olayı

| Alan | Deger |
|---|---|
| `user_id` | (Ali Kaya kullanici ID) |
| `actor_type` | `user` |
| `event_type` | `auth.login.success` |
| `event_category` | `auth` |
| `entity_type` | `user` |
| `entity_id` | (Ali Kaya kullanici ID) |
| `ip_address` | `195.168.1.10` |
| `severity` | `info` |

### Urun Guncelleme Olayı

| Alan | Deger |
|---|---|
| `user_id` | (manager kullanici ID) |
| `actor_type` | `user` |
| `event_type` | `data.product.updated` |
| `event_category` | `data` |
| `entity_type` | `product` |
| `entity_id` | (ERD-266 urun ID) |
| `old_data` | `{"status": "draft"}` |
| `new_data` | `{"status": "active"}` |
| `severity` | `info` |
