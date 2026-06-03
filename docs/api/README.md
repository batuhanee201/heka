# Heka API — Genel Bakis

## Amaç ve Kapsam

Heka API, LED aydınlatma ürünlerinin B2B yönetimi için tasarlanmış bir RESTful HTTP API'sidir. Aşağıdaki işlevleri kapsar:

- Kimlik doğrulama ve oturum yönetimi (auth)
- Ürün, marka ve kategori yönetimi (product)
- Katalog ve fiyat yönetimi (catalog)
- Dosya yükleme ve ilişkilendirme (files)
- Kullanıcı, rol ve denetim günlüğü yönetimi (admin)

API yalnızca backend-to-frontend ve B2B sistem entegrasyonları için kullanılır; son kullanıcıya açık public bir arayüz değildir.

---

## Temel Tasarım Prensipleri

### REST Kuralları

Heka API saf RESTful tasarım kullanır; JSON:API spesifikasyonuna uyulmaz. Gerekçe: JSON:API'nin getirdiği envelope karmaşıklığı, mevcut projenin küçük-orta ölçekli B2B kullanım senaryosunda gereksiz yük oluşturur.

| Kural | Uygulama |
|---|---|
| Kaynak isimleri çoğul | `/v1/products`, `/v1/catalogs` |
| HTTP metodları semantiğe uygun | GET okuma, POST oluşturma, PATCH kısmi güncelleme, PUT tam güncelleme, DELETE silme |
| Durum kodu anlamlı | 200 OK, 201 Created, 204 No Content, 400, 401, 403, 404, 409, 422, 429, 500 |
| İlişkiler iç içe URL ile | `/v1/catalogs/:id/items`, `/v1/products/:id/technical-details` |
| Kimlik paylaşılmaz URL'de | Şifre, token gibi hassas değerler hiçbir zaman URL parametresi olmaz |

### Versiyonlama

URL prefix tabanlı versiyonlama kullanılır: `/v1/`. Bu yaklaşım:
- İstemci kodunda sürüm değişikliklerini görünür kılar
- Eski sürümü paralel çalıştırmayı kolaylaştırır
- Header tabanlı versiyonlama yerine daha az hata eğilimlidir

Eski sürümler en az **6 ay** boyunca desteklenir; kaldırılmadan önce `Deprecation` ve `Sunset` header'ları ile bildirim yapılır.

### Yanıt Formatı

Tüm yanıtlar `application/json` content-type ile döner. Başarılı ve hatalı yanıtlar için standart zarflar kullanılır (bkz. [architecture.md](architecture.md)).

### Dil ve Karakter Seti

Tüm alan adları `snake_case` formatındadır. Tarih/saat alanları ISO 8601 UTC formatında döner: `2026-05-24T10:30:00.000Z`.

---

## Kimlik Doğrulama

Heka API, JWT tabanlı Bearer token kimlik doğrulaması kullanır.

- Her korumalı isteğin `Authorization` header'ında `Bearer <access_token>` bulunmalıdır.
- Access token ömrü **15 dakika**dır.
- Token yenileme için `/v1/auth/refresh` endpoint'ine refresh token (httpOnly cookie veya request body) ile istek atılır.
- Refresh token ömrü **30 gün**dür ve her kullanımda rotation uygulanır (eski token geçersiz olur, yeni token verilir).
- `app_metadata.role` claim'i JWT içinde taşınır; rol bazlı yetkilendirme bu claim üzerinden yapılır.

Detay için bkz. [auth-flow.md](auth-flow.md).

---

## Ortamlar

| Ortam | Base URL |
|---|---|
| Development | `http://localhost:3000/v1` |
| Staging | `https://api-staging.heka.app/v1` |
| Production | `https://api.heka.app/v1` |

Ortam bazlı Supabase URL ve servis anahtarları environment variable olarak yönetilir; kod tabanına gömülmez.

---

## Dokümantasyon Navigasyon Tablosu

| Doküman | Açıklama |
|---|---|
| [architecture.md](architecture.md) | API katman mimarisi, middleware stack, hata yönetimi, pagination ve CORS |
| [auth-flow.md](auth-flow.md) | Kimlik doğrulama ve oturum akışları (Mermaid diyagramları) |
| [endpoints/auth.md](endpoints/auth.md) | Auth modülü endpoint'leri — register, login, token, OTP, profil, oturumlar |
| [endpoints/product.md](endpoints/product.md) | Ürün modülü endpoint'leri — markalar, kategoriler, ürünler, teknik detay, display |
| [endpoints/catalog.md](endpoints/catalog.md) | Katalog modülü endpoint'leri — kataloglar, kalemler, fiyatlandırma |
| [endpoints/files.md](endpoints/files.md) | Dosya modülü endpoint'leri — yükleme, ilişkilendirme, silme |
| [endpoints/admin.md](endpoints/admin.md) | Admin modülü endpoint'leri — kullanıcı yönetimi, roller, denetim günlüğü |
| [error-codes.md](error-codes.md) | Tüm uygulama hata kodları kataloğu |
| [rate-limiting.md](rate-limiting.md) | Rate limiting stratejisi, limitler ve header tanımları |
| [pagination.md](pagination.md) | Cursor tabanlı pagination tasarımı ve sorgu parametreleri |
