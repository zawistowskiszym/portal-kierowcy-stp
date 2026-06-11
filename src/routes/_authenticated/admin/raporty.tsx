import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminReports } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin/raporty")({
  head: () => ({ meta: [{ title: "Raporty — Admin STP" }] }),
  component: ReportsPage,
});

function fmtHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function ReportsPage() {
  const fn = useServerFn(getAdminReports);
  const { data } = useQuery({ queryKey: ["admin", "reports"], queryFn: () => fn() });
  const r = (data ?? null) as any;

  if (!r) {
    return <div className="text-sm text-muted-foreground">Wczytywanie raportów…</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Raporty administracyjne</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Służby (m-c)" value={r.duties.total} sub={`${r.duties.unassigned} bez przydziału`} />
        <StatTile label="Aktywni kierowcy" value={r.drivers.active} sub={`/ ${r.drivers.total} łącznie`} />
        <StatTile label="Wnioski urlopowe" value={r.vacations.pending} sub={`${r.vacations.upcoming} zatw. nadchodzących`} />
        <StatTile label="Pojazdy aktywne" value={r.vehicles.active} sub={`/ ${r.vehicles.total} łącznie`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-xl shadow-sm">
          <header className="px-6 py-4 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Służby wg zajezdni — bieżący miesiąc
          </header>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {r.duties.byDepot.length === 0 && (
                <tr><td className="px-6 py-4 text-muted-foreground" colSpan={2}>Brak danych.</td></tr>
              )}
              {r.duties.byDepot.map((d: any) => (
                <tr key={d.depot}>
                  <td className="px-6 py-2 font-medium">{d.depot}</td>
                  <td className="px-6 py-2 text-right font-mono">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-card border border-border rounded-xl shadow-sm">
          <header className="px-6 py-4 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Top 10 kierowców — godziny
          </header>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {r.duties.topDrivers.length === 0 && (
                <tr><td className="px-6 py-4 text-muted-foreground" colSpan={3}>Brak danych.</td></tr>
              )}
              {r.duties.topDrivers.map((d: any) => (
                <tr key={d.name}>
                  <td className="px-6 py-2 font-medium">{d.name}</td>
                  <td className="px-6 py-2 text-right text-muted-foreground">{d.count} sł.</td>
                  <td className="px-6 py-2 text-right font-mono">{fmtHours(d.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className="text-3xl font-bold font-mono mt-2">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
