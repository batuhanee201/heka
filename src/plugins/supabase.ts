import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import type { FastifyInstance } from 'fastify'
import { env } from '@/config/env.js'

async function supabasePlugin(app: FastifyInstance): Promise<void> {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  app.decorate('supabase', client)

  app.addHook('onClose', async () => {
    app.log.info('Supabase bağlantısı kapatılıyor')
  })
}

export default fp(supabasePlugin, { name: 'supabase' })
