import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveDuties, listAllDriverLive } from "@/lib/ops.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/monitor")({
  ssr: false,
  head: () => ({ meta: [{ title: "Monitor służb — STP" }] }),
  component: MonitorPage,
});

const LIVE: Record<string, { label: string; variant: any }> = {
  on_route: { label: "W trasie", variant: "default" },
  on_break: { label: "Przerwa", variant: "secondary" },
  delayed: { label: "Opóźnienie", variant: "destructive" },
  vehicle_failure: { label: "Awaria", variant: "destructive" },
  emergency: { label: "Alarm", variant: "destructive" },
  completed: { label: "Zakończona", variant: "secondary" },
};

function MonitorPage() {
  const fn = useServerFn(getActiveDuties);
  const { data } = useQuery({ queryKey: ["monitor"], queryFn: () => fn(), refetchInterval: 10000 });
  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Monitor aktywnych służb</h1>
        <p className="text-xs text-muted-foreground">Aktualizacja co 10s · {rows.length} dziś</p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Służba</th>
              <th className="px-4 py-3 text-left">Linia</th>
              <th className="px-4 py-3 text-left">Godziny</th>
              <th className="px-4 py-3 text-left">Kierowca</th>
              <th className="px-4 py-3 text-left">Pojazd</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Aktualizacja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Brak służb na dziś.</td></tr>}
            {rows.map((d) => {
              const ls = d.live_status ? LIVE[d.live_status] : null;
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 font-mono text-xs">{d.duty_number}</td>
                  <td className="px-4 py-2 font-medium">{d.route}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.start_time?.slice(0, 5)}–{d.end_time?.slice(0, 5)}</td>
                  <td className="px-4 py-2">{d.driver?.full_name ?? <span className="text-muted-foreground">nieprzydzielona</span>}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.vehicle_label ?? d.vehicle?.vehicle_number ?? "—"}</td>
                  <td className="px-4 py-2">{ls ? <Badge variant={ls.variant}>{ls.label}</Badge> : <span className="text-xs text-muted-foreground">brak</span>}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{d.live_status_updated_at ? new Date(d.live_status_updated_at).toLocaleTimeString("pl-PL") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LivePisSection />
    </div>
  );
}

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}

function LivePisSection() {
  const fn = useServerFn(listAllDriverLive);
  const { data } = useQuery({
    queryKey: ["monitor", "live-pis"],
    queryFn: () => fn(),
    refetchInterval: 10000,
  });
  const rows = ((data ?? []) as any[]).filter(r => r.live?.pis_route || r.duty);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Dane na żywo z gry (PIS)</h2>
        <p className="text-xs text-muted-foreground">{rows.length} aktywnych · co 10s</p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Kierowca</th>
              <th className="px-4 py-3 text-left">Linia</th>
              <th className="px-4 py-3 text-left">Kierunek</th>
              <th className="px-4 py-3 text-left">Obecny</th>
              <th className="px-4 py-3 text-left">Następny</th>
              <th className="px-4 py-3 text-left">Postęp</th>
              <th className="px-4 py-3 text-left">Opóźn.</th>
              <th className="px-4 py-3 text-left">Sygnał</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Brak transmisji z gry.</td></tr>
            )}
            {rows.map((r) => {
              const live = r.live ?? {};
              const idx = live.pis_stop_index;
              const total = live.pis_total_stops;
              const pct = typeof idx === "number" && typeof total === "number" && total > 0
                ? Math.round((idx / total) * 100) : null;
              const delay = live.pis_delay_sec;
              return (
                <tr key={r.user_id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.driver?.full_name ?? "—"}</div>
                    {r.driver?.employee_id && (
                      <div className="text-[10px] text-muted-foreground font-mono">#{r.driver.employee_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-bold font-mono">{live.pis_route ?? r.duty?.route ?? "—"}</td>
                  <td className="px-4 py-2">{live.pis_headsign ?? "—"}</td>
                  <td className="px-4 py-2">{live.pis_current_stop ?? "—"}</td>
                  <td className="px-4 py-2">{live.pis_next_stop ?? "—"}</td>
                  <td className="px-4 py-2 min-w-32">
                    {pct !== null ? (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-muted-foreground">{idx}/{total} · {pct}%</div>
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {typeof delay === "number" ? (
                      <Badge variant="secondary" className={
                        delay > 180 ? "bg-destructive/15 text-destructive"
                          : delay > 60 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      }>
                        {delay > 0 ? "+" : ""}{Math.round(delay / 60)} min
                      </Badge>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{fmtAgo(live.pis_updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
