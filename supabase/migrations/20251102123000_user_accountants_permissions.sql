-- Add new user permissions for accountants management
ALTER TABLE public.app_permissions
  ADD COLUMN IF NOT EXISTS user_can_view_accountants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_can_edit_accountants boolean NOT NULL DEFAULT false;

-- Ensure existing row(s) have explicit values set
UPDATE public.app_permissions
SET user_can_view_accountants = COALESCE(user_can_view_accountants, false),
    user_can_edit_accountants = COALESCE(user_can_edit_accountants, false);