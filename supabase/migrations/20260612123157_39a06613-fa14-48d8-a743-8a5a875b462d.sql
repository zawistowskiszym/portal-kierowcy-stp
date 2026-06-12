
-- Restrict profile reads: drop blanket policy, allow self + staff
DROP POLICY IF EXISTS "Authenticated read basic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;

CREATE POLICY "Profiles: self or staff can read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'dyspozytor')
  );
