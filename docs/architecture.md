# Mimari Dokumani

## 1. Domain Bazli Modüler Mimari

### Genel Yaklasim

Heka sistemi, **domain-driven** (is alani odakli) bir mimari anlayisiyla tasarlanmistir. Her is alani (domain) kendi modülü icerisinde izole edilir; moduller arasi bagimliliklar minimuma indirilir ve yalnizca tanimlanmis arabirimler uzerinden iletisim kurulur.

```
heka-api/
├── src/
│   ├── core/               — Ortak yardimcilar, middleware, base siniflar
│   │   ├── database/       — Veritabani baglantisi, transaction yonetimi
│   │   ├── auth/           — JWT dogrulama middleware
│   │   ├── logger/         — Yapisal loglama
│   │   ├── errors/         — Hata tanimlari ve error handler
│   │   └── utils/          — Genel yardimci fonksiyonlar
│   │
│   ├── modules/
│   │   ├── auth/           — Kimlik dogrulama ve yetkilendirme
│   │   │   ├── auth.controller
│   │   │   ├── auth.service
│   │   │   ├── auth.repository
│   │   │   └── auth.types
│   │   │
│   │   ├── product/        — Urun yonetimi
│   │   │   ├── product.controller
│   │   │   ├── product.service
│   │   │   ├── product.repository
│   │   │   └── product.types
│   │   │
│   │   ├── catalog/        — Katalog ve fiyat yonetimi
│   │   ├── files/          — Dosya yonetimi
│   │   └── audit/          — Olay loglama
│   │
│   ├── jobs/               — Arka plan isleri (temizlik, bildirim)
│   └── config/             — Ortam degiskenleri ve yapilandirma
```

### Katman Yapisi (Her Modul Icin)

```
[HTTP Istegi]
     |
[Controller]     — Istek/yanit formatlama, girdi dogrulama
     |
[Service]        — Is kurallari, orkestrasyom, transaction yonetimi
     |
[Repository]     — Veritabani sorgulari (Supabase client veya raw SQL)
     |
[Database]       — PostgreSQL (Supabase)
```

- Controller katmani is kurali icermez; yalnizca HTTP sozlesmesini yonetir.
- Service katmani veritabani detaylarini bilmez; repository arayuzune bagimlidir.
- Repository katmani yalnizca veri erisimi yapar; is kurali uyglamaz.

### Modüller Arasi Iletisim Kurallari

- Bir modul, baska bir modulun repository'sine dogrudan erisemez.
- Modüller arasi veri ihtiyaci, hedef modulun service katmani uzerinden karsilanir.
- Cok sayida modulü etkileyen islemler (ornegin: urun silindiginde dosya iliskilerini temizle) event-driven yaklasimla cozulur; bir modul `event`i yayinlar, diger modul dinler.

---

## 2. Backup ve Recovery Stratejisi

### Yedekleme Katmanlari

#### Katman 1 — Supabase Otomatik Yedekleme

- Supabase Pro ve uzeri planlarda **gunluk otomatik Point-in-Time Recovery (PITR)** saglanir.
- PITR ile herhangi bir anin durumuna saniye hassasiyetiyle geri donus mumkundur.
- Yedekler Supabase altyapisinda saklanir; kullanici tarafinda ek yapılandırma gerekmez.
- Saklama suresi: Pro plan uzerinde 7 gun; Enterprise'da 30 gune uzatilabilir.

#### Katman 2 — Ozel Gunluk Dump

- Her gece `pg_dump` ile tam veritabani yedeği alinir.
- Yedek dosyalari sifrelenerek (AES-256) harici bir konumda (AWS S3 veya benzer) saklanir.
- 30 gun saklama politikasi uygulanir; 30 gunluk yedekler arsivsiz silinir.
- Yedekleme islemi monitoring sistemi tarafindan izlenir; basarisiz yedek alarm tetikler.

#### Katman 3 — Dosya Yedekleme (Supabase Storage)

- Supabase Storage icindeki dosyalar gunluk olarak baska bir cloud storage bucket'ina kopyalanir.
- Bu islem versiyonlama destekli bucket kullanilarak yapilir; yanliş silme durumlarinda eski surume geri donus mumkun olur.

### Recovery (Geri Yukleme) Proseduru

| Senaryo | Yontem | Hedef RTO | Hedef RPO |
|---|---|---|---|
| Yanliş veri guncelleme | Audit log + PITR | < 1 saat | Saniye |
| Tablo bozulmasi | PITR ile belirli ana donme | < 2 saat | Saniye |
| Tam veritabani kaybi | pg_dump'tan geri yukleme | < 4 saat | < 24 saat |
| Felaketten kurtarma | Farkli bolgede yeni ortam + dump | < 8 saat | < 24 saat |

