import type { FastifyInstance } from 'fastify'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/auth/health', async () => ({ module: 'auth', status: 'ok' }))
  // TODO: register, login, refresh, logout, verify-email, forgot-password, reset-password, me
}
