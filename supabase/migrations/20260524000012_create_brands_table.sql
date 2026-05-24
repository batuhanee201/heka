CREATE TABLE IF NOT EXISTS public.brands (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    slug        TEXT        NOT NULL,
    description TEXT,
    website_url TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_slug_active
    ON public.brands (slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_brands_is_active
    ON public.brands (is_active) WHERE is_active = true;

CREATE TRIGGER trg_brands_updated_at
    BEFORE UPDATE ON public.brands
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