**RTO (Recovery Time Objective):** Sistemin ne kadar surede geri alinmasi hedefleniyor.
**RPO (Recovery Point Objective):** Kaybedilebilecek maksimum veri suresi.

### Recovery Test Planı

- Ayda bir kez yedek geri yukleme demosu yapilir; geri yuklemenin calistigini dogrulamak icin otomatik test scripti calistirilir.
- Test sonuclari belgelenir ve saklanlır.

---

## 3. Monitoring ve Error Tracking

### Monitoring Katmanlari

#### Altyapi Monitoring (Supabase Dashboard)

Supabase yerel monitoring ile asagidaki metrikler izlenir:
- CPU ve bellek kullanimi
- Aktif veritabani baglantilari
- Sorgu suresi ortalamalari
- Yavaş sorgular (slow query log)
- RLS bypass denemeleri

#### Uygulama Monitoring — APM

| Arac | Amac |
|---|---|
| Sentry | Hata takibi; yanliş sorgular, islenemeyen istisnalar, gec yanit sureleri |
| (Opsiyonel) Datadog / New Relic | Kapsamli performans izleme; trace, metrik, log birlestirme |

Sentry entegrasyonu icin asagidaki olay tipleri yakalanir ve raporlanir:
- Islenemeyen sunucu hatalari (5xx)
- Veritabani baglanti hatalari
- Kimlik dogrulama basarisizliğı anliklari
- Background job hatalari
- Rate limit tetiklenme trendi

#### Veritabani Monitoring

- `pg_stat_statements` uzantisi etkinlestirilir; en yavaş N sorgu periyodik raporda gorunur.
- `pg_stat_user_tables` ile tablo bloat ve sequential scan orani izlenir.
- Gunluk `VACUUM ANALYZE` raporu degerlendirilir.

### Alert (Uyari) Kurallari

| Metrik | Esik | Aksiyon |
|---|---|---|
| CPU kullanimi | > %80 (5 dakika) | Bildirim: on call dev |
| Aktif baglanti | > %90 baglanti havuzu | Bildirim: kritik |
| Yanit suresi (p95) | > 2 saniye | Bildirim: warning |
| Basarisiz login | > 50 / dakika | Bildirim: guvenlik alarmi |
| Disk kullanimi | > %80 | Bildirim: warning |
| Yedekleme basarısız | — | Bildirim: kritik |

### Yapisal Loglama (Structured Logging)

Tum uygulama loglari JSON formatinda yazilir; bu sayede log agregasyon araclari (Supabase Logs, Datadog, ELK) kolayca parse edebilir.

Her log satiri en az asagidakileri icerir:
- `timestamp` — ISO 8601 formati, UTC
- `level` — debug / info / warning / error / critical
- `request_id` — Istek izleme kimligi (correlation ID)
- `user_id` — Kimlik dogrulamasi varsa
- `module` — Hangi modülden geldi
- `message` — Okunabilir aciklama
- `metadata` — Olaya ozgu ek bilgiler

Hassas bilgiler (sifre, token, OTP) loglara yazilmaz.

---

## 4. Transaction Yonetimi

### Temel Kural

Birden fazla tabloyu etkileyen, birbirini takip etmesi gereken yazma islemleri atomik olmalidir: ya tamami basari ile tamamlanir ya da hicbiri gecerli sayilmaz.

### Transaction Gerektiren Senaryolar

| Senaryo | Etkilenen Tablolar |
|---|---|
| Kullanici kaydi | `users` + `user_roles` |
| Urun olusturma | `products` + `product_technical_details` + `product_display` |
| Rol atama | `user_roles` + `audit_logs` |
| Katalog yayinlama | `catalogs` (status guncelleme) + `audit_logs` |
| Dosya silme | `files` (soft delete) + `file_relations` (temizlik) + `audit_logs` |
| Fiyat guncelleme | `pricing` (yeni kayit) + eski kayit gecersizlestirme + `audit_logs` |

### Transaction Yazim Kurallari

- Transaction blogu mimari olarak service katmaninda yonetilir; repository katmani transaction'i bilmez, yalnizca veritabani islemini yapar.
- Transaction suresi minimumda tutulur; uzun surecli islemler (ornegin dis API cagrisi) transaction icine alinmaz.
- Transaction icerisinde kullanici beklemesi gerektiren bir islem (ornegin harici SMS gonderimi) yapilmaz; once veritabani islemi tamamlanir, sonra dis servis cagrisi yapilir.
- Transaction basarisiz olursa uygulama katmani anlamli bir hata mesaji doner ve durumu audit_log'a yazar.

