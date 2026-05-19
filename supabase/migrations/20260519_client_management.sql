-- Client management module

DO $$
BEGIN
  CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_tier AS ENUM ('vip', 'standard', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_communication_type AS ENUM ('email', 'call', 'meeting', 'message');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_reminder_type AS ENUM ('follow_up', 'meeting', 'delivery', 'check_in', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_reminder_status AS ENUM ('pending', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_interaction_type AS ENUM ('email', 'call', 'meeting', 'message', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE client_deliverable_status AS ENUM ('pending', 'delivered', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status client_status NOT NULL DEFAULT 'active',
  tier client_tier NOT NULL DEFAULT 'standard',
  contract_value NUMERIC,
  contract_end_date DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_communication client_communication_type NOT NULL DEFAULT 'email',
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type client_reminder_type NOT NULL DEFAULT 'follow_up',
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE,
  status client_reminder_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  interaction_type client_interaction_type NOT NULL DEFAULT 'call',
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  action_items TEXT,
  next_action_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  delivered_date DATE,
  status client_deliverable_status NOT NULL DEFAULT 'pending',
  acceptance_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reminders_client_id ON public.client_reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reminders_project_id ON public.client_reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_client_reminders_assigned_to ON public.client_reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_reminders_status ON public.client_reminders(status);
CREATE INDEX IF NOT EXISTS idx_client_reminders_due_at ON public.client_reminders(due_at);
CREATE INDEX IF NOT EXISTS idx_client_reminders_remind_at ON public.client_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON public.client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_project_id ON public.client_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_client_id ON public.client_deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_project_id ON public.client_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_status ON public.client_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_due_date ON public.client_deliverables(due_date);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view clients" ON public.clients;
CREATE POLICY "Org members can view clients" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = clients.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org managers can manage clients" ON public.clients;
CREATE POLICY "Org managers can manage clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = clients.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = clients.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  );

DROP POLICY IF EXISTS "Org members can view client contacts" ON public.client_contacts;
CREATE POLICY "Org members can view client contacts" ON public.client_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_contacts.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org managers can manage client contacts" ON public.client_contacts;
CREATE POLICY "Org managers can manage client contacts" ON public.client_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_contacts.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_contacts.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  );

DROP POLICY IF EXISTS "Org members can view client reminders" ON public.client_reminders;
CREATE POLICY "Org members can view client reminders" ON public.client_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_reminders.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org managers can manage client reminders" ON public.client_reminders;
CREATE POLICY "Org managers can manage client reminders" ON public.client_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_reminders.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_reminders.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  );

DROP POLICY IF EXISTS "Org members can view client interactions" ON public.client_interactions;
CREATE POLICY "Org members can view client interactions" ON public.client_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_interactions.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org managers can manage client interactions" ON public.client_interactions;
CREATE POLICY "Org managers can manage client interactions" ON public.client_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_interactions.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_interactions.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  );

DROP POLICY IF EXISTS "Org members can view client deliverables" ON public.client_deliverables;
CREATE POLICY "Org members can view client deliverables" ON public.client_deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_deliverables.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org managers can manage client deliverables" ON public.client_deliverables;
CREATE POLICY "Org managers can manage client deliverables" ON public.client_deliverables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_deliverables.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_deliverables.client_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('admin', 'pm')
    )
  );

