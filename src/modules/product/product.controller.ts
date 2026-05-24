import type { FastifyRequest, FastifyReply } from 'fastify'
import { ProductService } from './product.service.js'
import {
  CreateBrandSchema, UpdateBrandSchema,
  CreateCategorySchema, UpdateCategorySchema,
  CreateProductSchema, UpdateProductSchema,
  ProductListQuerySchema,
} from './product.schema.js'
import { sendSuccess, sendCreated, sendNoContent, sendError } from '@/shared/utils/response.js'
import { AppError } from '@/shared/errors/index.js'

type IdParam = { Params: { id: string } }

export class ProductController {
  constructor(private readonly svc: ProductService) {}

  // ── Brands ─────────────────────────────────────────────────────────────

  listBrands = async (req: FastifyRequest, reply: FastifyReply) => {
    const onlyActive = (req.query as Record<string, string>)['active'] === 'true'
    const brands = await this.svc.listBrands(onlyActive)
    sendSuccess(reply, { brands })
  }

  getBrand = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try {
      sendSuccess(reply, { brand: await this.svc.getBrand(req.params.id) })
    } catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  createBrand = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = CreateBrandSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz marka verisi', p.error.flatten())); return }
    try { sendCreated(reply, { brand: await this.svc.createBrand(p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateBrand = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdateBrandSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz marka verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { brand: await this.svc.updateBrand(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteBrand = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteBrand(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Categories ─────────────────────────────────────────────────────────

  listCategories = async (req: FastifyRequest, reply: FastifyReply) => {
    const onlyActive = (req.query as Record<string, string>)['active'] === 'true'
    sendSuccess(reply, { categories: await this.svc.listCategories(onlyActive) })
  }

  getCategory = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { category: await this.svc.getCategory(req.params.id) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  createCategory = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = CreateCategorySchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz kategori verisi', p.error.flatten())); return }
    try { sendCreated(reply, { category: await this.svc.createCategory(p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateCategory = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdateCategorySchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz kategori verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { category: await this.svc.updateCategory(req.params.id, p.data) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteCategory = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteCategory(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  // ── Products ───────────────────────────────────────────────────────────

  listProducts = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = ProductListQuerySchema.safeParse(req.query)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz sorgu parametreleri', p.error.flatten())); return }
    const result = await this.svc.listProducts(p.data)
    sendSuccess(reply, { products: result.items, total: result.total })
  }

  getProduct = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { sendSuccess(reply, { product: await this.svc.getProduct(req.params.id) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  createProduct = async (req: FastifyRequest, reply: FastifyReply) => {
    const p = CreateProductSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz ürün verisi', p.error.flatten())); return }
    try { sendCreated(reply, { product: await this.svc.createProduct(p.data, req.userId) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  updateProduct = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    const p = UpdateProductSchema.safeParse(req.body)
    if (!p.success) { sendError(reply, AppError.validation('Geçersiz ürün verisi', p.error.flatten())); return }
    try { sendSuccess(reply, { product: await this.svc.updateProduct(req.params.id, p.data, req.userId) }) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  deleteProduct = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.deleteProduct(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }

  restoreProduct = async (req: FastifyRequest<IdParam>, reply: FastifyReply) => {
    try { await this.svc.restoreProduct(req.params.id); sendNoContent(reply) }
    catch (e) { sendError(reply, e instanceof Error ? e : AppError.internal()) }
  }
}
