
CREATE TYPE public.recruitment_status AS ENUM ('new','reviewing','accepted','rejected');

CREATE TABLE public.recruitment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  roblox_username text NOT NULL,
  discord_username text,
  motivation text NOT NULL,
  experience text,
  status public.recruitment_status NOT NULL DEFAULT 'new',
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.recruitment_applications TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.recruitment_applications TO authenticated;
GRANT ALL ON public.recruitment_applications TO service_role;

ALTER TABLE public.recruitment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application"
  ON public.recruitment_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and dispatchers can read"
  ON public.recruitment_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dyspozytor'));

CREATE POLICY "Admins and dispatchers can update"
  ON public.recruitment_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dyspozytor'));

CREATE POLICY "Admins can delete"
  ON public.recruitment_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER recruitment_applications_set_updated_at
  BEFORE UPDATE ON public.recruitment_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
