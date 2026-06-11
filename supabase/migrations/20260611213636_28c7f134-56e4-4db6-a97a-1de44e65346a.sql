
CREATE TYPE public.availability_type AS ENUM ('unavailable', 'preferred');
CREATE TYPE public.vacation_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  type public.availability_type NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_availability TO authenticated;
GRANT ALL ON public.driver_availability TO service_role;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own availability"
  ON public.driver_availability FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all availability"
  ON public.driver_availability FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_driver_availability_updated_at
  BEFORE UPDATE ON public.driver_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status public.vacation_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacation_requests TO authenticated;
GRANT ALL ON public.vacation_requests TO service_role;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own requests"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers create own requests"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Drivers delete own pending requests"
  ON public.vacation_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update requests"
  ON public.vacation_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_vacation_requests_updated_at
  BEFORE UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validate that end_date >= start_date via trigger (CHECK ok here but trigger is consistent)
CREATE OR REPLACE FUNCTION public.validate_vacation_range()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be >= start_date';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_vacation_requests_range
  BEFORE INSERT OR UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_vacation_range();
