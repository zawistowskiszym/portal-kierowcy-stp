CREATE TABLE IF NOT EXISTS public.driver_live (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  live_status TEXT,
  live_status_note TEXT,
  live_status_updated_at TIMESTAMPTZ,
  duty_number TEXT,
  pis_route TEXT,
  pis_headsign TEXT,
  pis_current_stop TEXT,
  pis_next_stop TEXT,
  pis_delay_sec INTEGER,
  pis_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_live TO authenticated;
GRANT ALL ON public.driver_live TO service_role;

ALTER TABLE public.driver_live ENABLE ROW LEVEL SECURITY;

CREATE POLICY dl_sel ON public.driver_live FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dyspozytor'));
CREATE POLICY dl_ins_own ON public.driver_live FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY dl_upd_own ON public.driver_live FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER driver_live_set_updated_at
  BEFORE UPDATE ON public.driver_live
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();