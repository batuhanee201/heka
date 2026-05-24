import type { UUID, ISODateString, Nullable } from '@/shared/types/index.js'

export interface BrandRecord {
  id: UUID
  name: string
  slug: string
  description: Nullable<string>
  website_url: Nullable<string>
  is_active: boolean
  created_at: ISODateString
  updated_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export type PublicBrand = Omit<BrandRecord, 'deleted_at'>

export interface CategoryRecord {
  id: UUID
  parent_id: Nullable<UUID>
  name: string
  slug: string
  description: Nullable<string>
  sort_order: number
  is_active: boolean
  created_at: ISODateString
  updated_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export type PublicCategory = Omit<CategoryRecord, 'deleted_at'>

export interface ProductRecord {
  id: UUID
  code: string
  name: string
  product_type: Nullable<string>
  brand_id: UUID
  category_id: UUID
  status: 'draft' | 'active' | 'discontinued' | 'archived'
  description: Nullable<string>
  short_description: Nullable<string>
  slug: string
  created_by: UUID
  updated_by: Nullable<UUID>
  created_at: ISODateString
  updated_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export interface TechnicalDetailsRecord {
  id: UUID
  product_id: UUID
  socket_type: Nullable<string>
  voltage_range: Nullable<string>
  power_w: Nullable<number>
  light_output_lm: Nullable<number>
  color_temp_k: Nullable<number>
  color_rendering_index: Nullable<number>
  beam_angle_deg: Nullable<number>
  dimmable: boolean
  energy_efficiency_class: Nullable<string>
  lifetime_hours: Nullable<number>
  ip_rating: Nullable<string>
  operating_temp_min_c: Nullable<number>
  operating_temp_max_c: Nullable<number>
  created_at: ISODateString
  updated_at: ISODateString
}

export interface DisplayRecord {
  id: UUID
  product_id: UUID
  package_qty: Nullable<number>
  box_size_mm: Nullable<string>
  box_weight_gr: Nullable<number>
  barcode: Nullable<string>
  qr_code_data: Nullable<string>
  certificates: Nullable<Record<string, unknown>>
  created_at: ISODateString
  updated_at: ISODateString
}

export interface ProductDetail extends Omit<ProductRecord, 'deleted_at'> {
  technical_details: Nullable<Omit<TechnicalDetailsRecord, 'product_id'>>
  display: Nullable<Omit<DisplayRecord, 'product_id'>>
}
