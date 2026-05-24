import type { FastifyInstance } from 'fastify'

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/health', async () => ({ module: 'admin', status: 'ok' }))
  // TODO: users list, user get/update/delete/restore, roles list, audit-logs list
}
