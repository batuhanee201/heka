import type { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '@/shared/errors/index.js'

export type UserRole = 'admin' | 'manager' | 'viewer'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async function (req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const userRole = req.userRole as UserRole | undefined

    if (!userRole || !ROLE_HIERARCHY[userRole]) {
      throw AppError.unauthorized()
    }

    const hasPermission = allowedRoles.some(
      (role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role],
    )

    if (!hasPermission) {
      throw AppError.forbidden()
    }
  }
}

export function requireAdmin() {
  return requireRole('admin')
}

export function requireManager() {
  return requireRole('manager')
}
