
DO $$ BEGIN CREATE TYPE public.planning_day_type AS ENUM ('weekday','saturday','sunday'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.line_direction AS ENUM ('AB','BA'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stops TO authenticated;
GRANT ALL ON public.stops TO service_role;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops_read" ON public.stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "stops_write" ON public.stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE TRIGGER stops_updated BEFORE UPDATE ON public.stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_number text NOT NULL UNIQUE,
  terminus_a text NOT NULL,
  terminus_b text NOT NULL,
  custom_return boolean NOT NULL DEFAULT false,
  depot text NOT NULL DEFAULT 'Zajezdnia Główna',
  interlining_enabled boolean NOT NULL DEFAULT false,
  min_interline_layover_min integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lines TO authenticated;
GRANT ALL ON public.lines TO service_role;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lines_read" ON public.lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "lines_write" ON public.lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE TRIGGER lines_updated BEFORE UPDATE ON public.lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.line_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  direction public.line_direction NOT NULL,
  position integer NOT NULL,
  stop_id uuid NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
  travel_time_to_next_min integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_id, direction, position)
);
CREATE INDEX line_stops_line_dir_idx ON public.line_stops(line_id, direction, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_stops TO authenticated;
GRANT ALL ON public.line_stops TO service_role;
ALTER TABLE public.line_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_read" ON public.line_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "ls_write" ON public.line_stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));

CREATE TABLE public.line_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  day_type public.planning_day_type NOT NULL,
  first_departure time NOT NULL DEFAULT '05:00',
  last_departure time NOT NULL DEFAULT '23:00',
  layover_a_min integer NOT NULL DEFAULT 5,
  layover_b_min integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_id, day_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_timetables TO authenticated;
GRANT ALL ON public.line_timetables TO service_role;
ALTER TABLE public.line_timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tt_read" ON public.line_timetables FOR SELECT TO authenticated USING (true);
CREATE POLICY "tt_write" ON public.line_timetables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE TRIGGER tt_updated BEFORE UPDATE ON public.line_timetables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.line_frequency_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id uuid NOT NULL REFERENCES public.line_timetables(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  headway_min integer NOT NULL CHECK (headway_min > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX freq_tt_idx ON public.line_frequency_windows(timetable_id, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_frequency_windows TO authenticated;
GRANT ALL ON public.line_frequency_windows TO service_role;
ALTER TABLE public.line_frequency_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "freq_read" ON public.line_frequency_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY "freq_write" ON public.line_frequency_windows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));

CREATE TABLE public.line_interline_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_a_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  line_b_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_a_id, line_b_id),
  CHECK (line_a_id <> line_b_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_interline_pairs TO authenticated;
GRANT ALL ON public.line_interline_pairs TO service_role;
ALTER TABLE public.line_interline_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ilp_read" ON public.line_interline_pairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ilp_write" ON public.line_interline_pairs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));

CREATE TABLE public.vehicle_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_ids uuid[] NOT NULL,
  line_numbers text[] NOT NULL,
  block_number integer NOT NULL,
  day_type public.planning_day_type NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  depot text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vb_day_idx ON public.vehicle_blocks(day_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_blocks TO authenticated;
GRANT ALL ON public.vehicle_blocks TO service_role;
ALTER TABLE public.vehicle_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vb_read" ON public.vehicle_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "vb_write" ON public.vehicle_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE TRIGGER vb_updated BEFORE UPDATE ON public.vehicle_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicle_block_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.vehicle_blocks(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  line_number text NOT NULL,
  direction public.line_direction NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  trip_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vbt_block_idx ON public.vehicle_block_trips(block_id, trip_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_block_trips TO authenticated;
GRANT ALL ON public.vehicle_block_trips TO service_role;
ALTER TABLE public.vehicle_block_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vbt_read" ON public.vehicle_block_trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "vbt_write" ON public.vehicle_block_trips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
