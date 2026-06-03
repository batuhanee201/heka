# Admin Modülü — Endpoint Referansı

> Tüm endpoint'ler yalnızca `admin` rolüne sahip kullanıcılar tarafından erişilebilir. `manager` ve `viewer` rolleri bu endpoint'lere erişemez; `403 Forbidden` alır.

## Endpoint Özet Tablosu

| Method | Path | Açıklama | Kimlik Doğrulama | Rol | Rate Limit |
|---|---|---|---|---|---|
| GET    | /v1/admin/users | Kullanıcı listesi | Evet | admin | 60/dk |
| GET    | /v1/admin/users/:id | Kullanıcı detayı | Evet | admin | 60/dk |
| PATCH  | /v1/admin/users/:id | Kullanıcıyı güncelle | Evet | admin | 30/dk |
| DELETE | /v1/admin/users/:id | Kullanıcıyı sil (soft) | Evet | admin | 30/dk |
| POST   | /v1/admin/users/:id/roles | Kullanıcıya rol ata | Evet | admin | 30/dk |
| DELETE | /v1/admin/users/:id/roles/:roleId | Kullanıcıdan rol kaldır | Evet | admin | 30/dk |
| GET    | /v1/admin/roles | Rol listesi | Evet | admin | 60/dk |
| POST   | /v1/admin/roles | Yeni rol oluştur | Evet | admin | 30/dk |
| GET    | /v1/admin/permissions | İzin listesi | Evet | admin | 60/dk |
| GET    | /v1/admin/audit-logs | Denetim günlükleri (filtreli) | Evet | admin | 60/dk |
| GET    | /v1/admin/audit-logs/:id | Tek denetim kaydı | Evet | admin | 60/dk |

---

## GET /v1/admin/users

### Açıklama
Sistemdeki tüm kullanıcıları listeler. Soft-deleted kullanıcılar varsayılan olarak hariç tutulur.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `q` | string | Ad veya e-posta üzerinde metin arama |
| `role` | string | Rol adına göre filtrele (`admin`, `manager`, `viewer`) |
| `is_active` | boolean | Aktif/pasif filtresi |
| `email_verified` | boolean | E-posta doğrulanma durumu |
| `include_deleted` | boolean | Soft-deleted kullanıcıları da göster (varsayılan: false) |
| `sort` | string | `full_name`, `-full_name`, `created_at`, `-created_at`, `last_login_at`, `-last_login_at` |
| `limit` | integer | Varsayılan: 20, maks: 100 |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her kullanıcı için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `email` | string | E-posta |
| `full_name` | string | Ad soyad |
| `phone` | string\|null | Telefon |
| `email_verified` | boolean | E-posta doğrulandı mı |
| `phone_verified` | boolean | Telefon doğrulandı mı |
| `is_active` | boolean | Hesap aktif mi |
| `roles` | array | Atanmış roller (id, name) |
| `last_login_at` | string\|null | Son giriş |
| `created_at` | string | Kayıt tarihi |
| `deleted_at` | string\|null | Silinme tarihi |

---

## GET /v1/admin/users/:id

### Açıklama
Tek kullanıcının detaylı bilgilerini döner; aktif oturumlar dahil.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `include` | string | `sessions`, `roles`, `permissions` (virgülle ayrılmış) |

### Başarılı Yanıt — 200 OK

Kullanıcı nesnesi (liste formatına ek olarak):

| Alan | Tip | Açıklama |
|---|---|---|
| `sessions` | array\|null | `include=sessions` istenirse aktif oturumlar |
| `permissions` | array\|null | `include=permissions` istenirse atanmış tüm izinler (roller üzerinden) |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | ADMIN_USER_NOT_FOUND | Kullanıcı bulunamadı |

---

## PATCH /v1/admin/users/:id

### Açıklama
Kullanıcı bilgilerini ve durumunu günceller.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `full_name` | string | Hayır | Yeni ad soyad |
| `is_active` | boolean | Hayır | Hesabı etkinleştir/devre dışı bırak |
| `email_verified` | boolean | Hayır | E-posta doğrulanma durumunu yönet |
| `phone_verified` | boolean | Hayır | Telefon doğrulanma durumunu yönet |

### Başarılı Yanıt — 200 OK

Güncellenmiş kullanıcı nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | ADMIN_CANNOT_DEACTIVATE_SELF | Admin kendi hesabını devre dışı bırakamaz |
| 404 | ADMIN_USER_NOT_FOUND | Kullanıcı bulunamadı |
| 422 | VALIDATION_FAILED | Geçersiz değer |

### İş Kuralları

- `is_active = false` yapılan kullanıcının tüm aktif oturumları iptal edilir.
- E-posta ve şifre bu endpoint üzerinden değiştirilemez.
- Tüm değişiklikler audit_logs'a yazılır.

---

## DELETE /v1/admin/users/:id

### Açıklama
Kullanıcıyı soft-delete ile siler.

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | ADMIN_CANNOT_DELETE_SELF | Admin kendi hesabını silemez |
| 404 | ADMIN_USER_NOT_FOUND | Kullanıcı bulunamadı |

### İş Kuralları

- `deleted_at` doldurulur; kullanıcının tüm aktif oturumları iptal edilir.
- Kullanıcının `user_roles` kayıtları korunur (tarihsel referans için).
- Silinen kullanıcının yüklediği dosyalar korunur; orphan kontrolü yapılmaz.
- Silme işlemi audit_logs'a yazılır.

---

## POST /v1/admin/users/:id/roles

### Açıklama
Kullanıcıya bir veya birden fazla rol atar.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `role_ids` | array of strings | Evet | Atanacak rol UUID'leri |

