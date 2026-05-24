CREATE TABLE IF NOT EXISTS public.audit_logs (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    event_type     TEXT        NOT NULL,
    event_category TEXT        NOT NULL CHECK (event_category IN ('auth','data','permission','file','security')),
    entity_type    TEXT,
    entity_id      UUID,
    old_data       JSONB,
    new_data       JSONB,
    ip_address     INET,
    user_agent     TEXT,
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id
    ON public.audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_event_category
    ON public.audit_logs (event_category);

CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON public.audit_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_metadata
    ON public.audit_logs USING GIN (metadata);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
