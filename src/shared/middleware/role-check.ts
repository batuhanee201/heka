import type { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '@/shared/errors/index.js'
import { sendError } from '@/shared/utils/response.js'

export type UserRole = 'admin' | 'manager' | 'viewer'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userRole = req.userRole as UserRole | undefined

    if (!userRole || !ROLE_HIERARCHY[userRole]) {
      sendError(reply, AppError.unauthorized())
      return
    }

    const hasPermission = allowedRoles.some((role) => {
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
    })

    if (!hasPermission) {
      sendError(reply, AppError.forbidden())
    }
  }
}

export function requireAdmin() {
  return requireRole('admin')
}

export function requireManager() {
  return requireRole('manager')
}
