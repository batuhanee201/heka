import type { UUID, ISODateString, Nullable } from '@/shared/types/index.js'

export interface RoleRecord {
  id: UUID
  name: string
  description: Nullable<string>
  is_system: boolean
  created_at: ISODateString
  updated_at: ISODateString
}

export interface UserRoleRecord {
  user_id: UUID
  role_id: UUID
  assigned_at: ISODateString
}

export interface AuditLogRecord {
  id: UUID
  user_id: Nullable<UUID>
  event_type: string
  event_category: 'auth' | 'data' | 'permission' | 'file' | 'security'
  entity_type: Nullable<string>
  entity_id: Nullable<UUID>
  old_data: Nullable<Record<string, unknown>>
  new_data: Nullable<Record<string, unknown>>
  ip_address: Nullable<string>
  user_agent: Nullable<string>
  metadata: Nullable<Record<string, unknown>>
  created_at: ISODateString
}

export interface AdminUserView {
  id: UUID
  email: string
  full_name: string
  phone: Nullable<string>
  is_active: boolean
  email_verified: boolean
  last_login_at: Nullable<ISODateString>
  created_at: ISODateString
  deleted_at: Nullable<ISODateString>
  roles: string[]
}
