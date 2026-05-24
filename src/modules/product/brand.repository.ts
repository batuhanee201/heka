import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandRecord } from './product.types.js'
import { AppError } from '@/shared/errors/index.js'

export class BrandRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAll(onlyActive = false): Promise<BrandRecord[]> {
    let q = this.db.from('brands').select('*').is('deleted_at', null).order('name')
    if (onlyActive) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as BrandRecord[]
  }

  async findById(id: string): Promise<BrandRecord | null> {
    const { data, error } = await this.db
      .from('brands').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as BrandRecord | null
  }

  async findBySlug(slug: string): Promise<BrandRecord | null> {
    const { data, error } = await this.db
      .from('brands').select('*').eq('slug', slug).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as BrandRecord | null
  }

  async create(input: Omit<BrandRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<BrandRecord> {
    const { data, error } = await this.db.from('brands').insert(input).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu marka adı veya slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as BrandRecord
  }

  async update(id: string, input: Partial<Omit<BrandRecord, 'id' | 'created_at' | 'deleted_at'>>): Promise<BrandRecord> {
    const { data, error } = await this.db
      .from('brands').update(input).eq('id', id).is('deleted_at', null).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu marka adı veya slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    if (!data) throw AppError.notFound('Marka')
    return data as BrandRecord
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('brands').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
