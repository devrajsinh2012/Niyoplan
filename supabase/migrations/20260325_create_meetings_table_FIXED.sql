-- Create meetings table for unified schedule consolidation
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME DEFAULT '09:00:00',
  end_time TIME DEFAULT '10:00:00',
  duration_minutes INTEGER DEFAULT 60,
  organizer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attendee_ids UUID[] DEFAULT ARRAY[]::UUID[],
  status VARCHAR(20) DEFAULT 'scheduled',
  meeting_type VARCHAR(20) DEFAULT 'general',
  location VARCHAR(255),
  video_call_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_attendee_ids ON meetings USING GIN(attendee_ids);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
