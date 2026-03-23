-- Migration: Add organizations and organization membership support
-- Created: 2026-03-23

-- ============================================
-- 1. Create enum types
-- ============================================
DO $$
BEGIN
  CREATE TYPE org_role AS ENUM ('admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE member_status AS ENUM ('pending', 'active', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Create organizations table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  industry VARCHAR(100),
  size VARCHAR(50),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. Create organization_members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role org_role DEFAULT 'member'::org_role,
  status member_status DEFAULT 'pending'::member_status,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, organization_id)
);

-- ============================================
-- 4. Add organization_id to projects
-- ============================================
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================
-- 5. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON public.organization_members(status);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(organization_id);

-- ============================================
-- 6. Invite code generation function + trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'NYP-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    LOOP
      new_code := public.generate_invite_code();
      IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE invite_code = new_code) THEN
        NEW.invite_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_organization ON public.organizations;
CREATE TRIGGER before_insert_organization
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_organization();

-- ============================================
-- 7. Refresh PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
