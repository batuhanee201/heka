import type { FastifyInstance } from 'fastify'
import { ProductService } from './product.service.js'
import { ProductController } from './product.controller.js'

export async function productRoutes(app: FastifyInstance): Promise<void> {
  const svc = new ProductService(app.supabase)
  const ctrl = new ProductController(svc)

  const auth = { preHandler: [app.authenticate] }

  // ── Brands ─────────────────────────────────────────────────────────────
  app.get('/brands', ctrl.listBrands)
  app.get('/brands/:id', ctrl.getBrand)
  app.post('/brands', auth, ctrl.createBrand)
  app.patch('/brands/:id', auth, ctrl.updateBrand)
  app.delete('/brands/:id', auth, ctrl.deleteBrand)

  // ── Categories ─────────────────────────────────────────────────────────
  app.get('/categories', ctrl.listCategories)
  app.get('/categories/:id', ctrl.getCategory)
  app.post('/categories', auth, ctrl.createCategory)
  app.patch('/categories/:id', auth, ctrl.updateCategory)
  app.delete('/categories/:id', auth, ctrl.deleteCategory)

  // ── Products ───────────────────────────────────────────────────────────
  app.get('/products', ctrl.listProducts)
  app.get('/products/:id', ctrl.getProduct)
  app.post('/products', auth, ctrl.createProduct)
  app.patch('/products/:id', auth, ctrl.updateProduct)
  app.delete('/products/:id', auth, ctrl.deleteProduct)
  app.post('/products/:id/restore', auth, ctrl.restoreProduct)
}
