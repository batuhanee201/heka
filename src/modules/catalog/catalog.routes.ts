import type { FastifyInstance } from 'fastify'
import { CatalogService } from './catalog.service.js'
import { CatalogController } from './catalog.controller.js'

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  const svc = new CatalogService(app.supabase)
  const ctrl = new CatalogController(svc)

  const auth = { preHandler: [app.authenticate] }

  // ── Catalogs ───────────────────────────────────────────────────────────
  app.get('/catalogs', ctrl.listCatalogs)
  app.get('/catalogs/:id', ctrl.getCatalog)
  app.post('/catalogs', auth, ctrl.createCatalog)
  app.patch('/catalogs/:id', auth, ctrl.updateCatalog)
  app.delete('/catalogs/:id', auth, ctrl.deleteCatalog)

  // ── Catalog Items ──────────────────────────────────────────────────────
  app.get('/catalogs/:id/items', ctrl.listItems)
  app.post('/catalogs/:id/items', auth, ctrl.addItem)
  app.patch('/catalogs/:catalogId/items/:itemId', auth, ctrl.updateItem)
  app.delete('/catalogs/:catalogId/items/:itemId', auth, ctrl.removeItem)

  // ── Pricing ────────────────────────────────────────────────────────────
  app.get('/products/:id/pricing', ctrl.listPricing)
  app.post('/pricing', auth, ctrl.createPricing)
  app.patch('/pricing/:id', auth, ctrl.updatePricing)
  app.delete('/pricing/:id', auth, ctrl.deletePricing)
}
