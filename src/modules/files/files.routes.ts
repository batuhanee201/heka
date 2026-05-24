import type { FastifyInstance } from 'fastify'

export async function filesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/files/health', async () => ({ module: 'files', status: 'ok' }))
  // TODO: upload, list, get, delete, file-relations
}
