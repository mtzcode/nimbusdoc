-- Permitir upload em storage.objects para usuários com permissão de gerenciar pastas
DROP POLICY IF EXISTS "Permitted users can upload storage files" ON storage.objects;

CREATE POLICY "Permitted users can upload storage files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fiscal-files' AND public.is_user(auth.uid()) AND public.permission_user_can_manage_folders()
  );