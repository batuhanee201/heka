# Guvenlik Dokumani

## 1. Sifre Hashleme — Argon2id

### Neden Argon2id?

OWASP Password Storage Cheat Sheet ve NIST SP 800-63B standartlari, modern uygulamalarda argon2id kullanilmasini birincil oneri olarak sunmaktadir. Argon2id:
- Hem zaman (CPU) hem bellek maliyeti talep eder; GPU ve ASIC temelli brute-force saldirilarini zorlestirir.
- Yan kanal saldirilarina karsi argon2i'nin direncini, guclü kaba kuvvet direnci acisından argon2d'nin avantajlarini birlestiren hibrit varyanttir.
- bcrypt ve PBKDF2'ye gore cok daha buyuk bellek gereksinimi nedeniyle rainbow table ve GPU paralel ataklar icin ekonomik olarak elverisizdir.

### Parametreler

Asagidaki parametreler minimum onerilen degerlerdir; donanim kapasitesi arttikca yukseltilebilir:

| Parametre | Onerilen Deger | Aciklama |
|---|---|---|
| `memory` | 64 MB (65536 KB) | Bellek maliyeti; ne kadar yuksekse o kadar guvenli |
| `iterations` | 3 | Zaman maliyeti |
| `parallelism` | 4 | Paralel is parcacigi sayisi |
| `hash_length` | 32 byte | Cikti hash uzunlugu |
| `salt_length` | 16 byte | Her sifre icin rastgele, benzersiz salt |

### Uygulama Kurallari

