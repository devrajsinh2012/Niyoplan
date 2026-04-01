-- Scope docs spaces to projects and keep existing hierarchy links intact.
ALTER TABLE public.spaces
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_spaces_project_id ON public.spaces(project_id);

-- Backfill unscoped spaces that are linked to exactly one project.
WITH space_project_pairs AS (
  SELECT DISTINCT space_id, project_id
  FROM public.folders
  WHERE space_id IS NOT NULL AND project_id IS NOT NULL
  UNION
  SELECT DISTINCT space_id, project_id
  FROM public.docs
  WHERE space_id IS NOT NULL AND project_id IS NOT NULL
),
single_project_spaces AS (
  SELECT
    space_id,
    MIN(project_id::text)::UUID AS project_id
  FROM space_project_pairs
  GROUP BY space_id
  HAVING COUNT(DISTINCT project_id) = 1
)
UPDATE public.spaces s
SET project_id = sps.project_id
FROM single_project_spaces sps
WHERE s.id = sps.space_id
  AND s.project_id IS NULL;

-- If one legacy space is reused by multiple projects, clone the space per project
-- so each project gets an isolated hierarchy.
DO $$
DECLARE
  pair RECORD;
  cloned_space_id UUID;
BEGIN
  FOR pair IN
    WITH space_project_pairs AS (
      SELECT DISTINCT space_id, project_id
      FROM public.folders
      WHERE space_id IS NOT NULL AND project_id IS NOT NULL
      UNION
      SELECT DISTINCT space_id, project_id
      FROM public.docs
      WHERE space_id IS NOT NULL AND project_id IS NOT NULL
    ),
    ranked_pairs AS (
      SELECT
        s.id AS source_space_id,
        s.name,
        s.description,
        s.created_by,
        s.created_at,
        spp.project_id,
        ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY spp.project_id) AS rn
      FROM public.spaces s
      JOIN space_project_pairs spp ON spp.space_id = s.id
    )
    SELECT *
    FROM ranked_pairs
    WHERE rn > 1
  LOOP
    INSERT INTO public.spaces (project_id, name, description, created_by, created_at)
    VALUES (pair.project_id, pair.name, pair.description, pair.created_by, pair.created_at)
    RETURNING id INTO cloned_space_id;

    UPDATE public.folders
    SET space_id = cloned_space_id
    WHERE space_id = pair.source_space_id
      AND project_id = pair.project_id;

    UPDATE public.docs
    SET space_id = cloned_space_id
    WHERE space_id = pair.source_space_id
      AND project_id = pair.project_id;
  END LOOP;
END $$;

-- Keep docs aligned with folder ownership after remapping.
UPDATE public.docs d
SET space_id = f.space_id
FROM public.folders f
WHERE d.folder_id = f.id
  AND d.space_id IS DISTINCT FROM f.space_id;

-- Enforce NOT NULL only when all rows are scoped.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.spaces WHERE project_id IS NULL) THEN
    ALTER TABLE public.spaces
    ALTER COLUMN project_id SET NOT NULL;
  END IF;
END $$;
