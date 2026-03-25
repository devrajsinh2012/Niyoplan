-- Migration: Add cards baseline and progress tracking
-- Date: 2026-03-25
-- Description: Extends cards table with progress percentage and baseline date fields for burndown/variance tracking

-- Step 1: Add progress and baseline columns to cards
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS progress_percent SMALLINT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for critical path queries
CREATE INDEX IF NOT EXISTS idx_cards_critical_path 
ON public.cards(project_id, is_critical_path) 
WHERE is_critical_path = TRUE;

-- Step 3: Create index for progress queries
CREATE INDEX IF NOT EXISTS idx_cards_progress 
ON public.cards(project_id, progress_percent) 
WHERE progress_percent < 100;

-- Step 4: Add check constraint to ensure actual dates are valid
ALTER TABLE public.cards
ADD CONSTRAINT chk_actual_dates CHECK (actual_start IS NULL OR actual_end IS NULL OR actual_start <= actual_end);

-- Note: progress_percent and critical_path are computed/managed server-side during planning API calls
