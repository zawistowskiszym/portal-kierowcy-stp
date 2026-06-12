ALTER TABLE public.driver_live
  ADD COLUMN IF NOT EXISTS pis_stop_index integer,
  ADD COLUMN IF NOT EXISTS pis_total_stops integer;