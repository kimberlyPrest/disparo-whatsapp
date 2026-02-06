-- Migration to disable email confirmation requirement by auto-confirming users
-- This ensures that even if the project setting is enabled, users are confirmed immediately

-- Function to auto-confirm new users
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.email_confirmed_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Trigger to run before insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_users();

-- Update existing users to be confirmed
UPDATE auth.users
SET email_confirmed_at = timezone('utc', now())
WHERE email_confirmed_at IS NULL;
