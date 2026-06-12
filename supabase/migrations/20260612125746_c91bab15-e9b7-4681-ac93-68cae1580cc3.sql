ALTER TABLE public.popup_announcements REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.popup_announcements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;