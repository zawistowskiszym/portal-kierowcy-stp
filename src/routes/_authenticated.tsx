import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { useAuth } from "@/hooks/use-auth";
import { PopupAnnouncements, PopupAnnouncementsBanner } from "@/components/popup-announcements";

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
  const { profile, isAdmin, isDispatcher, loading } = useAuth();
  return (
    <SidebarProvider>
      <div className="aurora-canvas min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar isAdmin={isAdmin} isDispatcher={isDispatcher} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader profile={profile} />
          {!loading && <PopupAnnouncementsBanner />}
          <main className="flex-1 px-3 md:px-6 pt-4 pb-28 md:pb-10 space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Ładowanie…</div>
            ) : (
              <Outlet />
            )}
          </main>
          <BottomTabBar isAdmin={isAdmin} isDispatcher={isDispatcher} />
        </div>
        {!loading && <PopupAnnouncements />}
      </div>
    </SidebarProvider>
  );
}
