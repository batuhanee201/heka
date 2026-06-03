import type { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { FilesService } from './files.service.js'
import { FilesController } from './files.controller.js'

export async function filesRoutes(app: FastifyInstance): Promise<void> {
  const svc = new FilesService(app.supabase)
  const ctrl = new FilesController(svc)

  const auth = { preHandler: [app.authenticate] }
  const security = [{ bearerAuth: [] }]
  const h = <T>(fn: T) => fn as unknown as RouteHandlerMethod

  app.post('/files/upload', { ...auth, schema: { tags: ['Files'], summary: 'Dosya yükle (multipart/form-data)', security, consumes: ['multipart/form-data'] } }, h(ctrl.upload))
  app.get('/files', { ...auth, schema: { tags: ['Files'], summary: 'Dosya listesi', security } }, h(ctrl.listFiles))
  app.get('/files/:id', { ...auth, schema: { tags: ['Files'], summary: 'Dosya detayı', security } }, h(ctrl.getFile))
  app.delete('/files/:id', { ...auth, schema: { tags: ['Files'], summary: 'Dosya sil', security } }, h(ctrl.deleteFile))

  app.post('/files/:id/relations', { ...auth, schema: { tags: ['Files'], summary: 'Dosya ilişkisi oluştur', security, body: { type: 'object', required: ['entity_type', 'entity_id', 'relation_type'], properties: { entity_type: { type: 'string' }, entity_id: { type: 'string', format: 'uuid' }, relation_type: { type: 'string' } } } } }, h(ctrl.createRelation))
  app.get('/files/relations/:entityType/:entityId', { ...auth, schema: { tags: ['Files'], summary: 'Varlık dosyaları', security } }, h(ctrl.listRelations))
  app.delete('/files/relations/:id', { ...auth, schema: { tags: ['Files'], summary: 'Dosya ilişkisi sil', security } }, h(ctrl.deleteRelation))
}
