CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id     UUID        NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID        REFERENCES public.users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles (role_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
