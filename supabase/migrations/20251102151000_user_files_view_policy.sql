-- Permitir que usuários visualizem arquivos quando a permissão global estiver ativa
DROP POLICY IF EXISTS "Users can view files when permission enabled" ON public.files;

CREATE POLICY "Users can view files when permission enabled"
  ON public.files FOR SELECT
  USING (
    public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()
  );