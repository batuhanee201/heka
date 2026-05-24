import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken, type AccessTokenPayload } from '@/shared/utils/jwt.js'
import { AppError } from '@/shared/errors/index.js'
import { sendError } from '@/shared/utils/response.js'

async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(reply, AppError.unauthorized())
      return
    }

    const token = authHeader.slice(7)

    try {
      const payload = await verifyToken<AccessTokenPayload>(token)
      if (payload.type !== 'access') {
        sendError(reply, new AppError('Geçersiz token türü', 'TOKEN_INVALID', 401))
        return
      }
      req.userId = payload.sub
      req.userRole = payload.role
    } catch (err) {
      sendError(reply, err instanceof AppError ? err : AppError.unauthorized())
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(authPlugin, { name: 'auth' })
