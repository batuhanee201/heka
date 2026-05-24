CREATE TABLE IF NOT EXISTS public.permissions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT        NOT NULL UNIQUE,
    description TEXT,
    module      TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions (module);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
