-- Aplicar política de INSERT em storage.objects para usuários com permissão
-- Execute este SQL no Supabase SQL Editor

DROP POLICY IF EXISTS "Permitted users can upload storage files" ON storage.objects;

CREATE POLICY "Permitted users can upload storage files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fiscal-files'
    AND public.is_user(auth.uid())
    AND public.permission_user_can_manage_folders()
  );

-- Verificar se a política foi criada corretamente
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%upload%';