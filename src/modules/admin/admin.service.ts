import type { SupabaseClient } from '@supabase/supabase-js'
import { AdminRepository } from './admin.repository.js'
import type {
  UpdateUserInput, AssignRoleInput,
  AuditLogQuery, UserListQuery,
} from './admin.schema.js'
import type { AdminUserView, RoleRecord, AuditLogRecord } from './admin.types.js'
import { AppError } from '@/shared/errors/index.js'

export class AdminService {
  private readonly repo: AdminRepository

  constructor(db: SupabaseClient) {
    this.repo = new AdminRepository(db)
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async listUsers(query: UserListQuery): Promise<{ items: AdminUserView[]; total: number }> {
    return this.repo.findUsers(query)
  }

  async getUser(id: string): Promise<AdminUserView> {
    const user = await this.repo.findUserById(id)
    if (!user) throw AppError.notFound('Kullanıcı')
    return user
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<AdminUserView> {
    const existing = await this.repo.findUserById(id)
    if (!existing) throw AppError.notFound('Kullanıcı')

    const updates: Record<string, unknown> = {}
    if (input.full_name !== undefined) updates['full_name'] = input.full_name
    if (input.is_active !== undefined) updates['is_active'] = input.is_active
    if (input.phone !== undefined) updates['phone'] = input.phone

    if (Object.keys(updates).length > 0) {
      await this.repo.updateUser(id, updates)
    }

    return this.repo.findUserById(id) as Promise<AdminUserView>
  }

  async deleteUser(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) throw new AppError('Kendinizi silemezsiniz', 'FORBIDDEN', 403)
    const existing = await this.repo.findUserById(id)
    if (!existing) throw AppError.notFound('Kullanıcı')
    await this.repo.softDeleteUser(id)
  }

  async restoreUser(id: string): Promise<void> {
    await this.repo.restoreUser(id)
  }

  // ── Roles ──────────────────────────────────────────────────────────────

  async listRoles(): Promise<RoleRecord[]> {
    return this.repo.findAllRoles()
  }

  async assignRole(userId: string, input: AssignRoleInput): Promise<void> {
    const user = await this.repo.findUserById(userId)
    if (!user) throw AppError.notFound('Kullanıcı')

    const role = await this.repo.findRoleById(input.role_id)
    if (!role) throw AppError.notFound('Rol')

    await this.repo.assignRole(userId, input.role_id)
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const role = await this.repo.findRoleById(roleId)
    if (!role) throw AppError.notFound('Rol')
    if (role.is_system) throw new AppError('Sistem rolleri kaldırılamaz', 'FORBIDDEN', 403)
    await this.repo.removeRole(userId, roleId)
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────

  async listAuditLogs(query: AuditLogQuery): Promise<{ items: AuditLogRecord[]; total: number }> {
    return this.repo.findAuditLogs(query)
  }
}
