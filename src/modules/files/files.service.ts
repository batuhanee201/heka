import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MultipartFile } from '@fastify/multipart'
import { FilesRepository } from './files.repository.js'
import type { CreateFileRelationInput, FileListQuery } from './files.schema.js'
import type { PublicFile, FileRelationRecord } from './files.types.js'
import { ALLOWED_MIME_TYPES } from './files.types.js'
import { AppError } from '@/shared/errors/index.js'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const PRIVATE_BUCKET = 'heka-files'
const PUBLIC_BUCKET = 'heka-public'

export class FilesService {
  private readonly repo: FilesRepository

  constructor(private readonly db: SupabaseClient) {
    this.repo = new FilesRepository(db)
  }

  private getPublicUrl(bucket: string, path: string): string {
    const { data } = this.db.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  private toPublicFile(f: Awaited<ReturnType<FilesRepository['findById']>>): PublicFile {
    if (!f) throw AppError.internal()
    const { deleted_at: _d, ...rest } = f
    const url = f.is_public
      ? this.getPublicUrl(f.bucket_name, f.storage_path)
      : `/files/${f.id}/download`
    return { ...rest, url }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^\w.\-]/g, '_').slice(0, 255)
  }

  async upload(
    file: MultipartFile,
    userId: string,
    isPublic = false,
  ): Promise<PublicFile> {
    const mimeType = file.mimetype as string

    if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new AppError(
        `Desteklenmeyen dosya türü: ${mimeType}`,
        'UNSUPPORTED_FILE_TYPE',
        400,
      )
    }

    const buffer = await file.toBuffer()

    if (buffer.byteLength > MAX_SIZE) {
      throw new AppError('Dosya 10 MB sınırını aşıyor', 'FILE_TOO_LARGE', 400)
    }

    const ext = extname(file.filename) || '.bin'
    const bucket = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET
    const storagePath = `${userId}/${randomUUID()}${ext}`

    const { error: storageError } = await this.db.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (storageError) {
      throw new AppError(`Dosya yüklenemedi: ${storageError.message}`, 'FILE_UPLOAD_FAILED', 500)
    }

    const record = await this.repo.create({
      bucket_name: bucket,
      storage_path: storagePath,
      original_filename: this.sanitizeFilename(file.filename),
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      is_public: isPublic,
      uploaded_by: userId,
    })

    return this.toPublicFile(record)
  }

  async listFiles(userId: string, query: FileListQuery, userRole: string): Promise<PublicFile[]> {
    const isPublic = query.is_public === 'true' ? true : query.is_public === 'false' ? false : undefined
    const filterByUser = userRole === 'viewer' ? userId : ''
    const records = await this.repo.findAll(filterByUser, isPublic)
    return records.map((r) => this.toPublicFile(r))
  }

  async getFile(id: string, userId: string, userRole: string): Promise<PublicFile> {
    const file = await this.repo.findById(id)
    if (!file) throw AppError.notFound('Dosya')
    if (userRole === 'viewer' && file.uploaded_by !== userId) {
      throw AppError.forbidden()
    }
    return this.toPublicFile(file)
  }

  async deleteFile(id: string, userId: string, userRole: string): Promise<void> {
    const file = await this.repo.findById(id)
    if (!file) throw AppError.notFound('Dosya')

    if (userRole === 'viewer' && file.uploaded_by !== userId) {
      throw AppError.forbidden()
    }

    await this.db.storage.from(file.bucket_name).remove([file.storage_path])
    await this.repo.softDelete(id)
  }

  async createRelation(fileId: string, input: CreateFileRelationInput): Promise<FileRelationRecord> {
    const file = await this.repo.findById(fileId)
    if (!file) throw AppError.notFound('Dosya')
    return this.repo.createRelation({
      file_id: fileId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      relation_type: input.relation_type,
      sort_order: input.sort_order,
    })
  }

  async listRelations(entityType: string, entityId: string): Promise<FileRelationRecord[]> {
    return this.repo.findRelations(entityType, entityId)
  }

  async deleteRelation(id: string, userId: string, userRole: string): Promise<void> {
    const relation = await this.repo.findRelationById(id)
    if (!relation) throw AppError.notFound('Dosya ilişkisi')

    if (userRole === 'viewer') {
      const file = await this.repo.findById(relation.file_id)
      if (!file || file.uploaded_by !== userId) {
        throw AppError.forbidden()
      }
    }

    await this.repo.deleteRelation(id)
  }
}
