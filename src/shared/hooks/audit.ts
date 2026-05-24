import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export interface AuditContext {
  action: string
  category: 'auth' | 'data' | 'file' | 'admin' | 'system'
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
}

declare module 'fastify' {
  interface FastifyRequest {
    auditContext?: AuditContext
  }
}

export function registerAuditHook(app: FastifyInstance): void {
  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = req.auditContext
    if (!ctx || !req.userId) return

    const statusCode = reply.statusCode
    if (statusCode >= 400) return

    try {
      await app.supabase.from('audit_logs').insert({
        user_id: req.userId,
        action: ctx.action,
        event_category: ctx.category,
        entity_type: ctx.entity_type ?? null,
        entity_id: ctx.entity_id ?? null,
        metadata: {
          ...ctx.metadata,
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          status_code: statusCode,
        },
      })
    } catch {
      req.log.warn({ action: ctx.action }, 'Audit log yazılamadı')
    }
  })
}
