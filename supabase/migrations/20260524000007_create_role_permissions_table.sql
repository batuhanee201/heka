CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id       UUID        NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID        NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by    UUID        REFERENCES public.users(id),
    PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
