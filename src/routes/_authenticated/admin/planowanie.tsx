import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Route2, ClipboardList, Truck, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planowanie")({
  head: () => ({ meta: [{ title: "Planowanie sieci — STP" }] }),
  component: PlanningLayout,
});

const tabs = [
  { to: "/admin/planowanie", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/planowanie/linie", label: "Linie", icon: Route2 },
  { to: "/admin/planowanie/rozklady", label: "Rozkłady", icon: ClipboardList },
  { to: "/admin/planowanie/brygady", label: "Brygady i duty", icon: Truck },
];

function PlanningLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Planowanie sieci</h1>
        <p className="text-sm text-muted-foreground">Linie, rozkłady, brygady i służby.</p>
      </div>
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")
              }
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
