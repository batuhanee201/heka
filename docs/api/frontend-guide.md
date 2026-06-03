# Heka API — Frontend Developer Guide

> Base URL: `http://localhost:3000` (development) | `https://api.your-domain.com` (production)  
> Format: JSON (Content-Type: application/json)  
> Swagger UI: `GET /docs`

---

## Authentication

Heka uses JWT Bearer tokens. Store both tokens after login; use the access token for every protected request; refresh it when it expires.

### Token Flow

```
POST /auth/login  →  { access_token, refresh_token, expires_in }
                          ↓
           Authorization: Bearer <access_token>   (every protected request)
                          ↓
         access_token expires  →  POST /auth/refresh  →  new tokens
```

### Setting the Header

```js
// Every protected request:
headers: {
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json"
}
```

---

## Response Envelope

Every response follows one of three shapes:

### Success (single object)
```json
{
  "success": true,
  "data": { ...object }
}
```

### Success (list)
```json
{
  "success": true,
  "data": [ ...items ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "has_more": true,
    "next_cursor": "eyJzb3J0X3ZhbHVlIjoiMjAyNC0wMS0xNSJ9",
    "prev_cursor": "eyJzb3J0X3ZhbHVlIjoiMjAyNC0wMS0xMCJ9"
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "E-posta veya şifre hatalı",
    "details": null
  }
}
```

> **Tip:** Always check `response.success` first. On error, use `error.code` for programmatic handling and `error.message` for user-facing display.

---

## Pagination

All list endpoints support cursor-based pagination via query params:

| Param    | Type    | Default | Description               |
|----------|---------|---------|---------------------------|
| `limit`  | integer | 20      | Items per page (max: 100) |
| `cursor` | string  | —       | Opaque cursor from `next_cursor` |

```js
// First page
GET /products?limit=20

// Next page
GET /products?limit=20&cursor=eyJzb3J0X3ZhbHVlIjoiMjAyNC0wMS0xNSJ9

// No more pages when:
pagination.has_more === false  // or  pagination.next_cursor === null
```

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | Access token expired → refresh |
| `TOKEN_INVALID` | 401 | Token malformed → re-login |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token expired → re-login |
| `UNAUTHORIZED` | 401 | No token provided |
| `FORBIDDEN` | 403 | Not enough permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate (email/slug/etc.) |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests — wait and retry |
| `FILE_TOO_LARGE` | 400 | File exceeds limit |
| `UNSUPPORTED_FILE_TYPE` | 400 | MIME type not allowed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 10 req / 60s |
| `POST /auth/register` | 10 req / 60s |
| `POST /auth/refresh` | 10 req / 60s |
| All others | Global limit (env-configured) |

On `429`, wait for the `retry-after` response header (seconds) before retrying.

---

## Endpoints

---

## Auth

### Register
```
POST /auth/register
```
```json
// Body
{
  "email": "user@example.com",   // required
  "password": "secret123",       // required, min 8 chars
  "full_name": "Ada Lovelace",   // optional
  "phone": "+905551234567"       // optional
}
```
```json
// 201 Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Ada Lovelace",
      "phone": null,
      "is_active": true,
      "email_verified": false,
      "phone_verified": false,
      "last_login_at": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "token_type": "Bearer",
      "expires_in": 900
    }
  }
}
```

---

### Login
```
POST /auth/login
```
```json
// Body
{
  "email": "user@example.com",  // required
  "password": "secret123"       // required
}
```
Same response shape as Register (201 → 200 status).

---

### Refresh Token
```
POST /auth/refresh
```
```json
// Body
{
  "refresh_token": "eyJ..."  // required — the refresh_token from login/register
}
```
Returns fresh tokens. Store and replace old ones immediately.

---

### Logout
```
POST /auth/logout
Authorization: Bearer <access_token>
```
```json
// Body (optional)
{
  "all_devices": false   // true = revoke all sessions, false = current session only
}
```
```
// 204 No Content
```

---

### Get Current User
```
GET /auth/me
Authorization: Bearer <access_token>
```
Returns the `PublicUser` object of the authenticated user.

---

## Products

### List Products
```
GET /products?limit=20&cursor=...&status=active&brand_id=uuid&category_id=uuid
```

| Query Param   | Type   | Values                                        |
|---------------|--------|-----------------------------------------------|
| `limit`       | int    | 1–100, default 20                             |
| `cursor`      | string | opaque pagination cursor                      |
| `status`      | string | `draft` `active` `discontinued` `archived`    |
| `brand_id`    | uuid   | filter by brand                               |
| `category_id` | uuid   | filter by category                            |

