import type { FastifyRequest, FastifyReply } from 'fastify'
import { FilesService } from './files.service.js'
import { CreateFileRelationSchema, FileListQuerySchema } from './files.schema.js'
import { sendSuccess, sendCreated, sendNoContent, sendError } from '@/shared/utils/response.js'
import { AppError } from '@/shared/errors/index.js'

type IdParam = { Params: { id: string } }
type RelationParam = { Params: { entityType: string; entityId: string } }

export class FilesController {
  constructor(private readonly svc: FilesService) {}

  upload = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const isPublic = (req.query as Record<string, string>)['public'] === 'true'
      const data = await req.file()
      if (!data) { sendError(reply, AppError.validation('Dosya bulunamadı')); return }
      const file = await this.svc.upload(data, req.userId, isPublic)
      sendCreated(reply, { file })
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  listFiles = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = FileListQuerySchema.safeParse(req.query)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz sorgu', p.error.flatten())); return }
    try {
      const files = await this.svc.listFiles(req.userId, p.data, req.userRole)
      sendSuccess(reply, { files })
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  getFile = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { file: await this.svc.getFile(req.params.id, req.userId, req.userRole) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteFile = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteFile(req.params.id, req.userId, req.userRole); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  createRelation = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = CreateFileRelationSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz ilişki verisi', p.error.flatten())); return }
    try { sendCreated(reply, { relation: await this.svc.createRelation(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  listRelations = async (req: FastifyRequest<RelationParam>, reply: FastifyReply) => {
    try {
      const { entityType, entityId } = req.params
      const relations = await this.svc.listRelations(entityType, entityId)
      sendSuccess(reply, { relations })
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteRelation = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteRelation(req.params.id, req.userId, req.userRole); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }
}
