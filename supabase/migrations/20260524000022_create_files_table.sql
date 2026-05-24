CREATE TABLE IF NOT EXISTS public.files (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_name       TEXT        NOT NULL,
    storage_path      TEXT        NOT NULL UNIQUE,
    original_filename TEXT        NOT NULL,
    mime_type         TEXT        NOT NULL,
    size_bytes        BIGINT      NOT NULL CHECK (size_bytes > 0),
    is_public         BOOLEAN     NOT NULL DEFAULT false,
    uploaded_by       UUID        NOT NULL REFERENCES public.users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by
    ON public.files (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_files_bucket_name
    ON public.files (bucket_name) WHERE deleted_at IS NULL;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
