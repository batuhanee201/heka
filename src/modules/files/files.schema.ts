import { z } from 'zod'

export const CreateFileRelationSchema = z.object({
  entity_type: z.enum(['product', 'brand', 'category', 'catalog']),
  entity_id: z.string().uuid(),
  relation_type: z.enum(['main_image', 'gallery', 'document', 'attachment']),
  sort_order: z.number().int().min(0).default(0),
})

export const FileListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  is_public: z.enum(['true', 'false']).optional(),
})

export type CreateFileRelationInput = z.infer<typeof CreateFileRelationSchema>
export type FileListQuery = z.infer<typeof FileListQuerySchema>
