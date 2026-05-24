import type { SupabaseClient } from '@supabase/supabase-js'
import { CatalogRepository } from './catalog.repository.js'
import { PricingRepository } from './pricing.repository.js'
import type {
  CreateCatalogInput, UpdateCatalogInput,
  AddCatalogItemInput, UpdateCatalogItemInput,
  CreatePricingInput, UpdatePricingInput,
} from './catalog.schema.js'
import type { PublicCatalog, CatalogItemRecord, PricingRecord } from './catalog.types.js'
import { AppError } from '@/shared/errors/index.js'

function toPublicCatalog(c: Awaited<ReturnType<CatalogRepository['findById']>>): PublicCatalog {
  if (!c) throw AppError.internal()
  const { deleted_at: _d, ...pub } = c
  return pub
}

export class CatalogService {
  private readonly catalogs: CatalogRepository
  private readonly pricing: PricingRepository

  constructor(db: SupabaseClient) {
    this.catalogs = new CatalogRepository(db)
    this.pricing = new PricingRepository(db)
  }

  // ── Catalogs ───────────────────────────────────────────────────────────

  async listCatalogs(status?: string): Promise<PublicCatalog[]> {
    const rows = await this.catalogs.findAll(status)
    return rows.map(toPublicCatalog)
  }

  async getCatalog(id: string): Promise<PublicCatalog> {
    const catalog = await this.catalogs.findById(id)
    if (!catalog) throw AppError.notFound('Katalog')
    return toPublicCatalog(catalog)
  }

  async createCatalog(input: CreateCatalogInput, userId: string): Promise<PublicCatalog> {
    const catalog = await this.catalogs.create({
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
      created_by: userId,
    })
    return toPublicCatalog(catalog)
  }

  async updateCatalog(id: string, input: UpdateCatalogInput): Promise<PublicCatalog> {
    const existing = await this.catalogs.findById(id)
    if (!existing) throw AppError.notFound('Katalog')
    const catalog = await this.catalogs.update(id, input)
    return toPublicCatalog(catalog)
  }

  async deleteCatalog(id: string): Promise<void> {
    const existing = await this.catalogs.findById(id)
    if (!existing) throw AppError.notFound('Katalog')
    await this.catalogs.softDelete(id)
  }

  // ── Catalog Items ──────────────────────────────────────────────────────

  async listItems(catalogId: string): Promise<CatalogItemRecord[]> {
    const catalog = await this.catalogs.findById(catalogId)
    if (!catalog) throw AppError.notFound('Katalog')
    return this.catalogs.findItems(catalogId)
  }

  async addItem(catalogId: string, input: AddCatalogItemInput): Promise<CatalogItemRecord> {
    const catalog = await this.catalogs.findById(catalogId)
    if (!catalog) throw AppError.notFound('Katalog')
    return this.catalogs.addItem({
      catalog_id: catalogId,
      product_id: input.product_id,
      sort_order: input.sort_order,
    })
  }

  async updateItem(catalogId: string, itemId: string, input: UpdateCatalogItemInput): Promise<CatalogItemRecord> {
    const catalog = await this.catalogs.findById(catalogId)
    if (!catalog) throw AppError.notFound('Katalog')
    return this.catalogs.updateItem(itemId, input.sort_order)
  }

  async removeItem(catalogId: string, itemId: string): Promise<void> {
    const catalog = await this.catalogs.findById(catalogId)
    if (!catalog) throw AppError.notFound('Katalog')
    await this.catalogs.removeItem(catalogId, itemId)
  }

  // ── Pricing ────────────────────────────────────────────────────────────

  async listPricing(productId: string): Promise<PricingRecord[]> {
    return this.pricing.findByProduct(productId)
  }

  async createPricing(input: CreatePricingInput, userId: string): Promise<PricingRecord> {
    return this.pricing.create({
      product_id: input.product_id,
      catalog_id: input.catalog_id ?? null,
      price: input.price,
      currency: input.currency,
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
      created_by: userId,
    })
  }

  async updatePricing(id: string, input: UpdatePricingInput): Promise<PricingRecord> {
    const existing = await this.pricing.findById(id)
    if (!existing) throw AppError.notFound('Fiyat')
    return this.pricing.update(id, input)
  }

  async deletePricing(id: string): Promise<void> {
    const existing = await this.pricing.findById(id)
    if (!existing) throw AppError.notFound('Fiyat')
    await this.pricing.delete(id)
  }
}