- Kullanicidan alinan sifre **hic bir zaman** veritabanina, loga veya herhangi bir dosyaya plain text olarak yazilmaz.
- Hash islemi yalnizca sunucu tarafinda yapilir; istemciye hash gondermek guvenlik riskirini kaldirmaz.
- Sifre karsilastirmasi `argon2id_verify()` benzeri sabit-zamanlı (constant-time) karsilastirma fonksiyonu ile yapilir; basit string karsilastirmasi (`===`) timing saldirilarına acik olduğu icin kullanilmaz.
- Mevcut hash parametreleri yukseltildiginde (ornegin bellek 128 MB'a cikarildiginda), sonraki kullanici girisi sirasinda hash yeniden hesaplanarak guncellenir (`lazy rehash` stratejisi).
- Test ve gelistirme ortamlarinda da argon2id kullanilir; MD5, SHA-1 veya bcrypt ile test ortami kurmak hatalara davetiye cikarir.

### Refresh Token ve OTP Hash

- Refresh token'lar da veritabanina ham haliyle yazilmaz; argon2id veya en az SHA-256 ile hashlenip `refresh_token_hash` kolonuna yazilir. (SHA-256 burada yeterlidir cunku token yeterince uzun ve rastgeledir.)
- OTP kodlari `code_hash` kolonunda hashli olarak saklanir; sifre gibi kisa oldugu icin argon2id veya SHA-256+salt kombinasyonu kullanilmalidir.

---

## 2. Session ve Token Yonetimi

### Mimari

Supabase Auth, JWT tabanli access token ile calisir. Bu projedeki session mimarisi:

```
[Kullanici] ---(email+sifre)---> [Supabase Auth]
                                        |
                             [Access Token (JWT) + Refresh Token]
                                        |
                    +-----------------+--------------+
                    |                 |              |
            [API istekleri]   [Token yenileme]  [Oturum yonetimi]
            (Access Token)   (Refresh Token)    (sessions tablosu)
```

### Access Token

| Ozellik | Deger |
|---|---|
| Tip | JWT (HS256 veya RS256) |
| Sure | 15 dakika |
| Icerik | `user_id`, `role`, `email`, `exp`, `iat` |
| Depolama | Istemcide `httpOnly` cookie veya hafiza; `localStorage`'a yazilmaz |

### Refresh Token

| Ozellik | Deger |
|---|---|
| Sure | 30 gun |
| Depolama | Veritabaninda hashli; istemcide `httpOnly` cookie |
| Yenileme | Access token suresi dolunca refresh token ile yeni access token alinir |
| Tek kullanimlik | Refresh token bir kez kullanilinca geçersiz kalir; yeni refresh token verilir (token rotation) |

### Token Rotation (Jeton Donusumu)

- Her refresh isleminde eski refresh token iptal edilir, yeni refresh token olusturulur.
- Bu sayede celinmis bir refresh token, ele geciren kisi onu kullandiginda tespit edilebilir: beklenen token ile kullanilan token birbirinden farkliysa supheli faaliyet algilanlir ve tum oturumlar iptal edilir.

### Oturum Iptal Senaryolari

| Senaryo | Akis |
|---|---|
| Kullanici logout | Ilgili `sessions` satiri `revoked_at = now()` ile guncellenir |
| Sifre degisikligi | Kullaniciye ait tum aktif oturumlar iptal edilir |
| Admin mudahalesi | Admin ilgili oturumu secip iptal edebilir |
| Suphelie faaliyet | Tum oturumlar otomatik iptal, kullaniciya bildirim |

### Session Temizligi

Suresi gecmis (`expires_at < now()`) veya iptal edilmis (`revoked_at IS NOT NULL`) oturumlar periyodik bir is ile temizlenir. Temizlik oncesinde bu oturumlar audit_logs'a yazilir.

---

## 3. Rate Limiting Stratejisi

### Kapsam

Rate limiting; istemci IP adresi veya kullanici kimligi bazinda, belirli zaman penceresi icerisinde yapilan istek sayisini sinirlandiran bir koruma mekanizmasidir.

### Korunan Endpoint'ler ve Limitler

| Endpoint / Eylem | Zaman Penceresi | Maks Deneme | Bloke Suresi | Identifier |
|---|---|---|---|---|
| Login | 15 dakika | 10 | 30 dakika | IP + e-posta |
| OTP isteme | 1 saat | 5 | 1 saat | IP + kullanici ID |
| OTP dogrulama | 10 dakika | 3 | 1 saat | IP + kullanici ID |
| Sifre sifirlama istegi | 1 saat | 3 | 2 saat | IP + e-posta |
| Token yenileme | 1 dakika | 30 | 5 dakika | IP |

### Katmanli Rate Limiting

Rate limiting iki seviyede uygulanir:

1. **Ag/CDN katmani:** Cloudflare veya Supabase'in API gateway uzerinde IP bazli genel limit. Saniyede cok fazla istek gelen IP'ler agda blokelenir, veritabanina bile ulasmazlar.

2. **Uygulama katmani:** `rate_limit_logs` tablosu uzerinden daha ince taneli kontrol. Bir IP engellenmemis olsa bile e-posta veya kullanici bazinda deneme sayisi takip edilir.

### Bloke Bildirimi

- Kullaniciya varligi olmayan hesap icin bile "cok fazla deneme" mesaji verilir (hesap numaralama saldirisini onlemek icin).
- Admin panelinden bloke durumu gorulebilir ve gerektiginde elle kaldirilabilir.

---

## 4. Dosya Erisim Politikalari

### Supabase Storage Bucket Politikalari

Her bucket icin Supabase Storage RLS politikalari ayri tanimlanir.

#### `product-images` Bucketi

| Islem | Izin | Kosul |
|---|---|---|
| SELECT (okuma) | `authenticated` | Dosya `is_public = true` veya kullanici `app_manager`/`app_admin` |
| INSERT (yukleme) | `app_manager`, `app_admin` | Dosya boyutu <= 5 MB; MIME tipi `image/*` |
| DELETE | `app_admin` | Kosulsuz |

#### `catalogs` Bucketi

| Islem | Izin | Kosul |
|---|---|---|
| SELECT | `authenticated` | Bagli katalog aktif |
| INSERT | `app_manager`, `app_admin` | MIME tipi `application/pdf`; boyut <= 50 MB |
| DELETE | `app_admin` | Kosulsuz |

#### `private-uploads` Bucketi

| Islem | Izin | Kosul |
|---|---|---|
| SELECT | `app_admin`, `app_manager` | Sadece yetkili roller |
| INSERT | `app_admin`, `app_manager` | Kosulsuz |
| DELETE | `app_admin` | Kosulsuz |

### Imzali URL (Signed URL) Politikasi

- `is_public = false` olan dosyalar icin dogrudan Storage URL'si calismaZ.
- Bu dosyalara erisim icin sunucu tarafinda imzali (signed) URL uretilir.
- Imzali URL'lerin suresi 1 saat ile sinirlidir; uzun sureli imzali URL uretmek risktir.
- Imzali URL uretimi loglanir; erisim talep eden kullanicinin kimlik dogrulamasi yapilmis olmasi zorunludur.

### Dosya Tipi ve Boyut Kisitlamalari

| Bucket | Izin Verilen MIME Tipleri | Maks Boyut |
|---|---|---|
| `product-images` | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml` | 5 MB |
| `product-documents` | `application/pdf` | 20 MB |
| `catalogs` | `application/pdf` | 50 MB |
| `brand-assets` | `image/*`, `application/pdf` | 10 MB |
| `private-uploads` | Herhangi | 100 MB |

Dosya tipi kontrolu isim uzantisina degil MIME type'a gore yapilir; uzanti sahteleme (extension spoofing) engellenir.

### Orphan (Sahipsiz) Dosya Yonetimi

- Bir dosyanin bagli oldugu tum `file_relations` kayitlari silindiginde dosya "orphan" durumuna duser.
- Gunluk bir is (background job) orphan dosyalari tespit eder ve audit_logs'a yazarak `deleted_at` ile isaretler.
- 30 gun sonra isaretli orphan dosyalar Storage'dan fiziksel olarak silinir.

---

## 5. Genel Guvenlik Uygulama Kurallari

### Girdi Dogrulama

- Tum kullanici girdileri API katmaninda schema validation ile dogrulanir (ornegin Zod veya Joi).
- Veritabanina giden tum degerler parametreli sorgularla gecilir; SQL injection riskini ortadan kaldirir.
- E-posta adresleri RFC 5322 formati ve alan adi dogrulamasi ile kontrol edilir.
- Telefon numaralari E.164 format kuralina gore normalize edilir.

### Hassas Bilgi Yonetimi

- API cevaplari `password_hash`, `refresh_token_hash`, `code_hash` gibi gizli alanlari asla icermez.
- Loglarda hassas bilgi maskelenir.
- Hata mesajlari kullaniciya sistem i bilgisini sizmayacak sekilde tasarlanir (generic mesajlar).

### HTTPS Zorunlulugu

- Tum API ve dosya erisimi yalnizca HTTPS uzerinden yapilir.
- HTTP istekleri HTTPS'e yonlendirilir; `Strict-Transport-Security` (HSTS) baslik zorunludur.

### CORS Politikasi

- API, yalnizca izin verilen `origin` adreslerine yanit verir.
- Wildcard (`*`) origin hic bir production endpoint'inde kullanilamaz.
