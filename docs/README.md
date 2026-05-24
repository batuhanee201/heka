# Heka B2B Urun Yonetim Sistemi — Genel Mimari

## Proje Ozeti

Heka, LED ampul ve benzeri elektrik/aydinlatma urunlerini yoneten bir B2B urun yonetim sistemidir. Sistem; urun teknik detaylarini, kataloglari, dosya varliklarini ve kullanici erisim yonetimini kapsamli, guvenli ve genisletilebilir bir mimari uzerinde barindirmaktadir.

---

## Temel Mimari Prensipler

- **Domain bazli modüler mimari**: Her is alani (auth, product, catalog, files, audit) kendi modulu icerisinde izole edilmistir.
- **Supabase altyapisi**: PostgreSQL veritabani, Supabase Auth, Row Level Security (RLS) ve Storage uzerinde insaa edilmistir.
- **Guvenlik oncelikligi**: Argon2id sifre hashleme, RLS politikalari, rate limiting ve kapsamli audit loglama.
- **Genisletilebilirlik**: API/integration katmani, yeni modullerle veya dis sistemlerle kolayca genisletilebilecek sekilde tasarlanmistir.
- **Veri butunlugu**: UUID primary keyler, soft delete, unique constraint ve transaction yonetimi ile saglanmaktadir.

---

## Teknoloji Secimi

| Katman | Teknoloji | Gerekcesi |
|---|---|---|
| Veritabani | PostgreSQL (Supabase) | ACID uyumluluk, JSON destegi, RLS, olgun ekosistem |
| Auth | Supabase Auth + ozel SMS servisi | E-posta + telefon dogrulama, JWT tabanli oturum |
| Dosya Depolama | Supabase Storage | Bucket tabanli erisim politikalari, CDN destegi |
| Sifre Hashleme | Argon2id | OWASP onerisine uygun, brute-force direncli |
| API Katmani | RESTful + (ilerleyen fazda) GraphQL | B2B entegrasyon kolayligi |
| Migration | Supabase Migrations (versiyonlu SQL dosyalari) | Izlenebilir, geri alinabilir degisiklikler |
| Monitoring | Supabase Logs + harici APM (ornegin Sentry) | Hata takibi, performans izleme |

---

## Modul Yapisi

```
heka/
├── core/           — Ortak yardimci fonksiyonlar, base tablolar, soft delete mekanizmasi
├── auth/           — Kullanici, rol, izin, oturum, OTP, rate limit yonetimi
├── product/        — Urun, teknik detay, gorsel/display bilgisi, kategori, marka
├── catalog/        — Katalog, katalog kalemleri, fiyatlandirma
├── files/          — Dosya metadata, dosya iliskilendirme
└── audit/          — Olay loglari, degisiklik gecmisi
```

---

## Veritabani Modulu Gruplari

| Modul | Tablolar | Amac |
|---|---|---|
| core | — | UUID stratejisi, soft delete, ortak alanlar tanimlari |
| auth | users, roles, permissions, user_roles, role_permissions, sessions, otp_verifications, rate_limit_logs | Kimlik dogrulama ve yetkilendirme |
| product | products, product_technical_details, product_display, categories, brands | Urun bilgi yonetimi |
| catalog | catalogs, catalog_items, pricing | Katalog ve fiyat yonetimi |
| files | files, file_relations | Dosya varliklari ve iliskileri |
| audit | audit_logs | Sistem olay kayitlari |

---

## Guvenlik Mimarisi Ozeti

- Tüm sifrelere argon2id hashleme uygulanir; veritabaninda asla plain text sifre tutulmaz.
- Her tablo icin RLS politikalari rol bazli erisim matrisiyle tanimlanmistir.
- Login, OTP ve sifre sifirlama islemleri rate limiting ile korunmaktadir.
- Tüm kritik olaylar (giris, guncelleme, silme, izin degisikligi) audit_logs tablosuna yazilir.
- Dosya erisimi Supabase Storage bucket politikalari ile kontrol edilir.

---

## Ilgili Dokumanlar

- [Veritabani Semasi Genel Bakis](db/schema-overview.md)
- [Guvenlik Dokumani](security.md)
- [Mimari Dokumani](architecture.md)
- [RLS Politikalari](db/rls-policies.md)
- [Index Stratejisi](db/indexes.md)
- [Migration Stratejisi](db/migrations.md)
- Tablo detaylari: [core](db/tables/core.md) | [auth](db/tables/auth.md) | [product](db/tables/product.md) | [catalog](db/tables/catalog.md) | [files](db/tables/files.md) | [audit](db/tables/audit.md)
