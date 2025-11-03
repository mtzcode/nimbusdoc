-- Corrigir helpers de permissões para sempre considerar a linha mais recente
-- Isso evita leituras indeterminísticas quando há mais de uma linha em app_permissions

-- Users/Clients permissions
CREATE OR REPLACE FUNCTION public.permission_user_can_view_clients()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_view_clients
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_edit_clients()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_edit_clients
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_manage_folders()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_manage_folders
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_delete_files()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_delete_files
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;

-- Accountants permissions
CREATE OR REPLACE FUNCTION public.permission_user_can_view_accountants()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_view_accountants
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_edit_accountants()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT user_can_edit_accountants
    FROM public.app_permissions
    ORDER BY id DESC
    LIMIT 1
  ), false)
$$;