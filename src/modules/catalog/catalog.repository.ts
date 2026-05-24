import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogRecord, CatalogItemRecord } from './catalog.types.js'
import { AppError } from '@/shared/errors/index.js'

export class CatalogRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAll(status?: string): Promise<CatalogRecord[]> {
    let q = this.db.from('catalogs').select('*').is('deleted_at', null).order('created_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as CatalogRecord[]
  }

  async findById(id: string): Promise<CatalogRecord | null> {
    const { data, error } = await this.db
      .from('catalogs').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as CatalogRecord | null
  }

  async create(input: Omit<CatalogRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<CatalogRecord> {
    const { data, error } = await this.db.from('catalogs').insert(input).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as CatalogRecord
  }

  async update(id: string, input: Partial<Omit<CatalogRecord, 'id' | 'created_at' | 'deleted_at'>>): Promise<CatalogRecord> {
    const { data, error } = await this.db
      .from('catalogs').update(input).eq('id', id).is('deleted_at', null).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    if (!data) throw AppError.notFound('Katalog')
    return data as CatalogRecord
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('catalogs').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async findItems(catalogId: string): Promise<CatalogItemRecord[]> {
    const { data, error } = await this.db
      .from('catalog_items').select('*').eq('catalog_id', catalogId).order('sort_order')
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as CatalogItemRecord[]
  }

  async addItem(input: Omit<CatalogItemRecord, 'id' | 'created_at'>): Promise<CatalogItemRecord> {
    const { data, error } = await this.db.from('catalog_items').insert(input).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu ürün katalogda zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as CatalogItemRecord
  }

  async updateItem(itemId: string, sort_order: number): Promise<CatalogItemRecord> {
    const { data, error } = await this.db
      .from('catalog_items').update({ sort_order }).eq('id', itemId).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    if (!data) throw AppError.notFound('Katalog öğesi')
    return data as CatalogItemRecord
  }

  async removeItem(catalogId: string, itemId: string): Promise<void> {
    const { error } = await this.db
      .from('catalog_items').delete().eq('id', itemId).eq('catalog_id', catalogId)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
