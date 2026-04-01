-- Add per-organization role permission overrides
CREATE TABLE IF NOT EXISTS public.organization_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role org_role NOT NULL,
  permission_key VARCHAR(80) NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_org_role_permissions_org_id
  ON public.organization_role_permissions(organization_id);
