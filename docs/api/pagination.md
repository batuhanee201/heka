# Pagination Tasarımı

## Offset Yerine Cursor: Karar ve Gerekçe

Heka API, tüm liste endpoint'lerinde **cursor tabanlı (keyset) pagination** kullanır.

### Offset Pagination'ın Sorunları

| Sorun | Açıklama |
|---|---|
| Veri kayması (drift) | Sayfa 2 yüklenirken yeni kayıt eklenirse sayfa 3'te tekrar görünür |
| Performans | `OFFSET 10000` gibi büyük değerler veritabanının tüm önceki satırları okumasını gerektirir |
| Güvenilirlik | Silinen kayıtlar sayfalar arasında boşluk bırakır |

### Cursor Pagination'ın Avantajları

| Avantaj | Açıklama |
|---|---|
| Veri tutarlılığı | Cursor, belirli bir satırı işaret eder; yeni ekleme veya silme sayfalamayı bozmaz |
| Performans | `WHERE id > cursor_id ORDER BY id` — index kullanımı doğrudan |
| Gerçek zamanlı listeler | Sürekli güncellenen veriler için güvenilir |

---

## Cursor Şeması

Cursor, istemci tarafında opak (anlamlandırılamaz) bir string olarak sunulur. Sunucu tarafında aşağıdaki veriyi içerir ve Base64URL ile encode edilir:

| Alan | Açıklama |
|---|---|
| `id` | Son görülen kaydın UUID'si |
| `sort_value` | Sıralama alanının değeri (çoklu alan sıralamasında gerekli) |
| `sort_field` | Sıralama alanının adı |
| `direction` | `next` veya `prev` |

Cursor üretim mantığı sunucu tarafında tamamen yönetilir. İstemci cursor'u şeffaf bir token olarak iletir; içeriğini parse etmeye veya oluşturmaya çalışmamalıdır.

Cursor geçersiz hale geldiğinde (TTL veya veri değişimi nedeniyle) `400 Bad Request` ile `PAGINATION_INVALID_CURSOR` hata kodu döner.

---

## Query Parametreleri

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | integer | Hayır | 20 | Sayfa başına kayıt sayısı |
| `after` | string | Hayır | — | Bu cursor'dan sonrasını getir (ileri sayfalama) |
| `before` | string | Hayır | — | Bu cursor'dan öncesini getir (geri sayfalama) |

### Kural ve Kısıtlamalar

- `limit` minimum değeri: **1**
- `limit` maksimum değeri: **100**
- `after` ve `before` aynı anda kullanılamaz; her ikisi gönderilirse `422 VALIDATION_FAILED` döner.
- `after` veya `before` belirtilmezse listenin başından itibaren sonuç döner.

---

## Yanıt Zarfı

```
{
  "data": [
    { ... kayıt 1 ... },
    { ... kayıt 2 ... },
    ...
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6ImExYjJjM2Q0IiwidiI6MX0=",
    "prev_cursor": null,
    "has_more": true,
    "limit": 20,
    "count": 20
  }
}
```

### Pagination Nesnesi Alanları

| Alan | Tip | Açıklama |
|---|---|---|
| `next_cursor` | string\|null | Bir sonraki sayfa için `after` parametresi. Son sayfada `null`. |
| `prev_cursor` | string\|null | Bir önceki sayfa için `before` parametresi. İlk sayfada `null`. |
| `has_more` | boolean | Sonraki sayfada kayıt var mı? |
| `limit` | integer | İstekte kullanılan limit değeri |
| `count` | integer | Bu sayfada dönen kayıt sayısı |

### Sayfalama Tamamlandığında

- `has_more: false` — son sayfaya ulaşıldı.
- `next_cursor: null` — daha fazla ileri sayfalama yapılamaz.
- `count < limit` — son sayfada limit'ten az kayıt var.

---

## Sıralama ile Pagination Etkileşimi

Cursor, sıralama alanına bağlıdır. Sıralama değiştirildiğinde mevcut cursor geçersiz hale gelir.

### Tekil Alan Sıralaması

```
GET /v1/products?sort=-created_at&limit=20
→ next_cursor döner

GET /v1/products?sort=-created_at&limit=20&after=<next_cursor>
→ Doğru, tutarlı sayfa 2
```

### Çoklu Alan Sıralaması

```
GET /v1/products?sort=name,-created_at&limit=20
→ Cursor, hem name hem created_at değerini içerir
```

### Eşit Değerli Satırlar

Sıralama alanında eşit değerli satırlar belirleyici sıra sorununa yol açabilir. Bu durumu önlemek için sıralama her zaman `id` ile sonlandırılır:

- İstemci `sort=name` gönderirse sunucu bunu `sort=name, id` olarak işler.
- Cursor her iki alanın değerini taşır; aynı `name`'e sahip satırlar arasında `id` karşılaştırması yapılır.

---

## Pagination Akışı Örneği

```
İlk istek:
GET /v1/products?limit=20&sort=-created_at

Yanıt:
{
  "data": [...20 ürün...],
  "pagination": {
    "next_cursor": "eyJpZCI6...",
    "prev_cursor": null,
    "has_more": true,
    "limit": 20,
    "count": 20
  }
}

Sayfa 2:
GET /v1/products?limit=20&sort=-created_at&after=eyJpZCI6...

Yanıt:
{
  "data": [...20 ürün daha...],
  "pagination": {
    "next_cursor": "eyJpZCI7...",
    "prev_cursor": "eyJpZCI6...",
    "has_more": false,
    "limit": 20,
    "count": 15
  }
}

has_more: false → Listenin sonu
```

---

## Cursor Geçerlilik Süresi

- Cursor'ların geçerlilik süresi yoktur; ancak cursor'un işaret ettiği kayıt silinirse davranış:
  - Soft-delete kullanıldığından kayıt veritabanında kalır.
  - Cursor silinmiş kaydı atlayarak bir sonraki geçerli kayıttan devam eder.
- Sıralama alanı değiştirilerek oluşturulan cursor eski sıralamaya göre üretilmiş cursor ile kullanılamaz.
- Geçersiz cursor formatı: `400 Bad Request` — `PAGINATION_INVALID_CURSOR`

---

## Maksimum Limit Politikası

- Maksimum limit: **100 kayıt**
- 100'den büyük `limit` değeri otomatik olarak 100'e düşürülmez; `422 VALIDATION_MAX_VALUE` hata döner.
- İstemcinin açıkça makul bir limit gönderme zorunluluğu bilinçli bir tasarım kararıdır: gereksiz büyük yanıtlar engellenir.

Büyük veri exportu için sayfalama yerine ilerleyen fazda ayrı bir export endpoint'i tasarlanacaktır.
