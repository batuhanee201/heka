import { z } from 'zod'

export const CreateCatalogSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  valid_from: z.string().date().optional(),
  valid_to: z.string().date().optional(),
}).refine(
  (d) => !d.valid_from || !d.valid_to || d.valid_to >= d.valid_from,
  { message: 'valid_to, valid_from tarihinden önce olamaz', path: ['valid_to'] },
)

export const UpdateCatalogSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  valid_from: z.string().date().optional(),
  valid_to: z.string().date().optional(),
})

export const AddCatalogItemSchema = z.object({
  product_id: z.string().uuid(),
  sort_order: z.number().int().min(0).default(0),
})

export const UpdateCatalogItemSchema = z.object({
  sort_order: z.number().int().min(0),
})

export const CreatePricingSchema = z.object({
  product_id: z.string().uuid(),
  catalog_id: z.string().uuid().optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  valid_from: z.string().date().optional(),
  valid_to: z.string().date().optional(),
}).refine(
  (d) => !d.valid_from || !d.valid_to || d.valid_to >= d.valid_from,
  { message: 'valid_to, valid_from tarihinden önce olamaz', path: ['valid_to'] },
)

export const UpdatePricingSchema = z.object({
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  valid_from: z.string().date().optional(),
  valid_to: z.string().date().optional(),
})

export type CreateCatalogInput = z.infer<typeof CreateCatalogSchema>
export type UpdateCatalogInput = z.infer<typeof UpdateCatalogSchema>
export type AddCatalogItemInput = z.infer<typeof AddCatalogItemSchema>
export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemSchema>
export type CreatePricingInput = z.infer<typeof CreatePricingSchema>
export type UpdatePricingInput = z.infer<typeof UpdatePricingSchema>
