import type { SupabaseClient } from '@supabase/supabase-js'
import { BrandRepository } from './brand.repository.js'
import { CategoryRepository } from './category.repository.js'
import { ProductRepository } from './product.repository.js'
import type {
  CreateBrandInput, UpdateBrandInput,
  CreateCategoryInput, UpdateCategoryInput,
  CreateProductInput, UpdateProductInput,
  ProductListQuery,
} from './product.schema.js'
import type { PublicBrand, PublicCategory, ProductDetail } from './product.types.js'
import { slugify } from '@/shared/utils/slugify.js'
import { AppError } from '@/shared/errors/index.js'

function toPublicBrand(b: Awaited<ReturnType<BrandRepository['findById']>>): PublicBrand {
  if (!b) throw AppError.internal()
  const { deleted_at: _d, ...pub } = b
  return pub
}

function toPublicCategory(c: Awaited<ReturnType<CategoryRepository['findById']>>): PublicCategory {
  if (!c) throw AppError.internal()
  const { deleted_at: _d, ...pub } = c
  return pub
}

export class ProductService {
  private readonly brands: BrandRepository
  private readonly categories: CategoryRepository
  private readonly products: ProductRepository

  constructor(db: SupabaseClient) {
    this.brands = new BrandRepository(db)
    this.categories = new CategoryRepository(db)
    this.products = new ProductRepository(db)
  }

  // ── Brand ──────────────────────────────────────────────────────────────

  async listBrands(onlyActive = false): Promise<PublicBrand[]> {
    const rows = await this.brands.findAll(onlyActive)
    return rows.map(toPublicBrand)
  }

  async getBrand(id: string): Promise<PublicBrand> {
    const brand = await this.brands.findById(id)
    if (!brand) throw AppError.notFound('Marka')
    return toPublicBrand(brand)
  }

  async createBrand(input: CreateBrandInput): Promise<PublicBrand> {
    const slug = slugify(input.name)
    const existing = await this.brands.findBySlug(slug)
    if (existing) throw new AppError('Bu isimde marka zaten mevcut', 'CONFLICT', 409)

    const brand = await this.brands.create({ ...input, slug, description: input.description ?? null, website_url: input.website_url ?? null })
    return toPublicBrand(brand)
  }

  async updateBrand(id: string, input: UpdateBrandInput): Promise<PublicBrand> {
    const existing = await this.brands.findById(id)
    if (!existing) throw AppError.notFound('Marka')

    const updates: Parameters<BrandRepository['update']>[1] = { ...input }
    if (input.name && input.name !== existing.name) {
      updates.slug = slugify(input.name)
    }

    const brand = await this.brands.update(id, updates)
    return toPublicBrand(brand)
  }

  async deleteBrand(id: string): Promise<void> {
    const existing = await this.brands.findById(id)
    if (!existing) throw AppError.notFound('Marka')
    await this.brands.softDelete(id)
  }

  // ── Category ───────────────────────────────────────────────────────────

  async listCategories(onlyActive = false): Promise<PublicCategory[]> {
    const rows = await this.categories.findAll(onlyActive)
    return rows.map(toPublicCategory)
  }

  async getCategory(id: string): Promise<PublicCategory> {
    const cat = await this.categories.findById(id)
    if (!cat) throw AppError.notFound('Kategori')
    return toPublicCategory(cat)
  }

  async createCategory(input: CreateCategoryInput): Promise<PublicCategory> {
    const slug = slugify(input.name)
    const existing = await this.categories.findBySlug(slug)
    if (existing) throw new AppError('Bu isimde kategori zaten mevcut', 'CONFLICT', 409)

    if (input.parent_id) {
      const parent = await this.categories.findById(input.parent_id)
      if (!parent) throw AppError.notFound('Üst kategori')
    }

    const cat = await this.categories.create({
      ...input,
      slug,
      parent_id: input.parent_id ?? null,
      description: input.description ?? null,
    })
    return toPublicCategory(cat)
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<PublicCategory> {
    const existing = await this.categories.findById(id)
    if (!existing) throw AppError.notFound('Kategori')

    const updates: Parameters<CategoryRepository['update']>[1] = { ...input }
    if (input.name && input.name !== existing.name) {
      updates.slug = slugify(input.name)
    }

    const cat = await this.categories.update(id, updates)
    return toPublicCategory(cat)
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.categories.findById(id)
    if (!existing) throw AppError.notFound('Kategori')

    const hasChildren = await this.categories.hasChildren(id)
    if (hasChildren) throw new AppError('Bu kategorinin alt kategorileri mevcut, önce silin', 'CONFLICT', 409)

    await this.categories.softDelete(id)
  }

  // ── Product ────────────────────────────────────────────────────────────

  async listProducts(query: ProductListQuery): Promise<{ items: ProductDetail[]; total: number }> {
    return this.products.findAll(query)
  }

  async getProduct(id: string): Promise<ProductDetail> {
    const product = await this.products.findById(id)
    if (!product) throw AppError.notFound('Ürün')
    return product
  }

  async createProduct(input: CreateProductInput, userId: string): Promise<ProductDetail> {
    const existing = await this.products.findByCode(input.code)
    if (existing) throw new AppError('Bu ürün kodu zaten mevcut', 'CONFLICT', 409)

    const slug = slugify(input.name)

    const { technical_details, display, ...productData } = input

    const product = await this.products.create({
      ...productData,
      slug,
      description: productData.description ?? null,
      short_description: productData.short_description ?? null,
      product_type: productData.product_type ?? null,
      created_by: userId,
      updated_by: null,
    })

    if (technical_details) {
      await this.products.upsertTechnicalDetails(product.id, technical_details)
    }
    if (display) {
      await this.products.upsertDisplay(product.id, display)
    }

    const full = await this.products.findById(product.id)
    if (!full) throw AppError.internal()
    return full
  }

  async updateProduct(id: string, input: UpdateProductInput, userId: string): Promise<ProductDetail> {
    const existing = await this.products.findById(id)
    if (!existing) throw AppError.notFound('Ürün')

    const { technical_details, display, ...productData } = input

    const updates: Parameters<ProductRepository['update']>[1] = {
      ...productData,
      updated_by: userId,
    }
    if (productData.name && productData.name !== existing.name) {
      updates.slug = slugify(productData.name)
    }

    if (Object.keys(updates).length > 1) {
      await this.products.update(id, updates)
    }
    if (technical_details) {
      await this.products.upsertTechnicalDetails(id, technical_details)
    }
    if (display) {
      await this.products.upsertDisplay(id, display)
    }

    const full = await this.products.findById(id)
    if (!full) throw AppError.internal()
    return full
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.products.findById(id)
    if (!existing) throw AppError.notFound('Ürün')
    await this.products.softDelete(id)
  }

  async restoreProduct(id: string): Promise<void> {
    await this.products.restore(id)
  }
}
