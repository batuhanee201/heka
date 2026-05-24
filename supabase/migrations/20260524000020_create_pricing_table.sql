CREATE TABLE IF NOT EXISTS public.pricing (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    catalog_id UUID          REFERENCES public.catalogs(id) ON DELETE SET NULL,
    price      NUMERIC(12,4) NOT NULL CHECK (price >= 0),
    currency   TEXT          NOT NULL DEFAULT 'USD',
    valid_from DATE,
    valid_to   DATE,
    created_by UUID          NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_pricing_valid_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_pricing_product_currency
    ON public.pricing (product_id, currency, valid_from, valid_to);

CREATE TRIGGER trg_pricing_updated_at
    BEFORE UPDATE ON public.pricing
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
