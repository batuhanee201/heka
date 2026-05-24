CREATE TABLE IF NOT EXISTS public.product_technical_details (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id              UUID         NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    socket_type             TEXT,
    voltage_range           TEXT,
    power_w                 NUMERIC(6,2) CHECK (power_w > 0),
    light_output_lm         NUMERIC(8,2) CHECK (light_output_lm >= 0),
    color_temp_k            INTEGER      CHECK (color_temp_k BETWEEN 1000 AND 10000),
    color_rendering_index   NUMERIC(4,1),
    beam_angle_deg          NUMERIC(5,2),
    dimmable                BOOLEAN      NOT NULL DEFAULT false,
    energy_efficiency_class TEXT         CHECK (energy_efficiency_class IN ('A','B','C','D','E','F','G')),
    lifetime_hours          INTEGER      CHECK (lifetime_hours > 0),
    ip_rating               TEXT,
    operating_temp_min_c    NUMERIC(5,1),
    operating_temp_max_c    NUMERIC(5,1),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ptd_socket_type
    ON public.product_technical_details (socket_type);

CREATE INDEX IF NOT EXISTS idx_ptd_energy_class
    ON public.product_technical_details (energy_efficiency_class);

CREATE INDEX IF NOT EXISTS idx_ptd_dimmable
    ON public.product_technical_details (dimmable) WHERE dimmable = true;

CREATE TRIGGER trg_ptd_updated_at
    BEFORE UPDATE ON public.product_technical_details
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_technical_details ENABLE ROW LEVEL SECURITY;
