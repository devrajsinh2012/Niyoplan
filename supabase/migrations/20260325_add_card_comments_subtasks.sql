-- Create Card Comments table
CREATE TABLE IF NOT EXISTS public.card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for card_comments
CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON public.card_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_user_id ON public.card_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_created_at ON public.card_comments(created_at DESC);

-- Create Card Subtasks table
CREATE TABLE IF NOT EXISTS public.card_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rank FLOAT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for card_subtasks
CREATE INDEX IF NOT EXISTS idx_card_subtasks_card_id ON public.card_subtasks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_subtasks_assignee_id ON public.card_subtasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_card_subtasks_completed ON public.card_subtasks(completed);
