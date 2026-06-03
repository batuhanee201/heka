import type { FastifyRequest, FastifyReply } from 'fastify'
import { AdminService } from './admin.service.js'
import {
  UpdateUserSchema, AssignRoleSchema,
  AuditLogQuerySchema, UserListQuerySchema,
} from './admin.schema.js'
import { sendSuccess, sendCreated, sendNoContent, sendError, sendList } from '@/shared/utils/response.js'
import { buildPaginationMeta } from '@/shared/utils/pagination.js'
import { AppError } from '@/shared/errors/index.js'

type IdParam = { Params: { id: string } }
type UserRoleParam = { Params: { id: string; roleId: string } }

export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ── Users ──────────────────────────────────────────────────────────────

  listUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = UserListQuerySchema.safeParse(req.query)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz sorgu', p.error.flatten())); return }
    try {
      const result = await this.svc.listUsers(p.data)
      const pagination = buildPaginationMeta(result.total, p.data.limit, result.items, 'created_at')
      sendList(reply, result.items, pagination)
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  getUser = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { user: await this.svc.getUser(req.params.id) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateUser = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdateUserSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz kullanıcı verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { user: await this.svc.updateUser(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteUser = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteUser(req.params.id, req.userId); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  restoreUser = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.restoreUser(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Roles ──────────────────────────────────────────────────────────────

  listRoles = async (_req: FastifyRequest, reply: FastifyReply) => {
    try { sendSuccess(reply, { roles: await this.svc.listRoles() }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  assignRole = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = AssignRoleSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('role_id gerekli', p.error.flatten())); return }
    try { await this.svc.assignRole(req.params.id, p.data); sendCreated(reply, { message: 'Rol atandı' }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  removeRole = async (req: FastifyRequest<UserRoleParam>, reply: FastifyReply) => {
    try { await this.svc.removeRole(req.params.id, req.params.roleId); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────

  listAuditLogs = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = AuditLogQuerySchema.safeParse(req.query)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz sorgu', p.error.flatten())); return }
    try {
      const result = await this.svc.listAuditLogs(p.data)
      const pagination = buildPaginationMeta(result.total, p.data.limit, result.items, 'created_at')
      sendList(reply, result.items, pagination)
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }
}
