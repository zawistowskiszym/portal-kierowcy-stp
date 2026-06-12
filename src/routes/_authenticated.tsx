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
    // Cheap local check first — no network, no transient failures.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth" });

    // Validate session with the Auth server, but tolerate transient errors
    // (e.g. "context canceled" / 500s) so we don't bounce the user to /auth
    // on a flaky network round-trip. Retry once before giving up.
    let user = null as Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        user = data.user;
        break;
      }
      // Only a definitive "no user" (no error) means logged out.
      if (!error) {
        throw redirect({ to: "/auth" });
      }
      // Transient error — wait briefly and retry once.
      await new Promise((r) => setTimeout(r, 150));
    }
    // If we still have no user but a valid local session exists, trust the
    // session for this navigation rather than redirecting on a flaky API.
    return { user: user ?? sessionData.session.user };
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
