-- Track who sent project and organization member invitations
-- Created: 2026-04-02

ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_invited_by
  ON public.project_members(invited_by);

CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by
  ON public.organization_members(invited_by);
