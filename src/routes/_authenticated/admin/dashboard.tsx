import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDispatcherDashboard } from "@/lib/ops.functions";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Bus, Users, ClipboardList, Activity, Coffee, Wrench, FileWarning,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Pulpit dyspozytora — STP" }] }),
  component: DashboardPage,
});

const priorityVariant = (p: string) =>
  p === "critical" ? "destructive" : p === "high" ? "default" : "secondary";

const priorityLabel = (p: string) =>
  ({ critical: "Krytyczny", high: "Wysoki", medium: "Normalny", low: "Informacja" } as any)[p] ?? p;

function DashboardPage() {
  const fn = useServerFn(getDispatcherDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dispatcher", "dashboard"],
    queryFn: () => fn(),
    refetchInterval: 15000,
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Wczytywanie pulpitu…</div>;
  const d = data as any;
  const s = d.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Pulpit dyspozytora</h1>
        <p className="text-xs text-muted-foreground">Aktualizacja co 15s</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Activity} label="Aktywne służby" value={s.activeDuties} accent="text-emerald-600" />
        <Stat icon={Users} label="Aktywni kierowcy" value={s.activeDrivers} />
        <Stat icon={Bus} label="Aktywne pojazdy" value={s.activeVehicles} />
        <Stat icon={AlertTriangle} label="Otwarte incydenty" value={s.openIncidents} accent={s.openIncidents > 0 ? "text-destructive" : ""} />
        <Stat icon={ClipboardList} label="Otwarte raporty" value={s.openReports} />
        <Stat icon={Wrench} label="Awarie pojazdów" value={s.vehicleFailures} accent={s.vehicleFailures > 0 ? "text-destructive" : ""} />
        <Stat icon={FileWarning} label="Nieprzydzielone" value={s.unassignedDuties} accent={s.unassignedDuties > 0 ? "text-amber-600" : ""} />
        <Stat icon={Coffee} label="Na przerwie" value={s.onBreak} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Krytyczne i otwarte incydenty" link="/admin/incydenty">
          {d.incidents.length === 0 && <Empty>Brak otwartych incydentów.</Empty>}
          <ul className="divide-y divide-border">
            {d.incidents.slice(0, 8).map((i: any) => (
              <li key={i.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <Badge variant={priorityVariant(i.priority)}>{priorityLabel(i.priority)}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{i.incident_code}</span>
                <span className="flex-1 truncate">{i.type} · {i.route ?? "—"} · {i.vehicle_label ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Nowe raporty" link="/admin/raporty">
          {d.reports.length === 0 && <Empty>Brak nowych raportów.</Empty>}
          <ul className="divide-y divide-border">
            {d.reports.slice(0, 8).map((r: any) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{r.report_code}</span>
                <span className="flex-1 truncate">{r.category}</span>
                <Badge variant="secondary">{r.status}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Ostatnia aktywność dyspozytorska" link="/admin/dziennik">
        {d.recentLog.length === 0 && <Empty>Brak wpisów.</Empty>}
        <ul className="divide-y divide-border text-sm">
          {d.recentLog.map((l: any) => (
            <li key={l.id} className="px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono w-24">{new Date(l.created_at).toLocaleTimeString("pl-PL")}</span>
              <span className="font-medium">{l.actor?.full_name ?? "—"}</span>
              <span className="flex-1 text-muted-foreground">{l.action}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
        <Icon className={"size-4 " + (accent ?? "text-muted-foreground")} />
      </div>
      <div className={"text-3xl font-bold font-mono mt-2 " + (accent ?? "")}>{value}</div>
    </div>
  );
}

function Section({ title, link, children }: any) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
        {link && <Link to={link} className="text-xs text-primary hover:underline">Pokaż wszystkie</Link>}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: any) {
  return <div className="px-4 py-6 text-sm text-muted-foreground text-center">{children}</div>;
}
