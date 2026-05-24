import type { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const service = new AuthService(app.supabase)
  const ctrl = new AuthController(service)

  // Public routes
  app.post('/auth/register', ctrl.register)
  app.post('/auth/login', ctrl.login)
  app.post('/auth/refresh', ctrl.refresh)

  // Protected routes
  app.post('/auth/logout', { preHandler: [app.authenticate] }, ctrl.logout)
  app.get('/auth/me', { preHandler: [app.authenticate] }, ctrl.me)
}
