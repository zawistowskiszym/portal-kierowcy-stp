
-- 1) Restrict driver_message inserts to users with the 'driver' role
DROP POLICY IF EXISTS im_ins ON public.internal_messages;
CREATE POLICY im_ins ON public.internal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'dyspozytor'::app_role)
      OR (
        audience_kind::text = 'dispatchers'
        AND kind::text = 'driver_message'
        AND public.has_role(auth.uid(), 'driver'::app_role)
      )
    )
  );

-- 2) Pin search_path on pgmq wrapper functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
