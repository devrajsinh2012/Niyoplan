-- Step 1: Create the enum type (without IF NOT EXISTS - Supabase compatible)
-- Drop and recreate to ensure it works
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dependency_type') THEN
    CREATE TYPE dependency_type AS ENUM ('finish_start', 'finish_finish', 'start_start', 'start_finish');
  END IF;
END $$;

-- Step 2: Add columns to card_dependencies table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_dependencies' AND column_name='type') THEN
    ALTER TABLE card_dependencies ADD COLUMN type VARCHAR(20) DEFAULT 'finish_start';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_dependencies' AND column_name='lead_or_lag_days') THEN
    ALTER TABLE card_dependencies ADD COLUMN lead_or_lag_days INTEGER DEFAULT 0 CHECK (lead_or_lag_days >= -365 AND lead_or_lag_days <= 365);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_dependencies' AND column_name='created_by') THEN
    ALTER TABLE card_dependencies ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_dependencies_type ON card_dependencies(type);
CREATE INDEX IF NOT EXISTS idx_card_dependencies_created_by ON card_dependencies(created_by);
