-- Allow 'user' role to view clients when app_permissions enables it
-- This complements existing policies for 'admin' and 'accountant'

-- Policy: Users can view all clients if global permission is enabled
CREATE POLICY "Users can view clients when permission enabled"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'user') AND
    EXISTS (
      SELECT 1
      FROM public.app_permissions ap
      WHERE ap.user_can_view_clients = true
      LIMIT 1
    )
  );