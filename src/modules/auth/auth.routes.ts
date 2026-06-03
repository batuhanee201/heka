import type { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'

const AUTH_RATE_LIMIT = { max: 10, timeWindow: 60_000 }

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const service = new AuthService(app.supabase)
  const ctrl = new AuthController(service)

  const tags = ['Auth']
  const security = [{ bearerAuth: [] }]

  app.post('/auth/register', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    schema: {
      tags,
      summary: 'Kayıt ol',
      security: [],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          full_name: { type: 'string' },
          phone: { type: 'string' },
        },
      },
    },
  }, ctrl.register)

  app.post('/auth/login', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    schema: {
      tags,
      summary: 'Giriş yap',
      security: [],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
  }, ctrl.login)

  app.post('/auth/refresh', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    schema: {
      tags,
      summary: 'Token yenile',
      security: [],
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
    },
  }, ctrl.refresh)

  app.post('/auth/logout', {
    preHandler: [app.authenticate],
    schema: { tags, summary: 'Çıkış yap', security },
  }, ctrl.logout)

  app.get('/auth/me', {
    preHandler: [app.authenticate],
    schema: { tags, summary: 'Mevcut kullanıcı bilgisi', security },
  }, ctrl.me)
}
