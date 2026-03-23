-- Migration: Add settings support for projects and profiles
-- Created: 2026-03-23

-- ============================================
-- 1. Add profile settings columns
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- ============================================
-- 2. Add project settings columns
-- ============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'software',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS sprint_duration TEXT DEFAULT '2',
ADD COLUMN IF NOT EXISTS sprint_naming TEXT DEFAULT 'Sprint {n}';

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================
-- 3. Create project_members table
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- ============================================
-- 4. Create avatars storage bucket (if not exists)
-- ============================================
-- This needs to be run in Supabase Dashboard or via SQL editor:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Create function to delete user account
-- ============================================
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete user's profile (cascades to related data)
  DELETE FROM profiles WHERE id = user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Migrate existing project creators to project_members
-- ============================================
INSERT INTO project_members (project_id, user_id, role, created_at)
SELECT id, created_by, 'admin', created_at
FROM projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================
-- 7. Enable Row Level Security on project_members
-- ============================================
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of projects they belong to
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_members.project_id
    )
  );

-- Policy: Only project admins can insert members
CREATE POLICY "Project admins can add members" ON project_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = project_members.project_id AND role = 'admin'
    )
  );

-- Policy: Only project admins can update member roles
CREATE POLICY "Project admins can update members" ON project_members
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = project_members.project_id AND role = 'admin'
    )
  );

-- Policy: Only project admins can remove members
CREATE POLICY "Project admins can remove members" ON project_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = project_members.project_id AND role = 'admin'
    )
  );

-- ============================================
-- 8. Update trigger for project_members
-- ============================================
CREATE TRIGGER update_project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. Comments for documentation
-- ============================================
COMMENT ON TABLE project_members IS 'Manages project membership and roles';
COMMENT ON COLUMN project_members.role IS 'User role in project: admin (full access), member (create/edit), viewer (read-only)';
COMMENT ON COLUMN projects.type IS 'Project type: software, marketing, design, other';
COMMENT ON COLUMN projects.status IS 'Project status: active, on_hold, archived';
COMMENT ON COLUMN projects.sprint_duration IS 'Default sprint duration in weeks (1-4)';
COMMENT ON COLUMN projects.sprint_naming IS 'Sprint naming pattern with {n} as placeholder';
COMMENT ON COLUMN profiles.username IS 'Unique username for the user';
COMMENT ON COLUMN profiles.bio IS 'User biography (max 160 chars)';
COMMENT ON COLUMN profiles.timezone IS 'User timezone (e.g., UTC, America/New_York)';
