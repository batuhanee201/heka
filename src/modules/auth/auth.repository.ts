import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRecord, SessionRecord } from './auth.types.js'
import { AppError } from '@/shared/errors/index.js'

export class AuthRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as UserRecord | null
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as UserRecord | null
  }

  async createUser(input: {
    supabase_auth_id: string
    email: string
    full_name: string
    password_hash: string
    phone?: string
  }): Promise<UserRecord> {
    const { data, error } = await this.db
      .from('users')
      .insert(input)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError('Bu e-posta zaten kayıtlı', 'EMAIL_ALREADY_EXISTS', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as UserRecord
  }

  async updateLastLogin(userId: string): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async getUserRole(userId: string): Promise<string> {
    const { data } = await this.db
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    const roleName = (data as { roles: { name: string } } | null)?.roles?.name
    return roleName ?? 'viewer'
  }

  async createSession(input: {
    user_id: string
    refresh_token_hash: string
    ip_address?: string
    user_agent?: string
    expires_at: string
  }): Promise<SessionRecord> {
    const { data, error } = await this.db
      .from('sessions')
      .insert(input)
      .select()
      .single()

    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as SessionRecord
  }

  async findSessionByTokenHash(hash: string): Promise<SessionRecord | null> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('refresh_token_hash', hash)
      .is('revoked_at', null)
      .maybeSingle()

    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as SessionRecord | null
  }

  async revokeSession(sessionId: string): Promise<void> {
    const { error } = await this.db
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const { error } = await this.db
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async updateSessionActivity(sessionId: string, newTokenHash: string): Promise<void> {
    const { error } = await this.db
      .from('sessions')
      .update({
        refresh_token_hash: newTokenHash,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
