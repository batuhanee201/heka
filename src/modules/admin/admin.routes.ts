import type { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { AdminService } from './admin.service.js'
import { AdminController } from './admin.controller.js'
import { requireAdmin, requireManager } from '@/shared/middleware/role-check.js'

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const svc = new AdminService(app.supabase)
  const ctrl = new AdminController(svc)

  const security = [{ bearerAuth: [] }]
  const asAdmin = { preHandler: [app.authenticate, requireAdmin()] }
  const asManager = { preHandler: [app.authenticate, requireManager()] }

  const h = <T>(fn: T) => fn as unknown as RouteHandlerMethod

  // ── Users ──────────────────────────────────────────────────────────────
  app.get('/admin/users', { ...asManager, schema: { tags: ['Admin'], summary: 'Kullanıcı listesi (manager+)', security, querystring: { type: 'object', properties: { limit: { type: 'integer' }, cursor: { type: 'string' }, is_active: { type: 'string', enum: ['true', 'false'] }, include_deleted: { type: 'string', enum: ['true', 'false'] } } } } }, h(ctrl.listUsers))
  app.get('/admin/users/:id', { ...asManager, schema: { tags: ['Admin'], summary: 'Kullanıcı detayı (manager+)', security } }, h(ctrl.getUser))
  app.patch('/admin/users/:id', { ...asAdmin, schema: { tags: ['Admin'], summary: 'Kullanıcı güncelle (admin)', security, body: { type: 'object', properties: { full_name: { type: 'string' }, is_active: { type: 'boolean' }, phone: { type: 'string' } } } } }, h(ctrl.updateUser))
  app.delete('/admin/users/:id', { ...asAdmin, schema: { tags: ['Admin'], summary: 'Kullanıcı sil (admin)', security } }, h(ctrl.deleteUser))
  app.post('/admin/users/:id/restore', { ...asAdmin, schema: { tags: ['Admin'], summary: 'Kullanıcı geri yükle (admin)', security } }, h(ctrl.restoreUser))

  // ── Roles ──────────────────────────────────────────────────────────────
  app.get('/admin/roles', { ...asManager, schema: { tags: ['Admin'], summary: 'Rol listesi (manager+)', security } }, h(ctrl.listRoles))
  app.post('/admin/users/:id/roles', { ...asAdmin, schema: { tags: ['Admin'], summary: 'Kullanıcıya rol ata (admin)', security, body: { type: 'object', required: ['role_id'], properties: { role_id: { type: 'string', format: 'uuid' } } } } }, h(ctrl.assignRole))
  app.delete('/admin/users/:id/roles/:roleId', { ...asAdmin, schema: { tags: ['Admin'], summary: 'Kullanıcıdan rol kaldır (admin)', security } }, h(ctrl.removeRole))

  // ── Audit Logs ─────────────────────────────────────────────────────────
  app.get('/admin/audit-logs', { ...asManager, schema: { tags: ['Admin'], summary: 'Audit log (manager+)', security, querystring: { type: 'object', properties: { limit: { type: 'integer' }, cursor: { type: 'string' }, user_id: { type: 'string' }, event_category: { type: 'string', enum: ['auth', 'data', 'permission', 'file', 'security'] }, entity_type: { type: 'string' } } } } }, h(ctrl.listAuditLogs))
}
