import type { Nullable } from './common.js'

export interface PaginationMeta {
  total: number
  limit: number
  next_cursor: Nullable<string>
  prev_cursor: Nullable<string>
  has_more: boolean
}

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiListResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginationQuery {
  limit?: number
  cursor?: string
  sort?: string
  order?: 'asc' | 'desc'
}
