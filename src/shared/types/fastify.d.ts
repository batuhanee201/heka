import type { SupabaseClient } from '@supabase/supabase-js'

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient
  }

  interface FastifyRequest {
    userId: string
    userRole: string
  }
}
