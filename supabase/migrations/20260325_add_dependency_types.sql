-- Migration: Add dependency types and lead/lag support
-- Date: 2026-03-25
-- Description: Extends card_dependencies table with full dependency type support and lead/lag precision

-- Step 1: Create dependency type enum if not exists
DO $$
BEGIN
  CREATE TYPE dependency_type AS ENUM ('finish_start', 'finish_finish', 'start_start', 'start_finish');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add columns to card_dependencies
ALTER TABLE public.card_dependencies
ADD COLUMN IF NOT EXISTS type dependency_type DEFAULT 'finish_start'::dependency_type,
ADD COLUMN IF NOT EXISTS lead_or_lag_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 3: Create index for faster dependency lookups
CREATE INDEX IF NOT EXISTS idx_card_dependencies_source_target 
ON public.card_dependencies(source_id, target_id);

-- Step 4: Add check constraint for lead/lag bounds
ALTER TABLE public.card_dependencies
ADD CONSTRAINT chk_lead_lag_bounds CHECK (lead_or_lag_days >= -365 AND lead_or_lag_days <= 365);

-- Step 5: Add unique constraint on source+target (prevent duplicate dependencies)
ALTER TABLE public.card_dependencies
DROP CONSTRAINT IF EXISTS card_dependencies_pred_succ_key;

ALTER TABLE public.card_dependencies
ADD CONSTRAINT uq_card_dependencies_source_target UNIQUE (predecessor_id, successor_id);

-- Note: Column naming remains predecessor_id/successor_id for compatibility
-- The 'type' column defines the relationship semantics
