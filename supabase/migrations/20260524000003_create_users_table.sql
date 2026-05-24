CREATE TABLE IF NOT EXISTS public.users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_auth_id  UUID        NOT NULL UNIQUE,
    email             TEXT        NOT NULL,
    phone             TEXT,
    full_name         TEXT        NOT NULL,
    password_hash     TEXT        NOT NULL,
    email_verified    BOOLEAN     NOT NULL DEFAULT false,
    phone_verified    BOOLEAN     NOT NULL DEFAULT false,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
    ON public.users (email) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_active
    ON public.users (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active
    ON public.users (is_active) WHERE is_active = true;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
