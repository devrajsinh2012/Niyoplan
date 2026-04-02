-- Google Drive storage integration for organization-scoped attachments
-- Created: 2026-04-02

CREATE TABLE IF NOT EXISTS public.org_google_drive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  root_folder_id TEXT NOT NULL,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_id)
);

CREATE TABLE IF NOT EXISTS public.file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

ALTER TABLE public.org_google_drive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_org_google_drive_org_id
  ON public.org_google_drive(org_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_org_id
  ON public.file_attachments(org_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_project_id
  ON public.file_attachments(project_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_card_id
  ON public.file_attachments(card_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_at
  ON public.file_attachments(uploaded_at DESC);
