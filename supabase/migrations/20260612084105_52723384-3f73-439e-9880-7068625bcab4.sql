
ALTER TYPE public.message_audience_kind ADD VALUE IF NOT EXISTS 'dispatchers';
ALTER TYPE public.message_kind ADD VALUE IF NOT EXISTS 'driver_message';

DROP POLICY IF EXISTS im_ins ON public.internal_messages;
CREATE POLICY im_ins ON public.internal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'dyspozytor')
      OR (audience_kind::text = 'dispatchers' AND kind::text = 'driver_message')
    )
  );

DROP POLICY IF EXISTS mr_ins ON public.message_recipients;
CREATE POLICY mr_ins ON public.message_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'dyspozytor')
    OR EXISTS (
      SELECT 1 FROM public.internal_messages im
      WHERE im.id = message_recipients.message_id
        AND im.author_id = auth.uid()
    )
  );
