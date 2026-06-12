import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDriverOps } from "@/lib/ops.functions";
import { Badge } from "@/components/ui/badge";
import { ResourcesTabs } from "@/components/resources-tabs";

export const Route = createFileRoute("/_authenticated/admin/kierowcy")({
  ssr: false,
  head: () => ({ meta: [{ title: "Kierowcy — STP" }] }),
  component: DriversPage,
});

const PRES: Record<string, { label: string; variant: any }> = {
  active: { label: "Aktywny", variant: "default" },
  break: { label: "Przerwa", variant: "secondary" },
  unavailable: { label: "Niedostępny", variant: "destructive" },
  offline: { label: "Offline", variant: "outline" },
};

function fmtH(min: number) {
  return `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, "0")}m`;
}

function DriversPage() {
  const fn = useServerFn(getDriverOps);
  const { data } = useQuery({ queryKey: ["driver-ops"], queryFn: () => fn(), refetchInterval: 20000 });
  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kierowcy i tabor</h1>
        <ResourcesTabs />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Kierowca</th>
              <th className="px-4 py-3 text-left">Nr</th>
              <th className="px-4 py-3 text-left">Zajezdnia</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Bieżąca służba</th>
              <th className="px-4 py-3 text-right">Godziny (tydzień)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Brak kierowców.</td></tr>}
            {rows.map((d) => {
              const p = PRES[d.presence?.status ?? "offline"] ?? PRES.offline;
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 font-medium">{d.full_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.employee_id ?? "—"}</td>
                  <td className="px-4 py-2">{d.depot ?? "—"}</td>
                  <td className="px-4 py-2"><Badge variant={p.variant}>{p.label}</Badge></td>
                  <td className="px-4 py-2 text-xs">
                    {d.current_duty
                      ? <span>{d.current_duty.duty_number} · {d.current_duty.route} · {d.current_duty.start_time?.slice(0, 5)}–{d.current_duty.end_time?.slice(0, 5)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-right">{fmtH(d.week_minutes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
