
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO anon, authenticated;
