
CREATE TYPE public.report_category AS ENUM ('operational','complaint','infrastructure','vehicle','schedule','info');
CREATE TYPE public.report_status   AS ENUM ('new','in_review','action_taken','closed');
CREATE TYPE public.incident_type   AS ENUM ('collision','breakdown','blockage','major_delay','passenger_emergency','security','infrastructure','other');
CREATE TYPE public.incident_priority AS ENUM ('critical','high','medium','low');
CREATE TYPE public.incident_status AS ENUM ('reported','in_progress','resolved','closed');
CREATE TYPE public.driver_presence_status AS ENUM ('active','break','offline','unavailable');
CREATE TYPE public.message_kind AS ENUM ('announcement','urgent','service_change','diversion');
CREATE TYPE public.message_audience_kind AS ENUM ('all_drivers','drivers','routes','vehicles','divisions');

ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'in_service';
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'under_repair';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'on_route';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'on_break';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'delayed';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'vehicle_failure';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE public.duty_status ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE public.duties
  ADD COLUMN IF NOT EXISTS live_status public.duty_status,
  ADD COLUMN IF NOT EXISTS live_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS live_status_note text;

-- DRIVER REPORTS
CREATE TABLE public.driver_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code text UNIQUE,
  driver_id uuid NOT NULL,
  duty_id uuid REFERENCES public.duties(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_label text, route text, duty_number text,
  category public.report_category NOT NULL,
  description text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.report_status NOT NULL DEFAULT 'new',
  assigned_dispatcher_id uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_reports TO authenticated;
GRANT ALL ON public.driver_reports TO service_role;
ALTER TABLE public.driver_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY dr_sel ON public.driver_reports FOR SELECT TO authenticated USING (driver_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY dr_ins ON public.driver_reports FOR INSERT TO authenticated WITH CHECK (driver_id=auth.uid());
CREATE POLICY dr_upd ON public.driver_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY dr_del ON public.driver_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_dr_upd BEFORE UPDATE ON public.driver_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gen_report_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.report_code IS NULL THEN NEW.report_code := 'RPT-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*100000))::text,5,'0'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dr_code BEFORE INSERT ON public.driver_reports FOR EACH ROW EXECUTE FUNCTION public.gen_report_code();

-- REPORT COMMENTS
CREATE TABLE public.report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.driver_reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.report_comments TO authenticated;
GRANT ALL ON public.report_comments TO service_role;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_sel ON public.report_comments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.driver_reports r WHERE r.id=report_id AND (r.driver_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))));
CREATE POLICY rc_ins ON public.report_comments FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')));
CREATE POLICY rc_del ON public.report_comments FOR DELETE TO authenticated USING (author_id=auth.uid());

-- INCIDENTS
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code text UNIQUE,
  reporter_id uuid NOT NULL,
  duty_id uuid REFERENCES public.duties(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_label text, route text, duty_number text,
  type public.incident_type NOT NULL,
  priority public.incident_priority NOT NULL DEFAULT 'medium',
  status public.incident_status NOT NULL DEFAULT 'reported',
  location text,
  description text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalated boolean NOT NULL DEFAULT false,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY inc_sel ON public.incidents FOR SELECT TO authenticated USING (reporter_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY inc_ins ON public.incidents FOR INSERT TO authenticated WITH CHECK (reporter_id=auth.uid());
CREATE POLICY inc_upd ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY inc_del ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_inc_upd BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gen_incident_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.incident_code IS NULL THEN NEW.incident_code := 'INC-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*100000))::text,5,'0'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inc_code BEFORE INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.gen_incident_code();

CREATE TABLE public.incident_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.incident_notes TO authenticated;
GRANT ALL ON public.incident_notes TO service_role;
ALTER TABLE public.incident_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY in_sel ON public.incident_notes FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.incidents i WHERE i.id=incident_id AND (i.reporter_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'))));
CREATE POLICY in_ins ON public.incident_notes FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')));

-- DISPATCHER LOG
CREATE TABLE public.dispatcher_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_kind text, target_id uuid, target_label text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dispatcher_log TO authenticated;
GRANT ALL ON public.dispatcher_log TO service_role;
ALTER TABLE public.dispatcher_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY dl_sel ON public.dispatcher_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY dl_ins ON public.dispatcher_log FOR INSERT TO authenticated WITH CHECK (actor_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')));

-- INTERNAL MESSAGES (table+recipient table, then policies)
CREATE TABLE public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  kind public.message_kind NOT NULL DEFAULT 'announcement',
  subject text NOT NULL,
  body text NOT NULL,
  audience_kind public.message_audience_kind NOT NULL,
  audience jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.internal_messages TO authenticated;
GRANT ALL ON public.internal_messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.message_recipients TO authenticated;
GRANT ALL ON public.message_recipients TO service_role;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY im_sel ON public.internal_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor') OR EXISTS(SELECT 1 FROM public.message_recipients mr WHERE mr.message_id=internal_messages.id AND mr.user_id=auth.uid()));
CREATE POLICY im_ins ON public.internal_messages FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor')));
CREATE POLICY im_del ON public.internal_messages FOR DELETE TO authenticated USING (author_id=auth.uid());
CREATE POLICY mr_sel ON public.message_recipients FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY mr_ins ON public.message_recipients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY mr_upd ON public.message_recipients FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- DRIVER PRESENCE
CREATE TABLE public.driver_presence (
  user_id uuid PRIMARY KEY,
  status public.driver_presence_status NOT NULL DEFAULT 'offline',
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_presence TO authenticated;
GRANT ALL ON public.driver_presence TO service_role;
ALTER TABLE public.driver_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY dp_sel ON public.driver_presence FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY dp_ins ON public.driver_presence FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY dp_upd ON public.driver_presence FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- VEHICLE MAINTENANCE
CREATE TABLE public.vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  performed_at date NOT NULL DEFAULT current_date,
  kind text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY vm_sel ON public.vehicle_maintenance FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor') OR public.has_role(auth.uid(),'driver'));
CREATE POLICY vm_ins ON public.vehicle_maintenance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
CREATE POLICY vm_del ON public.vehicle_maintenance FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dyspozytor'));