```json
// 200 Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "LED-001",
      "name": "LED Panel 60x60",
      "slug": "led-panel-60x60",
      "status": "active",
      "product_type": "panel",
      "short_description": "...",
      "description": "...",
      "brand_id": "uuid",
      "category_id": "uuid",
      "created_by": "uuid",
      "updated_by": null,
      "created_at": "...",
      "updated_at": "...",
      "technical_details": {
        "id": "uuid",
        "socket_type": "GU10",
        "voltage_range": "100-240V",
        "power_w": 18,
        "light_output_lm": 1800,
        "color_temp_k": 4000,
        "color_rendering_index": 80,
        "beam_angle_deg": 120,
        "dimmable": true,
        "energy_efficiency_class": "A",
        "lifetime_hours": 25000,
        "ip_rating": "IP44",
        "operating_temp_min_c": -20,
        "operating_temp_max_c": 40,
        "created_at": "...",
        "updated_at": "..."
      },
      "display": {
        "id": "uuid",
        "package_qty": 6,
        "box_size_mm": "300x200x100",
        "box_weight_gr": 450,
        "barcode": "8699...",
        "qr_code_data": null,
        "certificates": {},
        "created_at": "...",
        "updated_at": "..."
      }
    }
  ],
  "pagination": { "total": 50, "limit": 20, "has_more": true, "next_cursor": "...", "prev_cursor": null }
}
```

---

### Get Product
```
GET /products/:id
```

---

### Create Product
```
POST /products
Authorization: Bearer <access_token>
```
```json
{
  "code": "LED-001",            // required, unique
  "name": "LED Panel 60x60",    // required
  "brand_id": "uuid",           // required
  "category_id": "uuid",        // required
  "status": "draft",            // optional: draft|active|discontinued|archived
  "product_type": "panel",      // optional
  "short_description": "...",   // optional, max 500 chars
  "description": "...",         // optional
  "technical_details": {        // optional
    "socket_type": "GU10",
    "power_w": 18,
    "light_output_lm": 1800,
    "color_temp_k": 4000,
    "color_rendering_index": 80,
    "beam_angle_deg": 120,
    "dimmable": true,
    "energy_efficiency_class": "A",
    "lifetime_hours": 25000,
    "ip_rating": "IP44",
    "voltage_range": "100-240V",
    "operating_temp_min_c": -20,
    "operating_temp_max_c": 40
  },
  "display": {                  // optional
    "package_qty": 6,
    "box_size_mm": "300x200x100",
    "box_weight_gr": 450,
    "barcode": "8699...",
    "qr_code_data": null,
    "certificates": {}
  }
}
```
Returns `201` with the created `ProductDetail`.

---

### Update Product
```
PATCH /products/:id
Authorization: Bearer <access_token>
```
All fields are optional — send only what you want to change.

---

### Delete Product (Soft)
```
DELETE /products/:id
Authorization: Bearer <access_token>
```
`204 No Content`

---

### Restore Deleted Product
```
POST /products/:id/restore
Authorization: Bearer <access_token>
```
Returns `200` with the restored `ProductDetail`.

---

## Brands

### List Brands
```
GET /brands?limit=20&cursor=...
```

### Get Brand
```
GET /brands/:id
```

### Create Brand
```
POST /brands
Authorization: Bearer <access_token>
```
```json
{
  "name": "Philips",             // required, max 100 chars
  "description": "...",          // optional, max 500 chars
  "website_url": "https://...",  // optional, valid URL
  "is_active": true              // optional, default true
}
```

### Update Brand
```
PATCH /brands/:id
Authorization: Bearer <access_token>
```

### Delete Brand
```
DELETE /brands/:id
Authorization: Bearer <access_token>
```

---

## Categories

### List Categories
```
GET /categories?limit=20&cursor=...
```

### Get Category
```
GET /categories/:id
```

### Create Category
```
POST /categories
Authorization: Bearer <access_token>
```
```json
{
  "name": "LED Paneller",  // required, max 100 chars
  "description": "...",    // optional
  "parent_id": "uuid",     // optional — for subcategories
  "sort_order": 0,         // optional, default 0
  "is_active": true        // optional, default true
}
```

### Update Category
```
PATCH /categories/:id
Authorization: Bearer <access_token>
```

### Delete Category
```
DELETE /categories/:id
Authorization: Bearer <access_token>
```

---

## Catalogs

### List Catalogs
```
GET /catalogs
```

### Get Catalog
```
GET /catalogs/:id
```

### Create Catalog
```
POST /catalogs
Authorization: Bearer <access_token>
```
```json
{
  "name": "2024 Yaz Kataloğu",   // required, max 200 chars
  "description": "...",           // optional
  "status": "draft",              // optional: draft|active|archived
  "valid_from": "2024-06-01",     // optional, YYYY-MM-DD
  "valid_to": "2024-08-31"        // optional, must be >= valid_from
}
```

