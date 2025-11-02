-- Helpers de permissões para contabilidades e políticas de visibilidade para usuários

-- Helpers
CREATE OR REPLACE FUNCTION public.permission_user_can_view_accountants()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_view_accountants FROM public.app_permissions LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_edit_accountants()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_edit_accountants FROM public.app_permissions LIMIT 1), false)
$$;

-- Usuários podem visualizar contabilidades (via user_roles) quando a permissão global estiver ativa
DROP POLICY IF EXISTS "Users can view accountants via user_roles" ON public.user_roles;
CREATE POLICY "Users can view accountants via user_roles"
  ON public.user_roles FOR SELECT
  USING (
    public.is_user(auth.uid()) AND public.permission_user_can_view_accountants() AND role = 'accountant'
  );

-- Usuários podem visualizar perfis de contadores quando a permissão global estiver ativa
DROP POLICY IF EXISTS "Users can view accountant profiles" ON public.profiles;
CREATE POLICY "Users can view accountant profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_user(auth.uid()) AND public.permission_user_can_view_accountants() AND EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = profiles.id AND ur.role = 'accountant'
    )
  );