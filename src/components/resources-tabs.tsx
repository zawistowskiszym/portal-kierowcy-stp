import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Bus } from "lucide-react";

const tabs = [
  { to: "/admin/kierowcy", label: "Kierowcy", icon: Users },
  { to: "/admin/pojazdy", label: "Tabor", icon: Bus },
];

export function ResourcesTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
              (active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40")
            }
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
