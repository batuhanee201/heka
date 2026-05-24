import type { UUID, ISODateString, Nullable } from '@/shared/types/index.js'

export interface FileRecord {
  id: UUID
  bucket_name: string
  storage_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
  is_public: boolean
  uploaded_by: UUID
  created_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export type PublicFile = Omit<FileRecord, 'deleted_at'> & { url: string }

export interface FileRelationRecord {
  id: UUID
  file_id: UUID
  entity_type: string
  entity_id: UUID
  relation_type: string
  sort_order: number
  created_at: ISODateString
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]
