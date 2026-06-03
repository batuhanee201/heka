import { SignJWT, jwtVerify } from 'jose'
import { env } from '@/config/env.js'
import { AppError } from '@/shared/errors/index.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)
const ALGORITHM = 'HS256'

export interface AccessTokenPayload {
  sub: string
  role: string
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
  type: 'refresh'
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload

export async function signAccessToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ role, type: 'access' } satisfies Omit<AccessTokenPayload, 'sub'>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret)
}

export async function signRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({ jti, type: 'refresh' } satisfies Omit<RefreshTokenPayload, 'sub'>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(secret)
}

export async function verifyToken<T = TokenPayload>(token: string): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] })
    return payload as unknown as T
  } catch (err) {
    const isExpired = err instanceof Error && err.message.includes('expired')
    throw isExpired
      ? new AppError('Token süresi dolmuş', 'TOKEN_EXPIRED', 401)
      : new AppError('Geçersiz token', 'TOKEN_INVALID', 401)
  }
}
