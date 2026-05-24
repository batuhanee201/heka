CREATE TABLE IF NOT EXISTS public.file_relations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       UUID        NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    entity_type   TEXT        NOT NULL,
    entity_id     UUID        NOT NULL,
    relation_type TEXT        NOT NULL,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_relations_entity
    ON public.file_relations (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_file_relations_entity_sort
    ON public.file_relations (entity_type, entity_id, sort_order);

-- Bir entity'nin yalnızca tek bir ana görseli olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_relations_main_image
    ON public.file_relations (entity_type, entity_id)
    WHERE relation_type = 'main_image';

ALTER TABLE public.file_relations ENABLE ROW LEVEL SECURITY;
