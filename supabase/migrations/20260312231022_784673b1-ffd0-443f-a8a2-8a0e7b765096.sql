-- Create missing profiles for existing users
INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, u.raw_user_meta_data->>'full_name'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Re-create the trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
