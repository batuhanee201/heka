# Row Level Security (RLS) Politika Tasarimi

## Genel Prensipler

1. **Varsayilan Kapal ilık (Default Deny):** RLS aktif edilen bir tabloda, tanimlanmis bir politika kapsamina girmeyen tum erisimler otomatik olarak reddedilir.
2. **En Az Ayricalik (Least Privilege):** Her rol yalnizca isini yapabilmek icin gereken minimum erisime sahip olur.
3. **Katman Savunmasi:** RLS, API katmanindaki yetkilendirme kontrolunun ek bir koruma katmanidir; tek savunma hatti olarak tasarlanmamistir.
4. **Service Role Istisnasi:** Supabase'in `service_role` anahtari RLS'yi atlayarak calisir. Bu anahtar yalnizca guvenilir arka plan servisleri tarafindan kullanilmali, hic bir zaman istemci tarafina gonderilmemedir.

---

## Rol Tanimi

Veritabani duzeyinde asagidaki Postgres rolleri tanimlanir ve Supabase JWT `role` claim'i ile eslestirilerek kullanilir:

| Rol | Tanim |
|---|---|
| `anon` | Kimlik dogrulamasi yapilmamis, misafir erisimi |
| `authenticated` | Supabase Auth ile giris yapilmis tum kullanicilar |
| `app_admin` | Uygulama duzeyinde admin yetkisi (JWT custom claim ile belirlenir) |
| `app_manager` | Uygulama duzeyinde manager yetkisi |
| `app_viewer` | Yalnizca okuma yetkisi olan kullanici |
| `service_role` | Arka plan servisleri; RLS'yi atlar |

Uygulama rolleri JWT token icindeki `app_metadata.role` claim'inden okunur. Supabase Auth custom claims kullanilarak kullanicinin rolu token'a eklenir.

---

## Tablo Bazinda RLS Politika Tasarimi

### `users` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `users_select_own` | `authenticated` | `id = auth.uid()` (kendi kaydini gör) |
| SELECT | `users_select_admin` | `app_admin` | Kosulsuz (tum kayitlar) |
| UPDATE | `users_update_own` | `authenticated` | `id = auth.uid()` ve `deleted_at IS NULL` |
| UPDATE | `users_update_admin` | `app_admin` | `deleted_at IS NULL` |
| INSERT | `users_insert_service` | `service_role` | Yalnizca sistem kaydeder |
| DELETE | Yok | Hic kimse | Fiziksel silme yasak; soft delete UPDATE ile yapilir |

Hassas kolon kisitlamasi: `password_hash` kolonu `authenticated` sorgularinda bir VIEW veya kolonu disarda birakan bir SELECT politikasi ile gizlenir.

---

### `roles` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `roles_select_all` | `authenticated` | `deleted_at IS NULL` (yok ise tum aktifler) |
| INSERT | `roles_insert_admin` | `app_admin` | Kosulsuz |
| UPDATE | `roles_update_admin` | `app_admin` | `is_system = false` |
| DELETE | `roles_delete_admin` | `app_admin` | `is_system = false` |

---

### `permissions` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `permissions_select_auth` | `authenticated` | Kosulsuz |
| INSERT | `permissions_insert_admin` | `app_admin` | Kosulsuz |
| UPDATE | `permissions_update_admin` | `app_admin` | Kosulsuz |
| DELETE | `permissions_delete_admin` | `app_admin` | Kosulsuz |

---

### `user_roles` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `user_roles_select_own` | `authenticated` | `user_id = auth.uid()` |
| SELECT | `user_roles_select_admin` | `app_admin` | Kosulsuz |
| INSERT | `user_roles_insert_admin` | `app_admin` | Kosulsuz |
| DELETE | `user_roles_delete_admin` | `app_admin` | Kosulsuz |

---

### `role_permissions` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `role_permissions_select_auth` | `authenticated` | Kosulsuz |
| INSERT | `role_permissions_insert_admin` | `app_admin` | Kosulsuz |
| DELETE | `role_permissions_delete_admin` | `app_admin` | Kosulsuz |

---

### `sessions` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `sessions_select_own` | `authenticated` | `user_id = auth.uid()` |
| SELECT | `sessions_select_admin` | `app_admin` | Kosulsuz |
| INSERT | `sessions_insert_service` | `service_role` | Yalnizca sistem olusturur |
| UPDATE | `sessions_update_service` | `service_role` | `revoked_at IS NULL` |
| DELETE | Yok | Hic kimse | Soft revoke tercih edilir |

---

### `otp_verifications` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `otp_select_admin` | `app_admin` | Kosulsuz (denetim) |
| INSERT | `otp_insert_service` | `service_role` | Yalnizca sistem yazar |
| UPDATE | `otp_update_service` | `service_role` | Yalnizca sistem gunceller |

`authenticated` kullanicilar OTP kayitlarini okuyamaz.

---

### `rate_limit_logs` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `rate_limit_select_admin` | `app_admin` | Kosulsuz |
| INSERT | `rate_limit_insert_service` | `service_role` | Yalnizca sistem yazar |
| UPDATE | `rate_limit_update_service` | `service_role` | Yalnizca sistem gunceller |

---

### `brands` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `brands_select_auth` | `authenticated` | `deleted_at IS NULL` |
| INSERT | `brands_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `brands_update_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| DELETE | `brands_delete_admin` | `app_admin` | Soft delete (UPDATE) |

---

