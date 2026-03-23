import { supabaseAdmin } from '../lib/supabaseServer.js';

async function runOrganizationMigration() {
  try {
    console.log('Running organization migration...');

    // Create custom types
    const types = [
      `CREATE TYPE IF NOT EXISTS org_role AS ENUM ('admin', 'member', 'viewer')`,
      `CREATE TYPE IF NOT EXISTS member_status AS ENUM ('pending', 'active', 'rejected')`
    ];

    for (const typeSQL of types) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: typeSQL });
      if (error) console.log('Type creation (might already exist):', error.message);
    }

    // Create organizations table
    const orgTableSQL = `
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        logo_url TEXT,
        invite_code VARCHAR(20) NOT NULL UNIQUE,
        industry VARCHAR(100),
        size VARCHAR(50),
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      )
    `;

    const { error: orgError } = await supabaseAdmin.rpc('exec_sql', { sql: orgTableSQL });
    if (orgError) {
      console.error('Error creating organizations table:', orgError);
    } else {
      console.log('Organizations table created/verified');
    }

    // Create organization_members table
    const membersTableSQL = `
      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role org_role DEFAULT 'member'::org_role,
        status member_status DEFAULT 'pending'::member_status,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id, organization_id)
      )
    `;

    const { error: membersError } = await supabaseAdmin.rpc('exec_sql', { sql: membersTableSQL });
    if (membersError) {
      console.error('Error creating organization_members table:', membersError);
    } else {
      console.log('Organization members table created/verified');
    }

    // Add organization_id to projects table
    const alterProjectsSQL = `
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
    `;

    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', { sql: alterProjectsSQL });
    if (alterError) {
      console.error('Error altering projects table:', alterError);
    } else {
      console.log('Projects table updated with organization_id');
    }

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id)`,
      `CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status)`,
      `CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id)`
    ];

    for (const indexSQL of indexes) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: indexSQL });
      if (error) console.log('Index creation (might already exist):', error.message);
    }

    // Create invite code generation function
    const functionSQL = `
      CREATE OR REPLACE FUNCTION generate_invite_code()
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
    `;

    const { error: funcError } = await supabaseAdmin.rpc('exec_sql', { sql: functionSQL });
    if (funcError) {
      console.error('Error creating function:', funcError);
    } else {
      console.log('Invite code generation function created');
    }

    // Create trigger for auto-generating invite codes
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION handle_new_organization()
      RETURNS TRIGGER AS $$
      DECLARE
        new_code TEXT;
      BEGIN
        IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
          LOOP
            new_code := generate_invite_code();
            IF NOT EXISTS (SELECT 1 FROM organizations WHERE invite_code = new_code) THEN
              NEW.invite_code := new_code;
              EXIT;
            END IF;
          END LOOP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS before_insert_organization ON organizations;
      CREATE TRIGGER before_insert_organization
        BEFORE INSERT ON organizations
        FOR EACH ROW EXECUTE PROCEDURE handle_new_organization();
    `;

    const { error: triggerError } = await supabaseAdmin.rpc('exec_sql', { sql: triggerSQL });
    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
    } else {
      console.log('Organization trigger created');
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runOrganizationMigration();