### Başarılı Yanıt — 200 OK

| Alan | Tip | Açıklama |
|---|---|---|
| `data.assigned` | array | Başarıyla atanan roller (id, name) |
| `data.already_assigned` | array | Zaten atanmış olan roller |

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | ADMIN_USER_NOT_FOUND | Kullanıcı bulunamadı |
| 404 | ADMIN_ROLE_NOT_FOUND | Geçersiz role_id |

### İş Kuralları

- Zaten atanmış roller hata üretmez; `already_assigned` listesinde döner.
- Her rol ataması audit_logs'a yazılır (assigned_by = isteği yapan admin).

---

## DELETE /v1/admin/users/:id/roles/:roleId

### Açıklama
Kullanıcıdan belirli bir rolü kaldırır.

### Path Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `id` | string | Kullanıcı UUID |
| `roleId` | string | Kaldırılacak rol UUID |

### Başarılı Yanıt — 204 No Content

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 400 | ADMIN_LAST_ADMIN_ROLE | Sistemdeki son admin'in admin rolü kaldırılamaz |
| 404 | ADMIN_USER_NOT_FOUND | Kullanıcı bulunamadı |
| 404 | ADMIN_USER_ROLE_NOT_FOUND | Bu rol kullanıcıda atanmış değil |

### İş Kuralları

- Sistemde en az bir admin kullanıcı bulunmalıdır; son admin'in admin rolü kaldırılamaz.
- Rol kaldırma audit_logs'a yazılır.

---

## GET /v1/admin/roles

### Açıklama
Sistemdeki tüm rolleri izin listesiyle birlikte döner.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `include` | string | `permissions` — her role ait izinleri dahil et |

### Başarılı Yanıt — 200 OK

`data` dizisi her rol için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Rol adı |
| `description` | string\|null | Açıklama |
| `is_system` | boolean | Sistem rolü mü (silinemez) |
| `user_count` | integer | Bu role sahip aktif kullanıcı sayısı |
| `permissions` | array\|null | `include=permissions` istenirse |
| `created_at` | string | Oluşturma tarihi |

---

## POST /v1/admin/roles

### Açıklama
Yeni özel rol oluşturur.

### Request Body

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | Evet | Rol adı (tekil, 2-50 karakter) |
| `description` | string | Hayır | Rol açıklaması |
| `permission_ids` | array of strings | Hayır | Başlangıçta atanacak izin UUID'leri |

### Başarılı Yanıt — 201 Created

Oluşturulan rol nesnesi.

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 409 | ADMIN_ROLE_NAME_EXISTS | Bu isimde rol zaten var |
| 422 | VALIDATION_FAILED | Girdi hatası |

---

## GET /v1/admin/permissions

### Açıklama
Sistemdeki tüm izin tanımlarını listeler.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `module` | string | Modül bazlı filtrele (`auth`, `product`, `catalog`, `files`) |

### Başarılı Yanıt — 200 OK

`data` dizisi her izin için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `code` | string | İzin kodu (örn: `product.create`) |
| `description` | string\|null | Açıklama |
| `module` | string | Ait olduğu modül |
| `created_at` | string | Oluşturma tarihi |

---

## GET /v1/admin/audit-logs

### Açıklama
Sistem genelindeki denetim günlüklerini filtreli ve sayfalı olarak listeler.

### Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `category` | string | Olay kategorisi — `auth`, `product`, `catalog`, `files`, `admin` |
| `event_type` | string | Belirli olay tipi (örn: `login`, `product.create`, `role.assign`) |
| `user_id` | string | İşlemi yapan kullanıcı UUID |
| `entity_type` | string | Etkilenen kayıt tipi (`product`, `catalog`, `user` vs.) |
| `entity_id` | string | Etkilenen kayıt UUID |
| `ip_address` | string | İşlemin yapıldığı IP adresi |
| `from` | string | Başlangıç tarihi (ISO 8601, örn: `2026-01-01T00:00:00Z`) |
| `to` | string | Bitiş tarihi |
| `sort` | string | Varsayılan: `-created_at` (en yeni önce) |
| `limit` | integer | Varsayılan: 50, maks: 100 |
| `after` | string | Cursor |

### Başarılı Yanıt — 200 OK

`data` dizisi her log için:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | UUID |
| `user_id` | string\|null | İşlemi yapan kullanıcı |
| `user_email` | string\|null | Kullanıcı e-postası (join) |
| `event_type` | string | Olay tipi |
| `entity_type` | string\|null | Etkilenen kayıt tipi |
| `entity_id` | string\|null | Etkilenen kayıt UUID |
| `old_data` | object\|null | Değişiklik öncesi veri |
| `new_data` | object\|null | Değişiklik sonrası veri |
| `ip_address` | string\|null | IP adresi |
| `user_agent` | string\|null | Tarayıcı/uygulama |
| `created_at` | string | Olay zamanı |

### İş Kuralları

- Audit log kayıtları değiştirilemez ve silinemez (immutable).
- `old_data` ve `new_data` hassas alanlar maskelenmiş olarak döner (şifre hash, token hash vs.).
- Tarih aralığı sorguları için index kullanılır; aralık 90 günü aşan sorgular sayfalama ile çalışmalıdır.

---

## GET /v1/admin/audit-logs/:id

### Açıklama
Tek denetim günlüğü kaydını tam detayıyla döner.

### Başarılı Yanıt — 200 OK

Audit log nesnesi (liste formatıyla aynı; `old_data` ve `new_data` tam içerikle).

### Hata Yanıtları

| HTTP | Kod | Açıklama |
|---|---|---|
| 404 | ADMIN_AUDIT_LOG_NOT_FOUND | Kayıt bulunamadı |
