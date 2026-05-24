import type { FastifyRequest, FastifyReply } from 'fastify'
import { CatalogService } from './catalog.service.js'
import {
  CreateCatalogSchema, UpdateCatalogSchema,
  AddCatalogItemSchema, UpdateCatalogItemSchema,
  CreatePricingSchema, UpdatePricingSchema,
} from './catalog.schema.js'
import { sendSuccess, sendCreated, sendNoContent, sendError } from '@/shared/utils/response.js'
import { AppError } from '@/shared/errors/index.js'

type IdParam = { Params: { id: string } }
type CatalogItemParam = { Params: { catalogId: string; itemId: string } }

export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  // ── Catalogs ───────────────────────────────────────────────────────────

  listCatalogs = async (req: FastifyRequest, reply: FastifyReply) => {
    const status = (req.query as Record<string, string>)['status']
    sendSuccess(reply, { catalogs: await this.svc.listCatalogs(status) })
  }

  getCatalog = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { catalog: await this.svc.getCatalog(req.params.id) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  createCatalog = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = CreateCatalogSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz katalog verisi', p.error.flatten())); return }
    try { sendCreated(reply, { catalog: await this.svc.createCatalog(p.data, req.userId) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateCatalog = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdateCatalogSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz katalog verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { catalog: await this.svc.updateCatalog(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteCatalog = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteCatalog(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Items ──────────────────────────────────────────────────────────────

  listItems = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { items: await this.svc.listItems(req.params.id) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  addItem = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = AddCatalogItemSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz item verisi', p.error.flatten())); return }
    try { sendCreated(reply, { item: await this.svc.addItem(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateItem = async (req: FastifyRequest<CatalogItemParam>, reply: FastifyReply) => {
    const p = UpdateCatalogItemSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz item verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { item: await this.svc.updateItem(req.params.catalogId, req.params.itemId, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  removeItem = async (req: FastifyRequest<CatalogItemParam>, reply: FastifyReply) => {
    try { await this.svc.removeItem(req.params.catalogId, req.params.itemId); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Pricing ────────────────────────────────────────────────────────────

  listPricing = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    sendSuccess(reply, { pricing: await this.svc.listPricing(req.params.id) })
  }

  createPricing = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = CreatePricingSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz fiyat verisi', p.error.flatten())); return }
    try { sendCreated(reply, { pricing: await this.svc.createPricing(p.data, req.userId) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updatePricing = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdatePricingSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz fiyat verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { pricing: await this.svc.updatePricing(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deletePricing = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deletePricing(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }
}
