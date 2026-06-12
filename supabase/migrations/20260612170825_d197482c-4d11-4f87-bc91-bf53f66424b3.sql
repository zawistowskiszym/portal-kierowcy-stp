ALTER TABLE public.recruitment_applications
  ADD COLUMN IF NOT EXISTS intro_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS intro_sent_at timestamptz;
