-- Migration: Create unified meetings table
-- Date: 2026-03-25
-- Description: Consolidates PM/HR meetings and calendar events into a single time-based event model

-- Step 1: Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,    -- Start time
  end_time TIMESTAMP WITH TIME ZONE,                 -- End time (for duration support)
  duration_minutes INTEGER,                          -- Explicit duration or computed from (end_time - meeting_date)
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  attendee_ids UUID[] DEFAULT ARRAY[]::UUID[],       -- Array of attendee UUIDs
  status VARCHAR(20) DEFAULT 'scheduled',            -- scheduled, in_progress, completed, cancelled
  meeting_type VARCHAR(50) DEFAULT 'general',        -- general, standup, review, one_on_one, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meetings_project_id 
ON public.meetings(project_id);

CREATE INDEX IF NOT EXISTS idx_meetings_date_range 
ON public.meetings(project_id, meeting_date, end_time);

CREATE INDEX IF NOT EXISTS idx_meetings_organizer 
ON public.meetings(organizer_id);

-- Step 3: Add check constraint for date logic
ALTER TABLE public.meetings
ADD CONSTRAINT chk_meeting_dates CHECK (
  end_time IS NULL OR meeting_date <= end_time
);

-- Step 4: Add computed column index for attendee search (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_meetings_attendees 
ON public.meetings USING GIN(attendee_ids);

-- Note: Existing pm_meeting_reviews and meeting_action_items tables remain for historical context
-- New meeting events should use this table going forward
-- Migration of existing meeting data from pm_meeting_reviews is a separate data migration step
