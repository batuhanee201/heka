CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier    TEXT        NOT NULL,
    action_type   TEXT        NOT NULL CHECK (action_type IN ('login','otp_request','password_reset','otp_verify')),
    attempt_count INTEGER     NOT NULL DEFAULT 1,
    window_start  TIMESTAMPTZ NOT NULL,
    blocked_until TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_action
    ON public.rate_limit_logs (identifier, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start
    ON public.rate_limit_logs (window_start);

CREATE TRIGGER trg_rate_limit_updated_at
    BEFORE UPDATE ON public.rate_limit_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
