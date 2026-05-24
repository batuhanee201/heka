import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductRecord, TechnicalDetailsRecord, DisplayRecord, ProductDetail } from './product.types.js'
import type { ProductListQuery } from './product.schema.js'
import { AppError } from '@/shared/errors/index.js'

const PRODUCT_WITH_DETAILS = `
  *,
  technical_details:product_technical_details(*),
  display:product_display(*)
`

export class ProductRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAll(query: ProductListQuery): Promise<{ items: ProductDetail[]; total: number }> {
    let q = this.db
      .from('products')
      .select(PRODUCT_WITH_DETAILS, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(query.limit)

    if (query.status) q = q.eq('status', query.status)
    if (query.brand_id) q = q.eq('brand_id', query.brand_id)
    if (query.category_id) q = q.eq('category_id', query.category_id)

    const { data, error, count } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return { items: (data ?? []) as ProductDetail[], total: count ?? 0 }
  }

  async findById(id: string): Promise<ProductDetail | null> {
    const { data, error } = await this.db
      .from('products')
      .select(PRODUCT_WITH_DETAILS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as ProductDetail | null
  }

  async findByCode(code: string): Promise<ProductRecord | null> {
    const { data, error } = await this.db
      .from('products').select('*').eq('code', code).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as ProductRecord | null
  }

  async create(input: Omit<ProductRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<ProductRecord> {
    const { data, error } = await this.db.from('products').insert(input).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu ürün kodu veya slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as ProductRecord
  }

  async update(id: string, input: Partial<Omit<ProductRecord, 'id' | 'created_at' | 'deleted_at'>>): Promise<ProductRecord> {
    const { data, error } = await this.db
      .from('products').update(input).eq('id', id).is('deleted_at', null).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu ürün kodu veya slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    if (!data) throw AppError.notFound('Ürün')
    return data as ProductRecord
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async restore(id: string): Promise<void> {
    const { error } = await this.db
      .from('products').update({ deleted_at: null }).eq('id', id).not('deleted_at', 'is', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async upsertTechnicalDetails(
    productId: string,
    input: Partial<Omit<TechnicalDetailsRecord, 'id' | 'product_id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const { error } = await this.db
      .from('product_technical_details')
      .upsert({ ...input, product_id: productId }, { onConflict: 'product_id' })
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async upsertDisplay(
    productId: string,
    input: Partial<Omit<DisplayRecord, 'id' | 'product_id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const { error } = await this.db
      .from('product_display')
      .upsert({ ...input, product_id: productId }, { onConflict: 'product_id' })
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
