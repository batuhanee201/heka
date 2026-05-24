CREATE TABLE IF NOT EXISTS public.products (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT        NOT NULL,
    name              TEXT        NOT NULL,
    product_type      TEXT,
    brand_id          UUID        NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
    category_id       UUID        NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    status            TEXT        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','active','discontinued','archived')),
    description       TEXT,
    short_description TEXT,
    slug              TEXT        NOT NULL,
    created_by        UUID        NOT NULL REFERENCES public.users(id),
    updated_by        UUID        REFERENCES public.users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_active
    ON public.products (code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_active
    ON public.products (slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_brand_id
    ON public.products (brand_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id
    ON public.products (category_id);

CREATE INDEX IF NOT EXISTS idx_products_status_active
    ON public.products (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
