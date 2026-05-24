import { z } from 'zod'

// ── Brand ──────────────────────────────────────────────────────────────────

export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  website_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
})

export const UpdateBrandSchema = CreateBrandSchema.partial()

// ── Category ───────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parent_id: z.string().uuid().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

// ── Technical Details ──────────────────────────────────────────────────────

const TechnicalDetailsSchema = z.object({
  socket_type: z.string().max(50).optional(),
  voltage_range: z.string().max(50).optional(),
  power_w: z.number().positive().optional(),
  light_output_lm: z.number().min(0).optional(),
  color_temp_k: z.number().int().min(1000).max(10000).optional(),
  color_rendering_index: z.number().min(0).max(100).optional(),
  beam_angle_deg: z.number().min(0).max(360).optional(),
  dimmable: z.boolean().default(false),
  energy_efficiency_class: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional(),
  lifetime_hours: z.number().int().positive().optional(),
  ip_rating: z.string().max(20).optional(),
  operating_temp_min_c: z.number().optional(),
  operating_temp_max_c: z.number().optional(),
})

// ── Display ────────────────────────────────────────────────────────────────

const DisplaySchema = z.object({
  package_qty: z.number().int().positive().optional(),
  box_size_mm: z.string().max(50).optional(),
  box_weight_gr: z.number().positive().optional(),
  barcode: z.string().max(50).optional(),
  qr_code_data: z.string().optional(),
  certificates: z.record(z.unknown()).optional(),
})

// ── Product ────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  product_type: z.string().max(100).optional(),
  brand_id: z.string().uuid(),
  category_id: z.string().uuid(),
  status: z.enum(['draft', 'active', 'discontinued', 'archived']).default('draft'),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  technical_details: TechnicalDetailsSchema.optional(),
  display: DisplaySchema.optional(),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export const ProductListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['draft', 'active', 'discontinued', 'archived']).optional(),
  brand_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
})

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>