### Update Catalog
```
PATCH /catalogs/:id
Authorization: Bearer <access_token>
```

### Delete Catalog
```
DELETE /catalogs/:id
Authorization: Bearer <access_token>
```

---

## Catalog Items

### List Items in Catalog
```
GET /catalogs/:id/items
```
```json
// 200 Response — array of:
{
  "id": "uuid",
  "catalog_id": "uuid",
  "product_id": "uuid",
  "sort_order": 0,
  "created_at": "..."
}
```

### Add Product to Catalog
```
POST /catalogs/:id/items
Authorization: Bearer <access_token>
```
```json
{
  "product_id": "uuid",  // required
  "sort_order": 0        // optional, default 0
}
```

### Update Item Sort Order
```
PATCH /catalogs/:catalogId/items/:itemId
Authorization: Bearer <access_token>
```
```json
{ "sort_order": 5 }
```

### Remove Product from Catalog
```
DELETE /catalogs/:catalogId/items/:itemId
Authorization: Bearer <access_token>
```

---

## Pricing

### Get Product Prices
```
GET /products/:id/pricing
```
```json
// 200 Response — array of:
{
  "id": "uuid",
  "product_id": "uuid",
  "catalog_id": "uuid | null",
  "price": 149.99,
  "currency": "TRY",
  "valid_from": "2024-01-01",
  "valid_to": null,
  "created_by": "uuid",
  "created_at": "...",
  "updated_at": "..."
}
```

### Create Price
```
POST /pricing
Authorization: Bearer <access_token>
```
```json
{
  "product_id": "uuid",       // required
  "catalog_id": "uuid",       // optional
  "price": 149.99,            // required, min 0
  "currency": "TRY",          // required, 3 chars (ISO 4217)
  "valid_from": "2024-01-01", // optional, YYYY-MM-DD
  "valid_to": "2024-12-31"    // optional, must be >= valid_from
}
```

### Update Price
```
PATCH /pricing/:id
Authorization: Bearer <access_token>
```
All fields optional.

### Delete Price
```
DELETE /pricing/:id
Authorization: Bearer <access_token>
```

---

## Files

### Upload File
```
POST /files/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Send as `multipart/form-data` with the file as a field (any field name is accepted).

**Allowed types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

```json
// 201 Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "bucket_name": "files",
    "storage_path": "uploads/uuid/filename.jpg",
    "original_filename": "product-photo.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 204800,
    "is_public": false,
    "uploaded_by": "uuid",
    "url": "https://storage.supabase.co/...",
    "created_at": "..."
  }
}
```

```js
// Example (fetch)
const formData = new FormData()
formData.append('file', fileInput.files[0])

