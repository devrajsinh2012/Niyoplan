-- Fix auth signup trigger so Supabase can resolve custom types during user creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  invited_role TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
  invited_role := lower(COALESCE(new.raw_user_meta_data->>'role', ''));

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN is_first_user THEN 'admin'::public.user_role
      WHEN invited_role IN ('admin', 'pm', 'qa', 'developer', 'member', 'viewer') THEN invited_role::public.user_role
      ELSE 'member'::public.user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      role = EXCLUDED.role,
      updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
