import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Heka API',
        description: 'B2B LED ürün yönetim sistemi API dokümantasyonu',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Local' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Kimlik doğrulama' },
        { name: 'Products', description: 'Ürün yönetimi' },
        { name: 'Brands', description: 'Marka yönetimi' },
        { name: 'Categories', description: 'Kategori yönetimi' },
        { name: 'Catalogs', description: 'Katalog yönetimi' },
        { name: 'Pricing', description: 'Fiyatlandırma' },
        { name: 'Files', description: 'Dosya yönetimi' },
        { name: 'Admin', description: 'Admin paneli' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: false,
  })
})
