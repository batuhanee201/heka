import type { UUID, ISODateString, Nullable } from '@/shared/types/index.js'

export interface CatalogRecord {
  id: UUID
  name: string
  description: Nullable<string>
  status: 'draft' | 'active' | 'archived'
  valid_from: Nullable<string>
  valid_to: Nullable<string>
  created_by: UUID
  created_at: ISODateString
  updated_at: ISODateString
  deleted_at: Nullable<ISODateString>
}

export type PublicCatalog = Omit<CatalogRecord, 'deleted_at'>

export interface CatalogItemRecord {
  id: UUID
  catalog_id: UUID
  product_id: UUID
  sort_order: number
  created_at: ISODateString
}

export interface PricingRecord {
  id: UUID
  product_id: UUID
  catalog_id: Nullable<UUID>
  price: number
  currency: string
  valid_from: Nullable<string>
  valid_to: Nullable<string>
  created_by: UUID
  created_at: ISODateString
  updated_at: ISODateString
}
