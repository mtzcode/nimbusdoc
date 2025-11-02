-- Promote admin for a specific user by email (idempotent)
-- Ensures profile exists and assigns 'admin' role

WITH target AS (
  SELECT u.id AS user_id,
         u.email,
         COALESCE(u.raw_user_meta_data->>'full_name', NULL) AS full_name
  FROM auth.users u
  WHERE u.email = 'pabllo.mtzcode@gmail.com'
)
-- Ensure profile exists for the target user
INSERT INTO public.profiles (id, email, full_name)
SELECT t.user_id, t.email, t.full_name
FROM target t
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = t.user_id
);

-- Assign admin role if not already assigned
WITH target AS (
  SELECT u.id AS user_id
  FROM auth.users u
  WHERE u.email = 'pabllo.mtzcode@gmail.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT t.user_id, 'admin'::public.app_role
FROM target t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = t.user_id AND ur.role = 'admin'::public.app_role
);