import { randomUUID, createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthRepository } from './auth.repository.js'
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schema.js'
import type { LoginResult, PublicUser } from './auth.types.js'
import { hashPassword, verifyPassword } from '@/shared/utils/hash.js'
import { signAccessToken, signRefreshToken, verifyToken } from '@/shared/utils/jwt.js'
import { AppError } from '@/shared/errors/index.js'
import { env } from '@/config/env.js'

const REFRESH_EXPIRES_MS = parseDuration(env.JWT_REFRESH_EXPIRES_IN)
const ACCESS_EXPIRES_SECONDS = parseDurationSeconds(env.JWT_ACCESS_EXPIRES_IN)

function parseDuration(str: string): number {
  const unit = str.slice(-1)
  const value = parseInt(str.slice(0, -1), 10)
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return value * (map[unit] ?? 60_000)
}

function parseDurationSeconds(str: string): number {
  return parseDuration(str) / 1000
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function toPublicUser(user: Awaited<ReturnType<AuthRepository['findUserByEmail']>>): PublicUser {
  if (!user) throw AppError.internal()
  const { supabase_auth_id: _s, deleted_at: _d, ...pub } = user
  return pub
}

export class AuthService {
  private readonly repo: AuthRepository

  constructor(db: SupabaseClient) {
    this.repo = new AuthRepository(db)
  }

  async register(input: RegisterInput): Promise<PublicUser> {
    const existing = await this.repo.findUserByEmail(input.email)
    if (existing) {
      throw new AppError('Bu e-posta adresi zaten kayıtlı', 'EMAIL_ALREADY_EXISTS', 409)
    }

    const password_hash = await hashPassword(input.password)
    const supabase_auth_id = randomUUID()

    const user = await this.repo.createUser({
      supabase_auth_id,
      email: input.email,
      full_name: input.full_name,
      password_hash,
      ...(input.phone && { phone: input.phone }),
    })

    return toPublicUser(user)
  }

  async login(
    input: LoginInput,
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(input.email)

    if (!user || !user.is_active) {
      throw new AppError('E-posta veya şifre hatalı', 'INVALID_CREDENTIALS', 401)
    }

    const valid = await verifyPassword(user.password_hash, input.password)
    if (!valid) {
      throw new AppError('E-posta veya şifre hatalı', 'INVALID_CREDENTIALS', 401)
    }

    const role = await this.repo.getUserRole(user.id)

    const plainRefreshToken = randomUUID()
    const tokenHash = hashRefreshToken(plainRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString()

    await this.repo.createSession({
      user_id: user.id,
      refresh_token_hash: tokenHash,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
      expires_at: expiresAt,
    })

    await this.repo.updateLastLogin(user.id)

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, role),
      signRefreshToken(user.id, plainRefreshToken),
    ])

    return {
      user: toPublicUser(user),
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_EXPIRES_SECONDS,
      },
    }
  }

  async refresh(input: RefreshInput): Promise<{ access_token: string; expires_in: number }> {
    const payload = await verifyToken<{ sub: string; jti: string; type: string }>(input.refresh_token)

    if (payload.type !== 'refresh') {
      throw new AppError('Geçersiz token türü', 'REFRESH_TOKEN_INVALID', 401)
    }

    const tokenHash = hashRefreshToken(payload.jti)
    const session = await this.repo.findSessionByTokenHash(tokenHash)

    if (!session || new Date(session.expires_at) < new Date()) {
      throw new AppError('Oturum süresi dolmuş veya geçersiz', 'REFRESH_TOKEN_INVALID', 401)
    }

    const user = await this.repo.findUserById(session.user_id)
    if (!user || !user.is_active) {
      throw new AppError('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 401)
    }

    const role = await this.repo.getUserRole(user.id)
    const newPlainToken = randomUUID()
    const newHash = hashRefreshToken(newPlainToken)

    await this.repo.updateSessionActivity(session.id, newHash)

    const accessToken = await signAccessToken(user.id, role)

    return { access_token: accessToken, expires_in: ACCESS_EXPIRES_SECONDS }
  }

  async logout(userId: string, allDevices: boolean, currentTokenHash?: string): Promise<void> {
    if (allDevices) {
      await this.repo.revokeAllUserSessions(userId)
    } else if (currentTokenHash) {
      const session = await this.repo.findSessionByTokenHash(currentTokenHash)
      if (session) await this.repo.revokeSession(session.id)
    } else {
      await this.repo.revokeAllUserSessions(userId)
    }
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId)
    if (!user) throw AppError.notFound('Kullanıcı')
    return toPublicUser(user)
  }
}
