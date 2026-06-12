
-- Enums
DO $$ BEGIN
  CREATE TYPE public.vehicle_status AS ENUM ('available','assigned','out_of_service','reserve');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.duty_status AS ENUM ('unassigned','pending','assigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.duty_priority AS ENUM ('low','normal','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vehicles: add status
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS status public.vehicle_status NOT NULL DEFAULT 'available';
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);

-- Duties: extend
ALTER TABLE public.duties
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority public.duty_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS status public.duty_status NOT NULL DEFAULT 'unassigned';

CREATE INDEX IF NOT EXISTS idx_duties_date_start ON public.duties(duty_date, start_time);
CREATE INDEX IF NOT EXISTS idx_duties_assigned ON public.duties(assigned_to, duty_date);
CREATE INDEX IF NOT EXISTS idx_duties_vehicle ON public.duties(vehicle_id, duty_date);
CREATE INDEX IF NOT EXISTS idx_duties_status ON public.duties(status);

-- Auto-derive duty status
CREATE OR REPLACE FUNCTION public.compute_duty_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (NEW.vehicle_id IS NOT NULL OR NEW.vehicle_label IS NOT NULL) THEN
    NEW.status := 'assigned';
  ELSIF NEW.assigned_to IS NOT NULL OR NEW.vehicle_id IS NOT NULL OR NEW.vehicle_label IS NOT NULL THEN
    NEW.status := 'pending';
  ELSE
    NEW.status := 'unassigned';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_compute_duty_status ON public.duties;
CREATE TRIGGER trg_compute_duty_status
  BEFORE INSERT OR UPDATE OF assigned_to, vehicle_id, vehicle_label ON public.duties
  FOR EACH ROW EXECUTE FUNCTION public.compute_duty_status();

-- Backfill existing rows
UPDATE public.duties SET status = CASE
  WHEN assigned_to IS NOT NULL AND (vehicle_id IS NOT NULL OR vehicle_label IS NOT NULL) THEN 'assigned'::duty_status
  WHEN assigned_to IS NOT NULL OR vehicle_id IS NOT NULL OR vehicle_label IS NOT NULL THEN 'pending'::duty_status
  ELSE 'unassigned'::duty_status END;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  related_duty_id uuid REFERENCES public.duties(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own notifications" ON public.notifications;
CREATE POLICY "users select own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Trigger: notify on duty assignment change
CREATE OR REPLACE FUNCTION public.notify_duty_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, related_duty_id)
      VALUES (NEW.assigned_to, 'duty_assigned',
        'Przydzielono służbę ' || NEW.duty_number,
        'Data: ' || NEW.duty_date::text || ', ' || to_char(NEW.start_time,'HH24:MI') || '–' || to_char(NEW.end_time,'HH24:MI') || ' (linia ' || NEW.route || ')',
        NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF OLD.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, body, related_duty_id)
        VALUES (OLD.assigned_to, 'duty_unassigned',
          'Służba ' || NEW.duty_number || ' została przepisana',
          'Twoja służba w dniu ' || NEW.duty_date::text || ' została zmieniona.',
          NEW.id);
      END IF;
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, body, related_duty_id)
        VALUES (NEW.assigned_to, 'duty_assigned',
          'Przydzielono służbę ' || NEW.duty_number,
          'Data: ' || NEW.duty_date::text || ', ' || to_char(NEW.start_time,'HH24:MI') || '–' || to_char(NEW.end_time,'HH24:MI') || ' (linia ' || NEW.route || ')',
          NEW.id);
      END IF;
    ELSIF NEW.assigned_to IS NOT NULL AND (
      NEW.duty_date IS DISTINCT FROM OLD.duty_date OR
      NEW.start_time IS DISTINCT FROM OLD.start_time OR
      NEW.end_time IS DISTINCT FROM OLD.end_time OR
      NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id OR
      NEW.vehicle_label IS DISTINCT FROM OLD.vehicle_label
    ) THEN
      INSERT INTO public.notifications(user_id, type, title, body, related_duty_id)
      VALUES (NEW.assigned_to, 'duty_modified',
        'Zmieniono służbę ' || NEW.duty_number,
        'Sprawdź szczegóły w grafiku.', NEW.id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, related_duty_id)
      VALUES (OLD.assigned_to, 'duty_cancelled',
        'Anulowano służbę ' || OLD.duty_number,
        'Służba w dniu ' || OLD.duty_date::text || ' została usunięta.', NULL);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_notify_duty_assignment ON public.duties;
CREATE TRIGGER trg_notify_duty_assignment
  AFTER INSERT OR UPDATE OR DELETE ON public.duties
  FOR EACH ROW EXECUTE FUNCTION public.notify_duty_assignment();
