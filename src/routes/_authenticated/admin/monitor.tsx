import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveDuties } from "@/lib/ops.functions";
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
    </div>
  );
}
