-- Add columns to cards table for progress tracking and critical path
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='progress_percent') THEN
    ALTER TABLE cards ADD COLUMN progress_percent SMALLINT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='actual_start') THEN
    ALTER TABLE cards ADD COLUMN actual_start TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='actual_end') THEN
    ALTER TABLE cards ADD COLUMN actual_end TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='is_critical_path') THEN
    ALTER TABLE cards ADD COLUMN is_critical_path BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_progress_percent ON cards(progress_percent);
CREATE INDEX IF NOT EXISTS idx_cards_is_critical_path ON cards(is_critical_path);
CREATE INDEX IF NOT EXISTS idx_cards_actual_dates ON cards(actual_start, actual_end);
