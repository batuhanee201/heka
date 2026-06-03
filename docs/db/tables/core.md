# Core Modul — Ortak Kurallar ve Standartlar

## Amac

`core` modulu fiziksel bir tablo grubundan cok bir **sozlesme ve standart seti**dir. Tum ana tablolarin uymasi gereken tasarim kurallarini, kolon sozlesmelerini ve davranis beklentilerini tanimlar. Bu dokuman, yeni bir tablo olusturulurken referans alinmalidir.

---

## 1. Primary Key Stratejisi — UUID v4

### Kural

Tum ana tablolarda primary key olarak `UUID v4` kullanilir. PostgreSQL'in yerlesik `gen_random_uuid()` fonksiyonu bu amac icin yeterlidir.

### Kolon Tanimi

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Her satirda otomatik benzersiz kimlik |

### Gerekceler

- Siralanan integer ID'lerin aksine UUID, kayit sayisini veya siralamayi ifsa etmez (enumeration saldirilarini zorlestirir).
- Dagitik veya coklu kaynak ortamlarinda ID catismasi olmadan veri birlestirme yapilabilir.
- Supabase Auth kullanici ID'siyle tip uyumu saglar.

---

## 2. Soft Delete Mekanizmasi

### Kural

Kayitlar veritabanindan fiziksel olarak silinmez. Bunun yerine `deleted_at` kolonu doldurulur.

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `deleted_at` | `TIMESTAMPTZ` | `NULL` (varsayilan) | NULL: kayit aktif. Dolu: silinmis ve silinme zamani. |

### Davranis Kurallari

- Uygulama katmani ve RLS politikalari, normal sorgularda `deleted_at IS NULL` filtresi uygular.
- Silinen kayitlara erisim yalnizca admin rolü tarafindan ve ozel sorgularla mumkundur.
- Fiziksel silme (hard delete) yalnizca veri tutma politikasi (data retention) kapsaminda ve ayri bir temizlik sureci ile yapilir.
- Bir kayit silindiginde `audit_logs` tablosuna `DELETE` olayi yazilir.

---

## 3. Zaman Damgasi Sozlesmesi

Tum ana tablolarda asagidaki iki kolon zorunludur:

| Kolon | Tip | Constraint | Aciklama |
|---|---|---|---|
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Kayit ilk olusturulma zamani |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Son guncelleme zamani; trigger ile otomatik guncellenir |

### Guncelleme Triggeri

Her tablo icin ayri bir trigger tanimlanmaz. Bunun yerine tek bir `set_updated_at()` fonksiyonu olusturulur ve ilgili tablolara uygulanir. Bu fonksiyon herhangi bir UPDATE isleminde `updated_at = now()` degerini otomatik olarak atar.

---

## 4. Ortak Kolon Sozlesmesi

Her tabloda asagidaki alanlar bulunmali veya en azindan degerlendirilmelidir:

| Kolon | Tip | Zorunlu mu? | Aciklama |
|---|---|---|---|
| `id` | `UUID` | Evet | Primary key |
| `created_at` | `TIMESTAMPTZ` | Evet | Olusturma zamani |
| `updated_at` | `TIMESTAMPTZ` | Evet | Guncelleme zamani |
| `deleted_at` | `TIMESTAMPTZ` | Veri tabanlari icin evet | Soft delete zamani |
| `created_by` | `UUID` (FK → users) | Icerik tablolari icin onerilir | Kaydi olusturan kullanici |
| `updated_by` | `UUID` (FK → users) | Icerik tablolari icin onerilir | Son guncelleyen kullanici |

---

## 5. Null ve Default Degerleri

- Zorunlu iş alanları `NOT NULL` ile isaretlenir.
- Opsiyonel alanlar `NULL` kalabilir; ancak bos string (`''`) depolanmaz, `NULL` tercih edilir.
- Boolean alanlar icin `DEFAULT false` veya `DEFAULT true` acikca belirtilir.
- Zaman alanlari `DEFAULT now()` ile olusturulur.

---

## 6. Isimlendirme Konvansiyonu

| Eleman | Kural | Ornek |
|---|---|---|
| Tablo adi | `snake_case`, cogul | `product_technical_details` |
| Kolon adi | `snake_case` | `color_temp_k` |
| Index adi | `idx_{tablo}_{kolon(lar)}` | `idx_products_brand_id` |
| FK constraint | `fk_{tablo}_{referans_tablo}` | `fk_products_brands` |
| Unique constraint | `uq_{tablo}_{kolon}` | `uq_products_code` |
| Check constraint | `chk_{tablo}_{kural}` | `chk_pricing_dates` |

---

## 7. Ortak Index Kurallari

- Her foreign key kolonu icin otomatik index olusturulmaz (PostgreSQL FK'lara otomatik index eklemez); bu nedenle JOIN'de sik kullanilan FK kolonlari icin manuel index tanimlanmalidir.
- Soft delete sorgularini hizlandirmak icin `deleted_at IS NULL` filtreli **partial index** tercih edilir.
- Composite index'lerde kolon sirasi onemlidir; en secici kolon basa alinir.

---

## 8. Constraint Stratejisi

- Benzersiz olmasi gereken tum is alanlari (e-posta, urun kodu, slug, barkod vb.) `UNIQUE` constraint ile korunur.
- Aralik veya durum kontrolü gerektiren alanlar icin `CHECK` constraint tanimlanir.
- Referential integrity tum FK iliskilerinde uygulanir; silme/guncelleme davranisi (CASCADE, RESTRICT, SET NULL) her iliski icin bilinçli olarak secilir.

---

## 9. Soft Delete ile Unique Constraint Dikkat Noktasi

Soft delete kullanirken benzersizlik kisitlamalarinin silinmis kayitlari icermemesi gerekebilir. Ornegin, ayni e-posta ile iki kayit olamaz; ancak biri silinmis ve biri aktif ise bu kabul edilebilir olmalidir.

Bu durumlar icin:
- **Partial unique index** kullanilir: ilgili kolon uzerinde `WHERE deleted_at IS NULL` ile sinirli unique index olusturulur.
- Bu sayede silinmis kayitlar unique kisitlamanin disinda kalir, aktif kayitlarda benzersizlik korunur.

---

## 10. Transaction Yonetimi Kurallari

- Birden fazla tabloyu etkileyen tum yazma islemleri (ornegin: kullanici olusturma + rol atama, urun olusturma + teknik detay ekleme) tek bir transaction icinde yapilir.
- Transaction basarisiz olursa tum degisiklikler geri alinir; veritabani tutarsiz bir durumda birakilmaz.
- Uzun surecli transactionlardan kacinirilir; lock contention riskini azaltmak icin transaction suresi minimumda tutulur.
