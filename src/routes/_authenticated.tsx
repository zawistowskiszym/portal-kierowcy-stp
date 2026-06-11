import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { profile, isAdmin, loading } = useAuth();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-brand-surface">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 md:p-8">
            {loading ? (
              <div className="text-sm text-muted-foreground">Ładowanie…</div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
