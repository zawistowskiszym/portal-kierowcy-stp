CREATE TYPE public.fuel_type AS ENUM ('Diesel','Elektryczny','Hybrydowy','Wodorowy');

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text NOT NULL UNIQUE,
  model text NOT NULL,
  fuel fuel_type NOT NULL,
  depot text NOT NULL,
  production_year int,
  capacity int,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage vehicles" ON public.vehicles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX vehicles_depot_idx ON public.vehicles(depot);
CREATE INDEX vehicles_fuel_idx ON public.vehicles(fuel);