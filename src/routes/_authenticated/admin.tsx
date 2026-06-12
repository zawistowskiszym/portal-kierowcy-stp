import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isStaff = (roleRows ?? []).some((r: any) => r.role === "admin" || r.role === "dyspozytor");
    if (!isStaff) throw redirect({ to: "/pulpit" });
  },
  component: () => <Outlet />,
});
