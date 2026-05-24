import { buildApp } from '@/app.js'
import { env } from '@/config/env.js'
import { logger } from '@/shared/utils/logger.js'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    logger.info({ port: env.PORT, host: env.HOST }, 'Sunucu başlatıldı')
  } catch (err) {
    logger.fatal({ err }, 'Sunucu başlatılamadı')
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Kapatma sinyali alındı')
    try {
      await app.close()
      logger.info('Sunucu düzgünce kapatıldı')
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Kapatma sırasında hata')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'İşlenmemiş Promise reddi')
    process.exit(1)
  })
}

start()