### `categories` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `categories_select_auth` | `authenticated` | `deleted_at IS NULL` |
| INSERT | `categories_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `categories_update_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| DELETE | `categories_delete_admin` | `app_admin` | Soft delete (UPDATE) |

---

### `products` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `products_select_viewer` | `authenticated`, `app_viewer` | `deleted_at IS NULL AND status = 'active'` |
| SELECT | `products_select_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` (taslaklar dahil) |
| SELECT | `products_select_admin_all` | `app_admin` | Kosulsuz (silinmisler dahil) |
| INSERT | `products_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `products_update_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| DELETE | `products_delete_admin` | `app_admin` | Soft delete (UPDATE) |

---

### `product_technical_details` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `ptd_select_auth` | `authenticated` | Bagli ürün aktif (`products.deleted_at IS NULL AND products.status = 'active'`) |
| SELECT | `ptd_select_manager` | `app_manager`, `app_admin` | Bagli urun aktif veya taslak |
| INSERT | `ptd_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `ptd_update_manager` | `app_manager`, `app_admin` | Kosulsuz |

---

### `product_display` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `pd_select_auth` | `authenticated` | Bagli urun aktif |
| SELECT | `pd_select_manager` | `app_manager`, `app_admin` | Kosulsuz |
| INSERT | `pd_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `pd_update_manager` | `app_manager`, `app_admin` | Kosulsuz |

---

### `catalogs` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `catalogs_select_viewer` | `authenticated` | `deleted_at IS NULL AND status = 'active'` |
| SELECT | `catalogs_select_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| INSERT | `catalogs_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `catalogs_update_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| DELETE | `catalogs_delete_admin` | `app_admin` | Soft delete |

---

### `catalog_items` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `ci_select_auth` | `authenticated` | Bagli katalog aktif |
| INSERT | `ci_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `ci_update_manager` | `app_manager`, `app_admin` | Kosulsuz |
| DELETE | `ci_delete_manager` | `app_manager`, `app_admin` | Kosulsuz |

---

### `pricing` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `pricing_select_auth` | `authenticated` | Bagli urun aktif; `valid_from <= now() <= valid_to` veya tarih NULL |
| SELECT | `pricing_select_manager` | `app_manager`, `app_admin` | Kosulsuz |
| INSERT | `pricing_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| UPDATE | `pricing_update_admin` | `app_admin` | Kosulsuz |

`anon` ve `public` role fiyat verisi gosterilmez.

---

### `files` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `files_select_public` | `anon`, `authenticated` | `is_public = true AND deleted_at IS NULL` |
| SELECT | `files_select_own` | `authenticated` | `uploaded_by = auth.uid() AND deleted_at IS NULL` |
| SELECT | `files_select_manager` | `app_manager`, `app_admin` | `deleted_at IS NULL` |
| INSERT | `files_insert_auth` | `authenticated` | Kosulsuz (Storage bucket politikalari ek kontrol yapar) |
| UPDATE | `files_update_own` | `authenticated` | `uploaded_by = auth.uid()` |
| DELETE | `files_delete_own` | `authenticated` | `uploaded_by = auth.uid()` (soft delete) |
| DELETE | `files_delete_admin` | `app_admin` | Kosulsuz (soft delete) |

---

### `file_relations` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `fr_select_auth` | `authenticated` | Bagli dosyaya erisimi olan kullanici |
| INSERT | `fr_insert_manager` | `app_manager`, `app_admin` | Kosulsuz |
| DELETE | `fr_delete_manager` | `app_manager`, `app_admin` | Kosulsuz |

---

### `audit_logs` Tablosu

| Islem | Politika Adi | Izin Verilen Roller | Kosul |
|---|---|---|---|
| SELECT | `audit_select_admin` | `app_admin` | Kosulsuz |
| SELECT | `audit_select_manager_data` | `app_manager` | `event_category IN ('data','file')` |
| INSERT | `audit_insert_service` | `service_role` | Yalnizca sistem yazar |
| UPDATE | Yok | Hic kimse | Mutlak yasak |
| DELETE | Yok | Hic kimse | Mutlak yasak |

---

## Rol Bazli Erisim Matrisi (Ozet)

| Tablo | anon | authenticated/viewer | app_manager | app_admin |
|---|---|---|---|---|
| `users` | - | Kendi kaydı | - | Tam |
| `roles` | - | Okuma | Okuma | Tam |
| `permissions` | - | Okuma | Okuma | Tam |
| `user_roles` | - | Kendi satirlari | - | Tam |
| `role_permissions` | - | Okuma | Okuma | Tam |
| `sessions` | - | Kendi oturumlari | - | Tam |
| `otp_verifications` | - | - | - | Okuma |
| `rate_limit_logs` | - | - | - | Okuma |
| `brands` | - | Okuma | Yaz/Güncelle | Tam |
| `categories` | - | Okuma | Yaz/Güncelle | Tam |
| `products` | - | Aktif/Okuma | Taslak dahil/Yaz | Tam |
| `product_technical_details` | - | Aktif/Okuma | Yaz/Güncelle | Tam |
| `product_display` | - | Aktif/Okuma | Yaz/Güncelle | Tam |
| `catalogs` | - | Aktif/Okuma | Yaz/Güncelle | Tam |
| `catalog_items` | - | Aktif/Okuma | Yaz/Sil | Tam |
| `pricing` | - | Aktif/Okuma | Yaz | Tam |
| `files` | Sadece public | Public+Kendi | Yaz/Güncelle | Tam |
| `file_relations` | - | Okuma | Yaz/Sil | Tam |
| `audit_logs` | - | - | data/file Okuma | Tam |
