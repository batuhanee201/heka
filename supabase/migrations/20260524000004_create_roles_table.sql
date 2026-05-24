CREATE TABLE IF NOT EXISTS public.roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