### Deadlock Onleme

- Birden fazla tabloyu guncelleyen transactionlar her zaman ayni sirada (alfabetik veya tanimlanmis bir sirada) tabloları gunceller; farkli sira deadlock riskini arttirir.
- Uzun surecli lock'lardan kacilir; `SELECT ... FOR UPDATE` yalnizca gerekli satirlarda kullanilir.
- `lock_timeout` veritabani parametresi makul bir degerle (ornegin 5 saniye) yapilandirilir; donup kalan transactionlar otomatik iptal edilir.

---

## 5. API ve Integration Genisletilebilirlik Tasarimi

### API Mimarisi

#### Mevcut Asamada — RESTful API

- Standart HTTP metodlari (GET, POST, PUT, PATCH, DELETE)
- Kaynak bazli URL yapisi: `/api/v1/{modul}/{kaynak}`
- JSON istek/yanit formati
- Versiyonlama URL uzerinden: `/api/v1/`, `/api/v2/`

#### Versiyonlama Stratejisi

- Her buyuk degisiklik yeni bir API versiyonu olusturur.
- Eski versiyon en az 6 ay boyunca desteklenir; EOL (End of Life) tarihi onceden duyurulur.
- Surumu dolan endpoint'ler `Deprecation` ve `Sunset` HTTP basliklarıyla isaretlenir.

### B2B Entegrasyon Altyapisi

#### Webhook Sistemi (Ilerleyen Faz)

Dis sistemlerin (ERP, CRM, e-ticaret platformlari) Heka'daki degisikliklerden haberdar olabilmesi icin webhook mekanizmasi planlanir:

| Tetikleyici Olay | Webhook Payload |
|---|---|
| Urun olusturuldu | Urun ID, kod, kategori, marka |
| Urun guncellendi | Degisen alanlar, timestamp |
| Fiyat guncellendi | Urun ID, yeni fiyat, para birimi, gecerlilik |
| Katalog yayinlandi | Katalog ID, icerik ozeti |

- Webhook dagitimlari `at-least-once` semantigi ile calisir; idem-potency `X-Webhook-ID` basligiyla saglanir.
- Basarisiz webhook denemeleri exponential backoff ile en fazla 5 kez yeniden denenir.
- Tum webhook denemeleri loglanir.

#### API Key Yonetimi (B2B Erisim)

- Harici sistemler icin kisi bagli olmayan API key'ler uretilir.
- Her API key bir role baglanir; bu rol uzerinden erisim kisitlanir.
- API key'ler hashlenip veritabaninda saklanir; plain text hicbir yere yazilmaz.
- API key'lerin son kullanim tarihi tanimlanabilir; suresiz key olusturmak onerilmez.

#### GraphQL (Ilerleyen Faz)

B2B musterilerinin karmasik veri ihtiyaclarini karsilamak ve over-fetching / under-fetching sorunlarini cözmek icin GraphQL katmani eklenebilir:
- REST API korunur; GraphQL ek bir erisim katmani olarak calisir.
- Supabase'in dahili GraphQL destegi veya harici bir GraphQL gateway (ornegin Hasura) degerlendirilebilir.
- Tum GraphQL sorgulari icin derinlik limiti (query depth limit) ve karmasiklik limiti (complexity limit) uygulanir; N+1 sorgu problemleri dataloader ile onlenir.

### Genisletilebilirlik Tasarim Kurallari

- Yeni bir modul eklemek icin mevcut tablolari degistirmek gerekmemelidir; yeni modül kendi tablolarini getirir.
- `file_relations` ve `audit_logs` tablolarinin polimorfik yapisi, yeni entity tipleri eklendiginde tablo degisikligi olmadan genisler; yalnizca `entity_type` CHECK constraint'ine yeni deger eklenir.
- Fiyatlandirma modeli, `price_type` kolonuyla genisletilebilir; yeni musteri segmenti veya fiyat modeli icin tablo degisimi gerekmez.
- Sertifika tipleri `certificates` JSONB kolonu sayesinde migration gerektirmeden genisler.

### Rate Limiting — API Duzeyi

REST API endpoint'leri icin asagidaki katmanli limitler gecerlidir:

| Endpoint Grubu | Pencere | Maks Istek |
|---|---|---|
| Public (katalog okuma) | 1 dakika | 60 istek |
| Authenticated (genel) | 1 dakika | 120 istek |
| Write islemleri (POST/PUT/PATCH) | 1 dakika | 30 istek |
| Admin islemleri | 1 dakika | 60 istek |
| B2B API Key erisimi | 1 dakika | 300 istek |
