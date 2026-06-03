import type { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { CatalogService } from './catalog.service.js'
import { CatalogController } from './catalog.controller.js'

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  const svc = new CatalogService(app.supabase)
  const ctrl = new CatalogController(svc)

  const auth = { preHandler: [app.authenticate] }
  const security = [{ bearerAuth: [] }]
  const h = <T>(fn: T) => fn as unknown as RouteHandlerMethod

  // ── Catalogs ───────────────────────────────────────────────────────────
  app.get('/catalogs', { schema: { tags: ['Catalogs'], summary: 'Katalog listesi' } }, h(ctrl.listCatalogs))
  app.get('/catalogs/:id', { schema: { tags: ['Catalogs'], summary: 'Katalog detayı' } }, h(ctrl.getCatalog))
  app.post('/catalogs', { ...auth, schema: { tags: ['Catalogs'], summary: 'Katalog oluştur', security, body: { type: 'object', required: ['name', 'valid_from', 'valid_to'], properties: { name: { type: 'string' }, description: { type: 'string' }, valid_from: { type: 'string', format: 'date' }, valid_to: { type: 'string', format: 'date' }, status: { type: 'string', enum: ['draft', 'active', 'archived'] } } } } }, h(ctrl.createCatalog))
  app.patch('/catalogs/:id', { ...auth, schema: { tags: ['Catalogs'], summary: 'Katalog güncelle', security } }, h(ctrl.updateCatalog))
  app.delete('/catalogs/:id', { ...auth, schema: { tags: ['Catalogs'], summary: 'Katalog sil', security } }, h(ctrl.deleteCatalog))

  // ── Catalog Items ──────────────────────────────────────────────────────
  app.get('/catalogs/:id/items', { schema: { tags: ['Catalogs'], summary: 'Katalog ürünleri' } }, h(ctrl.listItems))
  app.post('/catalogs/:id/items', { ...auth, schema: { tags: ['Catalogs'], summary: 'Kataloğa ürün ekle', security, body: { type: 'object', required: ['product_id'], properties: { product_id: { type: 'string', format: 'uuid' }, sort_order: { type: 'integer' } } } } }, h(ctrl.addItem))
  app.patch('/catalogs/:catalogId/items/:itemId', { ...auth, schema: { tags: ['Catalogs'], summary: 'Katalog ürünü güncelle', security } }, h(ctrl.updateItem))
  app.delete('/catalogs/:catalogId/items/:itemId', { ...auth, schema: { tags: ['Catalogs'], summary: 'Katalogdan ürün çıkar', security } }, h(ctrl.removeItem))

  // ── Pricing ────────────────────────────────────────────────────────────
  app.get('/products/:id/pricing', { schema: { tags: ['Pricing'], summary: 'Ürün fiyatları' } }, h(ctrl.listPricing))
  app.post('/pricing', { ...auth, schema: { tags: ['Pricing'], summary: 'Fiyat oluştur', security, body: { type: 'object', required: ['product_id', 'catalog_id', 'price', 'currency'], properties: { product_id: { type: 'string', format: 'uuid' }, catalog_id: { type: 'string', format: 'uuid' }, price: { type: 'number' }, currency: { type: 'string' }, unit: { type: 'string' }, min_qty: { type: 'integer' } } } } }, h(ctrl.createPricing))
  app.patch('/pricing/:id', { ...auth, schema: { tags: ['Pricing'], summary: 'Fiyat güncelle', security } }, h(ctrl.updatePricing))
  app.delete('/pricing/:id', { ...auth, schema: { tags: ['Pricing'], summary: 'Fiyat sil', security } }, h(ctrl.deletePricing))
}
