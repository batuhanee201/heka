import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryRecord } from './product.types.js'
import { AppError } from '@/shared/errors/index.js'

export class CategoryRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAll(onlyActive = false): Promise<CategoryRecord[]> {
    let q = this.db.from('categories').select('*').is('deleted_at', null).order('sort_order').order('name')
    if (onlyActive) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as CategoryRecord[]
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    const { data, error } = await this.db
      .from('categories').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as CategoryRecord | null
  }

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    const { data, error } = await this.db
      .from('categories').select('*').eq('slug', slug).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as CategoryRecord | null
  }

  async hasChildren(id: string): Promise<boolean> {
    const { count } = await this.db
      .from('categories').select('*', { count: 'exact', head: true })
      .eq('parent_id', id).is('deleted_at', null)
    return (count ?? 0) > 0
  }

  async create(input: Omit<CategoryRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<CategoryRecord> {
    const { data, error } = await this.db.from('categories').insert(input).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu kategori slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as CategoryRecord
  }

  async update(id: string, input: Partial<Omit<CategoryRecord, 'id' | 'created_at' | 'deleted_at'>>): Promise<CategoryRecord> {
    const { data, error } = await this.db
      .from('categories').update(input).eq('id', id).is('deleted_at', null).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu kategori slug zaten mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    if (!data) throw AppError.notFound('Kategori')
    return data as CategoryRecord
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
