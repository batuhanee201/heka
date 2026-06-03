import type { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { ProductService } from './product.service.js'
import { ProductController } from './product.controller.js'

export async function productRoutes(app: FastifyInstance): Promise<void> {
  const svc = new ProductService(app.supabase)
  const ctrl = new ProductController(svc)

  const auth = { preHandler: [app.authenticate] }
  const security = [{ bearerAuth: [] }]
  const h = <T>(fn: T) => fn as unknown as RouteHandlerMethod

  // ── Brands ─────────────────────────────────────────────────────────────
  app.get('/brands', { schema: { tags: ['Brands'], summary: 'Marka listesi' } }, h(ctrl.listBrands))
  app.get('/brands/:id', { schema: { tags: ['Brands'], summary: 'Marka detayı' } }, h(ctrl.getBrand))
  app.post('/brands', { ...auth, schema: { tags: ['Brands'], summary: 'Marka oluştur', security, body: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, website_url: { type: 'string' } } } } }, h(ctrl.createBrand))
  app.patch('/brands/:id', { ...auth, schema: { tags: ['Brands'], summary: 'Marka güncelle', security } }, h(ctrl.updateBrand))
  app.delete('/brands/:id', { ...auth, schema: { tags: ['Brands'], summary: 'Marka sil', security } }, h(ctrl.deleteBrand))

  // ── Categories ─────────────────────────────────────────────────────────
  app.get('/categories', { schema: { tags: ['Categories'], summary: 'Kategori listesi' } }, h(ctrl.listCategories))
  app.get('/categories/:id', { schema: { tags: ['Categories'], summary: 'Kategori detayı' } }, h(ctrl.getCategory))
  app.post('/categories', { ...auth, schema: { tags: ['Categories'], summary: 'Kategori oluştur', security, body: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, parent_id: { type: 'string', format: 'uuid' } } } } }, h(ctrl.createCategory))
  app.patch('/categories/:id', { ...auth, schema: { tags: ['Categories'], summary: 'Kategori güncelle', security } }, h(ctrl.updateCategory))
  app.delete('/categories/:id', { ...auth, schema: { tags: ['Categories'], summary: 'Kategori sil', security } }, h(ctrl.deleteCategory))

  // ── Products ───────────────────────────────────────────────────────────
  app.get('/products', { schema: { tags: ['Products'], summary: 'Ürün listesi', querystring: { type: 'object', properties: { limit: { type: 'integer' }, cursor: { type: 'string' }, status: { type: 'string' }, brand_id: { type: 'string' }, category_id: { type: 'string' } } } } }, h(ctrl.listProducts))
  app.get('/products/:id', { schema: { tags: ['Products'], summary: 'Ürün detayı' } }, h(ctrl.getProduct))
  app.post('/products', { ...auth, schema: { tags: ['Products'], summary: 'Ürün oluştur', security, body: { type: 'object', required: ['name', 'code', 'brand_id', 'category_id'], properties: { name: { type: 'string' }, code: { type: 'string' }, brand_id: { type: 'string' }, category_id: { type: 'string' }, status: { type: 'string', enum: ['active', 'draft', 'discontinued'] }, short_description: { type: 'string' }, description: { type: 'string' } } } } }, h(ctrl.createProduct))
  app.patch('/products/:id', { ...auth, schema: { tags: ['Products'], summary: 'Ürün güncelle', security } }, h(ctrl.updateProduct))
  app.delete('/products/:id', { ...auth, schema: { tags: ['Products'], summary: 'Ürün sil', security } }, h(ctrl.deleteProduct))
  app.post('/products/:id/restore', { ...auth, schema: { tags: ['Products'], summary: 'Ürün geri yükle', security } }, h(ctrl.restoreProduct))
}
