import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-8 gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <div>
          <h1 className="text-lg md:text-xl font-bold leading-none">{title ?? "Pulpit"}</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{todayLabel()}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold leading-none">{profile?.full_name ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-1">
            ID: {profile?.employee_id ?? "—"}
          </p>
        </div>
        <div className="size-9 rounded-full bg-secondary text-secondary-foreground grid place-items-center text-xs font-bold">
          {initials}
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Wyloguj">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
