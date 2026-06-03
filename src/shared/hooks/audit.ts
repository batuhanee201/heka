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
    if (!req.userId) return

    const ctx = req.auditContext
    const statusCode = reply.statusCode
    const isFailure = statusCode >= 400
    const isSecurityEvent = statusCode === 401 || statusCode === 403

    // Skip non-security failures without explicit audit context
    if (isFailure && !isSecurityEvent && !ctx) return
    if (!isFailure && !ctx) return

    try {
      await app.supabase.from('audit_logs').insert({
        user_id: req.userId,
        action: ctx?.action ?? `${req.method} ${req.url}`,
        event_category: ctx?.category ?? (isSecurityEvent ? 'security' : 'system'),
        entity_type: ctx?.entity_type ?? null,
        entity_id: ctx?.entity_id ?? null,
        metadata: {
          ...ctx?.metadata,
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          status_code: statusCode,
          success: !isFailure,
        },
      })
    } catch {
      req.log.warn({ action: ctx?.action }, 'Audit log yazılamadı')
    }
  })
}
