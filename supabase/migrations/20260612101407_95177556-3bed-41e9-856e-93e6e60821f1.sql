-- PIS / live telemetry columns on duties
ALTER TABLE public.duties
  ADD COLUMN IF NOT EXISTS pis_route text,
  ADD COLUMN IF NOT EXISTS pis_headsign text,
  ADD COLUMN IF NOT EXISTS pis_current_stop text,
  ADD COLUMN IF NOT EXISTS pis_next_stop text,
  ADD COLUMN IF NOT EXISTS pis_delay_sec integer,
  ADD COLUMN IF NOT EXISTS pis_updated_at timestamptz;

-- Incident source
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'portal';

-- driver_positions
CREATE TABLE IF NOT EXISTS public.driver_positions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  x double precision NOT NULL,
  y double precision NOT NULL,
  z double precision,
  heading real,
  speed_kmh real,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_positions TO authenticated;
GRANT ALL ON public.driver_positions TO service_role;
ALTER TABLE public.driver_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dp_sel_own ON public.driver_positions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY dp_ins_own ON public.driver_positions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY dp_upd_own ON public.driver_positions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- roblox_commands
CREATE TABLE IF NOT EXISTS public.roblox_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  acked_at timestamptz
);
CREATE INDEX IF NOT EXISTS roblox_commands_pending_idx
  ON public.roblox_commands(target_user_id) WHERE acked_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roblox_commands TO authenticated;
GRANT ALL ON public.roblox_commands TO service_role;
ALTER TABLE public.roblox_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_sel ON public.roblox_commands FOR SELECT TO authenticated
  USING (target_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY rc_ins ON public.roblox_commands FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY rc_upd ON public.roblox_commands FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))
  WITH CHECK (target_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY rc_del ON public.roblox_commands FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));