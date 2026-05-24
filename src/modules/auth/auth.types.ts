import type { UUID, ISODateString, Nullable } from '@/shared/types/index.js'

export interface UserRecord {
  id: UUID
  supabase_auth_id: UUID
  email: string
  phone: Nullable<string>
  full_name: string
  email_verified: boolean
  phone_verified: boolean
  is_active: boolean
  last_login_at: Nullable<ISODateString>
  created_at: ISODateString
  updated_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export interface SessionRecord {
  id: UUID
  user_id: UUID
  refresh_token_hash: string
  ip_address: Nullable<string>
  user_agent: Nullable<string>
  expires_at: ISODateString
  last_active_at: ISODateString
  revoked_at: Nullable<ISODateString>
  created_at: ISODateString
}

export type PublicUser = Omit<UserRecord, 'supabase_auth_id' | 'deleted_at'>

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
}

export interface LoginResult {
  user: PublicUser
  tokens: AuthTokens
}
