import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AuthProfile } from "@/hooks/use-auth";

const WEEKDAYS = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const MONTHS = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

function todayLabel() {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function AppHeader({
  profile,
  title,
}: {
  profile: AuthProfile | null;
  title?: string;
}) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 pt-safe px-3 md:px-6 pt-3 md:pt-4">
      <div className="glass-strong grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl px-3 md:px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <SidebarTrigger className="hidden md:inline-flex text-muted-foreground rounded-full hover:bg-glass-strong" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl md:text-2xl leading-none">
              {title ?? "Pulpit"}
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-mono truncate">
              {todayLabel()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <ThemeToggle />
          <NotificationBell />
          <div className="text-right hidden lg:block px-2">
            <p className="text-sm font-semibold leading-none truncate max-w-[160px]">
              {profile?.full_name ?? "—"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              ID: {profile?.employee_id ?? "—"}
            </p>
          </div>
          <div
            className="size-9 shrink-0 rounded-full grid place-items-center text-xs font-bold text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), color-mix(in oklab, var(--color-primary) 60%, var(--color-brand-accent)))",
            }}
          >
            {initials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Wyloguj"
            className="rounded-full hover:bg-glass-strong"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
