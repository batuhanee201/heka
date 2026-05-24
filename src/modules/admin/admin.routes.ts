import type { FastifyInstance } from 'fastify'
import { AdminService } from './admin.service.js'
import { AdminController } from './admin.controller.js'
import { requireAdmin, requireManager } from '@/shared/middleware/role-check.js'

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const svc = new AdminService(app.supabase)
  const ctrl = new AdminController(svc)

  const asAdmin = { preHandler: [app.authenticate, requireAdmin()] }
  const asManager = { preHandler: [app.authenticate, requireManager()] }

  // ── Users ──────────────────────────────────────────────────────────────
  app.get('/admin/users', asManager, ctrl.listUsers)
  app.get('/admin/users/:id', asManager, ctrl.getUser)
  app.patch('/admin/users/:id', asAdmin, ctrl.updateUser)
  app.delete('/admin/users/:id', asAdmin, ctrl.deleteUser)
  app.post('/admin/users/:id/restore', asAdmin, ctrl.restoreUser)

  // ── Roles ──────────────────────────────────────────────────────────────
  app.get('/admin/roles', asManager, ctrl.listRoles)
  app.post('/admin/users/:id/roles', asAdmin, ctrl.assignRole)
  app.delete('/admin/users/:id/roles/:roleId', asAdmin, ctrl.removeRole)

  // ── Audit Logs ─────────────────────────────────────────────────────────
  app.get('/admin/audit-logs', asManager, ctrl.listAuditLogs)
}
