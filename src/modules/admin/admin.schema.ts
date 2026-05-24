import { z } from 'zod'

export const UpdateUserSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
  phone: z.string().optional().nullable(),
})

export const AssignRoleSchema = z.object({
  role_id: z.string().uuid(),
})

export const AuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  user_id: z.string().uuid().optional(),
  event_category: z.enum(['auth', 'data', 'permission', 'file', 'security']).optional(),
  entity_type: z.string().optional(),
})

export const UserListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  include_deleted: z.enum(['true', 'false']).optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>
export type UserListQuery = z.infer<typeof UserListQuerySchema>
