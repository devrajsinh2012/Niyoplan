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
      WHEN is_first_user THEN 'admin'::user_role
      WHEN invited_role IN ('admin', 'pm', 'qa', 'developer', 'member', 'viewer') THEN invited_role::user_role
      ELSE 'member'::user_role
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
