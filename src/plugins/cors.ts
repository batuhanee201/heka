import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { env } from '@/config/env.js'

async function corsPlugin(app: FastifyInstance): Promise<void> {
  const origin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim())

  await app.register(cors, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
}

export default fp(corsPlugin, { name: 'cors' })
