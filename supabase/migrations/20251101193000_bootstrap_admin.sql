-- Backfill profiles for existing auth.users and promote admin by email
-- This migration is idempotent and safe to re-run.

-- Ensure profiles exist for all auth users
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', NULL)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Promote the specified user to admin role by email
WITH user_profile AS (
  SELECT id FROM public.profiles WHERE email = 'pabllo.mtzcode@gmail.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM user_profile
ON CONFLICT (user_id, role) DO NOTHING;