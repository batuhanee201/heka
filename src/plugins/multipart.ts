import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

const MB = 1024 * 1024

async function multipartPlugin(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * MB,
      files: 5,
      fieldSize: 1 * MB,
    },
  })
}

export default fp(multipartPlugin, { name: 'multipart' })
