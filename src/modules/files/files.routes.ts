import type { FastifyInstance } from 'fastify'
import { FilesService } from './files.service.js'
import { FilesController } from './files.controller.js'

export async function filesRoutes(app: FastifyInstance): Promise<void> {
  const svc = new FilesService(app.supabase)
  const ctrl = new FilesController(svc)

  const auth = { preHandler: [app.authenticate] }

  app.post('/files/upload', auth, ctrl.upload)
  app.get('/files', auth, ctrl.listFiles)
  app.get('/files/:id', auth, ctrl.getFile)
  app.delete('/files/:id', auth, ctrl.deleteFile)

  app.post('/files/:id/relations', auth, ctrl.createRelation)
  app.get('/files/relations/:entityType/:entityId', ctrl.listRelations)
  app.delete('/files/relations/:id', auth, ctrl.deleteRelation)
}
