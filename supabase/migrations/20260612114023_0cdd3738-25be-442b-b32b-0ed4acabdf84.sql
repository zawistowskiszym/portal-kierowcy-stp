
-- 1) Announcement comments
CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_comments_ann ON public.announcement_comments(announcement_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read comments"
  ON public.announcement_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Author insert own comments"
  ON public.announcement_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Author delete own comments"
  ON public.announcement_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2) Allow signed-in users to read basic profile info (so author names appear in messages, comments, etc.)
CREATE POLICY "Authenticated read basic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
