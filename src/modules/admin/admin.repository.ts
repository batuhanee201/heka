import type { SupabaseClient } from '@supabase/supabase-js'
import type { RoleRecord, AuditLogRecord, AdminUserView } from './admin.types.js'
import type { UserListQuery, AuditLogQuery } from './admin.schema.js'
import { AppError } from '@/shared/errors/index.js'

export class AdminRepository {
  constructor(private readonly db: SupabaseClient) {}

  // ── Users ──────────────────────────────────────────────────────────────

  async findUsers(query: UserListQuery): Promise<{ items: AdminUserView[]; total: number }> {
    let q = this.db
      .from('users')
      .select('id, email, full_name, phone, is_active, email_verified, last_login_at, created_at, deleted_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(query.limit)

    if (query.include_deleted !== 'true') q = q.is('deleted_at', null)
    if (query.is_active === 'true') q = q.eq('is_active', true)
    if (query.is_active === 'false') q = q.eq('is_active', false)

    const { data, error, count } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)

    const users = data ?? []
    const userIds = users.map((u: { id: string }) => u.id)

    // fetch roles for all users in one query
    let rolesMap: Record<string, string[]> = {}
    if (userIds.length > 0) {
      const { data: urData } = await this.db
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', userIds)
      if (urData) {
        for (const row of urData as Array<{ user_id: string; roles: { name: string } }>) {
          if (!rolesMap[row.user_id]) rolesMap[row.user_id] = []
          rolesMap[row.user_id]!.push(row.roles.name)
        }
      }
    }

    const items = users.map((u: AdminUserView) => ({ ...u, roles: rolesMap[u.id] ?? [] }))
    return { items, total: count ?? 0 }
  }

  async findUserById(id: string): Promise<AdminUserView | null> {
    const { data, error } = await this.db
      .from('users')
      .select('id, email, full_name, phone, is_active, email_verified, last_login_at, created_at, deleted_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    if (!data) return null

    const { data: urData } = await this.db
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', id)
    const roles = (urData ?? []).map((r: { roles: { name: string } }) => r.roles.name)

    return { ...(data as Omit<AdminUserView, 'roles'>), roles }
  }

  async updateUser(id: string, input: Record<string, unknown>): Promise<void> {
    const { error } = await this.db.from('users').update(input).eq('id', id)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async softDeleteUser(id: string): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async restoreUser(id: string): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ deleted_at: null, is_active: true })
      .eq('id', id)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  // ── Roles ──────────────────────────────────────────────────────────────

  async findAllRoles(): Promise<RoleRecord[]> {
    const { data, error } = await this.db.from('roles').select('*').order('name')
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as RoleRecord[]
  }

  async findRoleById(id: string): Promise<RoleRecord | null> {
    const { data, error } = await this.db.from('roles').select('*').eq('id', id).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as RoleRecord | null
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const { error } = await this.db
      .from('user_roles')
      .insert({ user_id: userId, role_id: roleId })
    if (error) {
      if (error.code === '23505') throw new AppError('Bu rol zaten atanmış', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const { error } = await this.db
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────

  async findAuditLogs(query: AuditLogQuery): Promise<{ items: AuditLogRecord[]; total: number }> {
    let q = this.db
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(query.limit)

    if (query.user_id) q = q.eq('user_id', query.user_id)
    if (query.event_category) q = q.eq('event_category', query.event_category)
    if (query.entity_type) q = q.eq('entity_type', query.entity_type)

    const { data, error, count } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return { items: (data ?? []) as AuditLogRecord[], total: count ?? 0 }
  }
}
