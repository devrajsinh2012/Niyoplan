DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'qa';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'pm';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'qa';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;