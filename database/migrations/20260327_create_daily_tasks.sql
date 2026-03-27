-- Migration: Create daily_tasks table for Today module
-- This table replaces localStorage storage to support task assignment and persistence.

CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  estimate_mins INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium',
  is_done BOOLEAN DEFAULT FALSE,
  done_at DATE,
  type VARCHAR(20) DEFAULT 'custom', -- 'custom' or 'card'
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily tasks" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins/PMs can insert for others" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins/PMs can view/edit organization tasks" ON public.daily_tasks;

-- 1. Users can manage their own daily tasks
CREATE POLICY "Users can manage own daily tasks" ON public.daily_tasks
  FOR ALL USING (auth.uid() = user_id);

-- 2. Admins/PMs can create/assign daily tasks to others in the same organization
CREATE POLICY "Admins/PMs can insert for others" ON public.daily_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.profiles p ON om.user_id = p.id
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = daily_tasks.organization_id 
      AND (om.role = 'admin' OR p.role = 'pm')
    )
  );

-- 3. Admins/PMs can view/edit daily tasks of their organization members
CREATE POLICY "Admins/PMs can view/edit organization tasks" ON public.daily_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.profiles p ON om.user_id = p.id
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = daily_tasks.organization_id 
      AND (om.role = 'admin' OR p.role = 'pm')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON public.daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_org_id ON public.daily_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_done_at ON public.daily_tasks(done_at);
