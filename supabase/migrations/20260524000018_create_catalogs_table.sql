CREATE TABLE IF NOT EXISTS public.catalogs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','archived')),
    valid_from  DATE,
    valid_to    DATE,
    created_by  UUID        NOT NULL REFERENCES public.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT chk_catalogs_valid_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_catalogs_status_active
    ON public.catalogs (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_catalogs_valid_from ON public.catalogs (valid_from);
CREATE INDEX IF NOT EXISTS idx_catalogs_valid_to   ON public.catalogs (valid_to);

CREATE TRIGGER trg_catalogs_updated_at
    BEFORE UPDATE ON public.catalogs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