const res = await fetch('/files/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData   // Do NOT set Content-Type manually — browser sets boundary automatically
})
```

---

### List Files
```
GET /files?limit=20&cursor=...&is_public=true
Authorization: Bearer <access_token>
```

| Query Param | Values          |
|-------------|-----------------|
| `is_public` | `true`, `false` |

---

### Get File
```
GET /files/:id
Authorization: Bearer <access_token>
```

---

### Delete File
```
DELETE /files/:id
Authorization: Bearer <access_token>
```

---

### Link File to an Entity
Attach an uploaded file to a product, brand, category, or catalog.

```
POST /files/:id/relations
Authorization: Bearer <access_token>
```
```json
{
  "entity_type": "product",      // required: product|brand|category|catalog
  "entity_id": "uuid",           // required: ID of the target entity
  "relation_type": "main_image", // required: main_image|gallery|document|attachment
  "sort_order": 0                // optional, default 0
}
```
```json
// 201 Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "file_id": "uuid",
    "entity_type": "product",
    "entity_id": "uuid",
    "relation_type": "main_image",
    "sort_order": 0,
    "created_at": "..."
  }
}
```

---

### Get Files of an Entity
```
GET /files/relations/:entityType/:entityId
Authorization: Bearer <access_token>
```
```
// Example:
GET /files/relations/product/550e8400-e29b-41d4-a716-446655440000
```

---

### Remove File Link
```
DELETE /files/relations/:id
Authorization: Bearer <access_token>
```

---

## Admin

> All admin endpoints require a `manager` or `admin` role.  
> Write operations (create, update, delete, role assignment) require `admin` role.

---

### List Users
```
GET /admin/users?limit=20&cursor=...&is_active=true&include_deleted=false
Authorization: Bearer <access_token>   (manager+)
```

| Query Param       | Values          |
|-------------------|-----------------|
| `is_active`       | `true`, `false` |
| `include_deleted` | `true`, `false` |

```json
// Response data items:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Ada Lovelace",
  "phone": null,
  "is_active": true,
  "email_verified": true,
  "last_login_at": "...",
  "created_at": "...",
  "deleted_at": null,
  "roles": ["viewer"]
}
```

---

### Get User
```
GET /admin/users/:id
Authorization: Bearer <access_token>   (manager+)
```

---

### Update User
```
PATCH /admin/users/:id
Authorization: Bearer <access_token>   (admin only)
```
```json
{
  "full_name": "Ada Byron",  // optional, 2–100 chars
  "is_active": false,        // optional
  "phone": "+905559876543"   // optional, nullable
}
```

---

### Delete User (Soft)
```
DELETE /admin/users/:id
Authorization: Bearer <access_token>   (admin only)
```

---

### Restore Deleted User
```
POST /admin/users/:id/restore
Authorization: Bearer <access_token>   (admin only)
```

---

### List Roles
```
GET /admin/roles
Authorization: Bearer <access_token>   (manager+)
```
```json
// Response data items:
{
  "id": "uuid",
  "name": "viewer",
  "description": "...",
  "is_system": true,
  "created_at": "...",
  "updated_at": "..."
}
```

---

### Assign Role to User
```
POST /admin/users/:id/roles
Authorization: Bearer <access_token>   (admin only)
```
```json
{ "role_id": "uuid" }
```

---

### Remove Role from User
```
DELETE /admin/users/:id/roles/:roleId
Authorization: Bearer <access_token>   (admin only)
```

---

### List Audit Logs
```
GET /admin/audit-logs?limit=50&cursor=...&user_id=uuid&event_category=auth
Authorization: Bearer <access_token>   (manager+)
```

| Query Param      | Values                                        |
|------------------|-----------------------------------------------|
| `event_category` | `auth` `data` `permission` `file` `security`  |
| `user_id`        | UUID — filter by specific user                |
| `entity_type`    | string — e.g. `product`, `user`               |

---

## Quick Reference

### Endpoint Summary

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /auth/register | — | — |
| POST | /auth/login | — | — |
| POST | /auth/refresh | — | — |
| POST | /auth/logout | ✓ | — |
| GET | /auth/me | ✓ | — |
| GET | /products | — | — |
| GET | /products/:id | — | — |
| POST | /products | ✓ | — |
| PATCH | /products/:id | ✓ | — |
| DELETE | /products/:id | ✓ | — |
| POST | /products/:id/restore | ✓ | — |
| GET | /brands | — | — |
| GET | /brands/:id | — | — |
| POST | /brands | ✓ | — |
| PATCH | /brands/:id | ✓ | — |
| DELETE | /brands/:id | ✓ | — |
| GET | /categories | — | — |
| GET | /categories/:id | — | — |
| POST | /categories | ✓ | — |
| PATCH | /categories/:id | ✓ | — |
| DELETE | /categories/:id | ✓ | — |
| GET | /catalogs | — | — |
| GET | /catalogs/:id | — | — |
| POST | /catalogs | ✓ | — |
| PATCH | /catalogs/:id | ✓ | — |
| DELETE | /catalogs/:id | ✓ | — |
| GET | /catalogs/:id/items | — | — |
| POST | /catalogs/:id/items | ✓ | — |
| PATCH | /catalogs/:catalogId/items/:itemId | ✓ | — |
| DELETE | /catalogs/:catalogId/items/:itemId | ✓ | — |
| GET | /products/:id/pricing | — | — |
| POST | /pricing | ✓ | — |
| PATCH | /pricing/:id | ✓ | — |
| DELETE | /pricing/:id | ✓ | — |
| POST | /files/upload | ✓ | — |
| GET | /files | ✓ | — |
| GET | /files/:id | ✓ | — |
| DELETE | /files/:id | ✓ | — |
| POST | /files/:id/relations | ✓ | — |
| GET | /files/relations/:entityType/:entityId | ✓ | — |
| DELETE | /files/relations/:id | ✓ | — |
| GET | /admin/users | ✓ | manager+ |
| GET | /admin/users/:id | ✓ | manager+ |
| PATCH | /admin/users/:id | ✓ | admin |
| DELETE | /admin/users/:id | ✓ | admin |
| POST | /admin/users/:id/restore | ✓ | admin |
| GET | /admin/roles | ✓ | manager+ |
| POST | /admin/users/:id/roles | ✓ | admin |
| DELETE | /admin/users/:id/roles/:roleId | ✓ | admin |
| GET | /admin/audit-logs | ✓ | manager+ |
| GET | /health | — | — |

> **Swagger UI** at `GET /docs` has interactive try-it-out for every endpoint.
