import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyStats } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/statystyki")({
  head: () => ({ meta: [{ title: "Moje statystyki — Portal STP" }] }),
  component: StatsPage,
});

function fmtHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function StatsPage() {
  const fn = useServerFn(getMyStats);
  const { data } = useQuery({ queryKey: ["my-stats"], queryFn: () => fn() });
  const stats = (data ?? { month: { count: 0, minutes: 0 }, year: { count: 0, minutes: 0 } }) as any;

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-bold">Moje statystyki</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card label="Bieżący miesiąc" count={stats.month.count} minutes={stats.month.minutes} />
        <Card label="Bieżący rok" count={stats.year.count} minutes={stats.year.minutes} />
      </div>
      <p className="text-xs text-muted-foreground">
        Statystyki uwzględniają wyłącznie zrealizowane służby do dnia dzisiejszego.
      </p>
    </div>
  );
}

function Card({ label, count, minutes }: { label: string; count: number; minutes: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className="mt-3 flex items-baseline gap-6">
        <div>
          <div className="text-3xl font-bold font-mono">{count}</div>
          <div className="text-xs text-muted-foreground">służb</div>
        </div>
        <div>
          <div className="text-3xl font-bold font-mono">{fmtHours(minutes)}</div>
          <div className="text-xs text-muted-foreground">przepracowane</div>
        </div>
      </div>
    </div>
  );
}
