import type { SupabaseClient } from '@supabase/supabase-js'
import type { FileRecord, FileRelationRecord } from './files.types.js'
import { AppError } from '@/shared/errors/index.js'

export class FilesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAll(uploadedBy: string, isPublic?: boolean): Promise<FileRecord[]> {
    let q = this.db
      .from('files')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // managers see all; regular users see only own uploads
    if (uploadedBy) q = q.eq('uploaded_by', uploadedBy)
    if (isPublic !== undefined) q = q.eq('is_public', isPublic)

    const { data, error } = await q
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as FileRecord[]
  }

  async findById(id: string): Promise<FileRecord | null> {
    const { data, error } = await this.db
      .from('files').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as FileRecord | null
  }

  async create(input: Omit<FileRecord, 'id' | 'created_at' | 'deleted_at'>): Promise<FileRecord> {
    const { data, error } = await this.db.from('files').insert(input).select().single()
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return data as FileRecord
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }

  async findRelations(entityType: string, entityId: string): Promise<FileRelationRecord[]> {
    const { data, error } = await this.db
      .from('file_relations')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('sort_order')
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
    return (data ?? []) as FileRelationRecord[]
  }

  async createRelation(input: Omit<FileRelationRecord, 'id' | 'created_at'>): Promise<FileRelationRecord> {
    const { data, error } = await this.db.from('file_relations').insert(input).select().single()
    if (error) {
      if (error.code === '23505') throw new AppError('Bu entity için zaten bir ana görsel mevcut', 'CONFLICT', 409)
      throw new AppError(error.message, 'DATABASE_ERROR', 500)
    }
    return data as FileRelationRecord
  }

  async deleteRelation(id: string): Promise<void> {
    const { error } = await this.db.from('file_relations').delete().eq('id', id)
    if (error) throw new AppError(error.message, 'DATABASE_ERROR', 500)
  }
}
