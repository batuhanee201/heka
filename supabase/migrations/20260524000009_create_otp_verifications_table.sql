CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel       TEXT        NOT NULL CHECK (channel IN ('email','sms')),
    purpose       TEXT        NOT NULL CHECK (purpose IN ('email_verification','phone_verification','password_reset','login_2fa')),
    code_hash     TEXT        NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    used_at       TIMESTAMPTZ,
    attempt_count INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_purpose
    ON public.otp_verifications (user_id, purpose);

CREATE INDEX IF NOT EXISTS idx_otp_expires_at
    ON public.otp_verifications (expires_at);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
