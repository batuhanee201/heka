CREATE TABLE IF NOT EXISTS public.product_display (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID          NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    package_qty   INTEGER       CHECK (package_qty > 0),
    box_size_mm   TEXT,
    box_weight_gr NUMERIC(10,2) CHECK (box_weight_gr > 0),
    barcode       TEXT          UNIQUE,
    qr_code_data  TEXT,
    certificates  JSONB,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pd_certificates
    ON public.product_display USING GIN (certificates);

CREATE TRIGGER trg_pd_updated_at
    BEFORE UPDATE ON public.product_display
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_display ENABLE ROW LEVEL SECURITY;
