import type { SupabaseClient } from '@supabase/supabase-js'
import type { PricingRecord } from './catalog.types.js'
import { AppError } from '@/shared/errors/index.js'

export class PricingRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByProduct(productId: string): Promise<PricingRecord[]> {
    const { data, error } = await this.db
      .from('pricing').select('*').eq('product_id', productId).order('valid_from', { ascending: false, nullsFirst: false })
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as PricingRecord[]
  }

  async findById(id: string): Promise<PricingRecord | null> {
    const { data, error } = await this.db.from('pricing').select('*').eq('id', id).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as PricingRecord | null
  }

  async create(input: Omit<PricingRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PricingRecord> {
    const { data, error } = await this.db.from('pricing').insert(input).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as PricingRecord
  }

  async update(id: string, input: Partial<Omit<PricingRecord, 'id' | 'product_id' | 'created_by' | 'created_at'>>): Promise<PricingRecord> {
    const { data, error } = await this.db.from('pricing').update(input).eq('id', id).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    if (!data) throw AppError.notFound('Fiyat')
    return data as PricingRecord
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('pricing').delete().eq('id', id)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
