import Fastify from 'fastify'
import { env } from '@/config/env.js'
import { sendError } from '@/shared/utils/response.js'
import { AppError } from '@/shared/errors/index.js'
import { registerAuditHook } from '@/shared/hooks/audit.js'

import supabasePlugin from '@/plugins/supabase.js'
import corsPlugin from '@/plugins/cors.js'
import rateLimitPlugin from '@/plugins/rate-limit.js'
import authPlugin from '@/plugins/auth.js'
import multipartPlugin from '@/plugins/multipart.js'

import { authRoutes } from '@/modules/auth/auth.routes.js'
import { productRoutes } from '@/modules/product/product.routes.js'
import { catalogRoutes } from '@/modules/catalog/catalog.routes.js'
import { filesRoutes } from '@/modules/files/files.routes.js'
import { adminRoutes } from '@/modules/admin/admin.routes.js'

export async function buildApp() {
  const isDev = env.NODE_ENV === 'development'
  const isTest = env.NODE_ENV === 'test'

  const app = Fastify({
    logger: isTest
      ? false
      : isDev
        ? {
            level: env.LOG_LEVEL,
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : { level: env.LOG_LEVEL },
    trustProxy: true,
    ajv: { customOptions: { removeAdditional: true, coerceTypes: true, useDefaults: true } },
  })

  // Plugins — sıra önemli: rate-limit → cors → supabase → auth → multipart
  await app.register(rateLimitPlugin)
  await app.register(corsPlugin)
  await app.register(supabasePlugin)
  await app.register(authPlugin)
  await app.register(multipartPlugin)

  // Hooks
  registerAuditHook(app)

  // Global hata işleyici
  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, 'İşlenmeyen hata')
    if (error.name === 'AppError') {
      sendError(reply, error as AppError)
    } else if (error.statusCode) {
      reply.status(error.statusCode).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      })
    } else {
      sendError(reply, AppError.internal())
    }
  })

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: `${req.method} ${req.url} bulunamadı` },
    })
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', env: env.NODE_ENV }))

  // Modül rotaları
  await app.register(authRoutes)
  await app.register(productRoutes)
  await app.register(catalogRoutes)
  await app.register(filesRoutes)
  await app.register(adminRoutes)

  return app
}
