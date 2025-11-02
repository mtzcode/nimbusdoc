-- Consolidar RLS com funções helpers para roles, permissões e vínculos
-- Invariantes: Admin => acesso total; Accountant => apenas recursos vinculados

-- Helpers de roles
CREATE OR REPLACE FUNCTION public.is_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_accountant(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'accountant')
$$;

CREATE OR REPLACE FUNCTION public.is_user(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'user')
$$;

-- Helpers de permissões globais do app
CREATE OR REPLACE FUNCTION public.permission_user_can_view_clients()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_view_clients FROM public.app_permissions LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_edit_clients()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_edit_clients FROM public.app_permissions LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_manage_folders()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_manage_folders FROM public.app_permissions LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.permission_user_can_delete_files()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT user_can_delete_files FROM public.app_permissions LIMIT 1), false)
$$;

-- Helpers de vínculos accountant <-> client e visibilidade de arquivos
CREATE OR REPLACE FUNCTION public.accountant_assigned_to_client(_accountant UUID, _client UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accountant_clients ac
    WHERE ac.accountant_id = _accountant AND ac.client_id = _client
  )
$$;

CREATE OR REPLACE FUNCTION public.file_visible_to_accountant(_file_id UUID, _accountant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.files f
    JOIN public.folders d ON d.id = f.folder_id
    JOIN public.accountant_clients ac ON ac.client_id = d.client_id
    WHERE f.id = _file_id AND ac.accountant_id = _accountant
  )
$$;

CREATE OR REPLACE FUNCTION public.storage_object_visible_to_accountant(_name TEXT, _accountant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.files f
    JOIN public.folders d ON d.id = f.folder_id
    JOIN public.accountant_clients ac ON ac.client_id = d.client_id
    WHERE f.file_path = _name AND ac.accountant_id = _accountant
  )
$$;

-- Refatorar RLS: clients
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Accountants can view assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients when permission enabled" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Accountants can view assigned clients"
  ON public.clients FOR SELECT
  USING (public.is_accountant(auth.uid()) AND public.accountant_assigned_to_client(auth.uid(), clients.id));

CREATE POLICY "Users can view clients when permission enabled"
  ON public.clients FOR SELECT
  USING (public.is_user(auth.uid()) AND public.permission_user_can_view_clients());

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins or permitted users can update clients"
  ON public.clients FOR UPDATE
  USING (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_edit_clients()))
  WITH CHECK (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_edit_clients()));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Refatorar RLS: folders
DROP POLICY IF EXISTS "Admins can view all folders" ON public.folders;
DROP POLICY IF EXISTS "Accountants can view folders of assigned clients" ON public.folders;
DROP POLICY IF EXISTS "Admins can insert folders" ON public.folders;
DROP POLICY IF EXISTS "Admins can update folders" ON public.folders;
DROP POLICY IF EXISTS "Admins can delete folders" ON public.folders;

CREATE POLICY "Admins can view all folders"
  ON public.folders FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Accountants can view folders of assigned clients"
  ON public.folders FOR SELECT
  USING (public.is_accountant(auth.uid()) AND public.accountant_assigned_to_client(auth.uid(), folders.client_id));

CREATE POLICY "Users can view folders when permission enabled"
  ON public.folders FOR SELECT
  USING (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders());

CREATE POLICY "Admins or permitted users can insert folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()));

CREATE POLICY "Admins or permitted users can update folders"
  ON public.folders FOR UPDATE
  USING (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()))
  WITH CHECK (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()));

CREATE POLICY "Admins or permitted users can delete folders"
  ON public.folders FOR DELETE
  USING (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()));

-- Refatorar RLS: files
DROP POLICY IF EXISTS "Admins can view all files" ON public.files;
DROP POLICY IF EXISTS "Accountants can view files of assigned clients" ON public.files;
DROP POLICY IF EXISTS "Admins can insert files" ON public.files;
DROP POLICY IF EXISTS "Admins can delete files" ON public.files;

CREATE POLICY "Admins can view all files"
  ON public.files FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Accountants can view files of assigned clients"
  ON public.files FOR SELECT
  USING (public.is_accountant(auth.uid()) AND public.file_visible_to_accountant(files.id, auth.uid()));

CREATE POLICY "Admins or permitted users can insert files"
  ON public.files FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()));

CREATE POLICY "Admins or permitted users can delete files"
  ON public.files FOR DELETE
  USING (public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_delete_files()));

-- Refatorar RLS: accountant_clients
DROP POLICY IF EXISTS "Admins can manage accountant assignments" ON public.accountant_clients;
DROP POLICY IF EXISTS "Accountants can view own assignments" ON public.accountant_clients;

CREATE POLICY "Admins can manage accountant assignments"
  ON public.accountant_clients FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Accountants can view own assignments"
  ON public.accountant_clients FOR SELECT
  USING (auth.uid() = accountant_id);

-- Refatorar RLS: storage.objects (bucket fiscal-files)
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can view assigned files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;

CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fiscal-files' AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can view all storage files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-files' AND public.is_admin(auth.uid())
  );

CREATE POLICY "Accountants can view assigned storage files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-files' AND public.is_accountant(auth.uid()) AND public.storage_object_visible_to_accountant(objects.name, auth.uid())
  );

CREATE POLICY "Permitted users can view storage files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-files' AND public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()
  );

CREATE POLICY "Admins or permitted users can delete storage files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fiscal-files' AND (
      public.is_admin(auth.uid()) OR (public.is_user(auth.uid()) AND public.permission_user_can_delete_files())
    )
  );