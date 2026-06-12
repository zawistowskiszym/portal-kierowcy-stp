
CREATE TABLE public.popup_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.popup_announcements TO authenticated;
GRANT ALL ON public.popup_announcements TO service_role;

ALTER TABLE public.popup_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "popup_ann_select_active_or_staff"
  ON public.popup_announcements FOR SELECT
  TO authenticated
  USING (
    archived = false
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dyspozytor')
  );

CREATE POLICY "popup_ann_staff_insert"
  ON public.popup_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dyspozytor')
  );

CREATE POLICY "popup_ann_staff_update"
  ON public.popup_announcements FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dyspozytor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dyspozytor')
  );

CREATE POLICY "popup_ann_admin_delete"
  ON public.popup_announcements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER popup_ann_updated_at
  BEFORE UPDATE ON public.popup_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.popup_announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.popup_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.popup_announcement_reads TO authenticated;
GRANT ALL ON public.popup_announcement_reads TO service_role;

ALTER TABLE public.popup_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "popup_reads_own_select"
  ON public.popup_announcement_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "popup_reads_own_insert"
  ON public.popup_announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "popup_reads_own_delete"
  ON public.popup_announcement_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX popup_ann_active_idx ON public.popup_announcements (archived, created_at DESC);
