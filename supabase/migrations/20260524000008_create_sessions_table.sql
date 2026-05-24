CREATE TABLE IF NOT EXISTS public.sessions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT        NOT NULL UNIQUE,
    device_info        JSONB,
    ip_address         INET,
    user_agent         TEXT,
    expires_at         TIMESTAMPTZ NOT NULL,
    last_active_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON public.sessions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash
    ON public.sessions (refresh_token_hash);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON public.sessions (expires_at);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
