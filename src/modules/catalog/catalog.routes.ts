import type { FastifyInstance } from 'fastify'

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/catalogs/health', async () => ({ module: 'catalog', status: 'ok' }))
  // TODO: list, get, create, update, delete, items CRUD, pricing CRUD
}
