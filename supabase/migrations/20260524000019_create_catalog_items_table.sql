CREATE TABLE IF NOT EXISTS public.catalog_items (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID        NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (catalog_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_catalog_sort
    ON public.catalog_items (catalog_id, sort_order);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
