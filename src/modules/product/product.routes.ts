import type { FastifyInstance } from 'fastify'

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get('/products/health', async () => ({ module: 'product', status: 'ok' }))
  // TODO: list, get, create, update, delete, restore, brands CRUD, categories CRUD
}
