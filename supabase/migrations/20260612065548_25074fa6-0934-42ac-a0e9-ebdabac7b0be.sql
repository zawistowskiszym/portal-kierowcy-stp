DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM (
    'wypoczynkowy',
    'na_zadanie',
    'okolicznosciowy',
    'bezplatny',
    'chorobowy',
    'opieka',
    'macierzynski',
    'ojcowski',
    'szkoleniowy',
    'inny'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vacation_requests
  ADD COLUMN IF NOT EXISTS leave_type public.leave_type NOT NULL DEFAULT 'wypoczynkowy';