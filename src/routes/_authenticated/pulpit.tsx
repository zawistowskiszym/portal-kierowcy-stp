import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyNextDuty, getMyUpcomingDuties, listAnnouncements } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/pulpit")({
  head: () => ({ meta: [{ title: "Pulpit — Portal STP" }] }),
  component: PulpitPage,
});

const PL_DAYS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const PL_MONTHS_SHORT = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

function fmtDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${PL_DAYS[d.getDay()]}, ${d.getDate()} ${PL_MONTHS_SHORT[d.getMonth()]}`;
}
function fmtTime(t?: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}

function PulpitPage() {
  const nextDutyFn = useServerFn(getMyNextDuty);
  const upcomingFn = useServerFn(getMyUpcomingDuties);
  const annFn = useServerFn(listAnnouncements);

  const next = useQuery({ queryKey: ["pulpit", "next"], queryFn: () => nextDutyFn() });
  const upcoming = useQuery({ queryKey: ["pulpit", "upcoming"], queryFn: () => upcomingFn() });
  const ann = useQuery({ queryKey: ["pulpit", "ann"], queryFn: () => annFn() });

  const nd = next.data as any;
  const upc = (upcoming.data ?? []) as any[];
  const annList = ((ann.data ?? []) as any[]).filter((a) => !a.archived).slice(0, 3);

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 lg:col-span-8 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-brand-accent px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold uppercase tracking-wide text-xs text-brand-accent-foreground">
            Najbliższa służba
          </h2>
          <span className="bg-brand/10 text-brand px-2 py-0.5 rounded text-[10px] font-bold">
            {nd ? fmtDateShort(nd.duty_date).toUpperCase() : "BRAK"}
          </span>
        </div>
        {nd ? (
          <>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Linia / Służba</p>
                <p className="text-3xl font-bold">
                  {nd.route} <span className="text-muted-foreground/50 font-normal font-mono text-2xl">/ {nd.duty_number}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">{nd.depot}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Pojazd</p>
                <p className="text-xl font-bold font-mono">{nd.vehicle_label ?? "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">Zajezdnia {nd.depot}</p>
              </div>
            </div>
            {nd.notes && (
              <div className="px-6 py-4 bg-muted/40 border-t border-border text-sm">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Uwagi:</span>{" "}
                {nd.notes}
              </div>
            )}
          </>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Brak zaplanowanych służb.
          </div>
        )}
      </section>

      <aside className="col-span-12 lg:col-span-4 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ogłoszenia</h3>
        {annList.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
            Brak ogłoszeń.
          </div>
        )}
        {annList.map((a, i) => (
          <article
            key={a.id}
            className={
              "bg-card p-4 rounded-xl shadow-sm border border-border " +
              (i === 0 ? "border-l-4 border-l-brand-accent" : "")
            }
          >
            <p className="text-xs text-muted-foreground mb-1 font-mono">
              {new Date(a.published_at).toLocaleDateString("pl-PL")}
            </p>
            <h4 className="font-bold text-sm mb-1">{a.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{a.body}</p>
          </article>
        ))}
      </aside>

      <section className="col-span-12 mt-2">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Nadchodzące służby
        </h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Nr służby</th>
                <th className="px-6 py-3">Linia</th>
                <th className="px-6 py-3">Pojazd</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upc.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Brak nadchodzących służb.</td></tr>
              )}
              {upc.map((d) => (
                <tr key={d.id}>
                  <td className="px-6 py-3 font-medium">{fmtDateShort(d.duty_date)}</td>
                  <td className="px-6 py-3 font-mono text-xs">{d.duty_number}</td>
                  <td className="px-6 py-3">{d.route}</td>
                  <td className="px-6 py-3 font-mono text-xs">{d.vehicle_label ?? "—"}</td>
                  <td className="px-6 py-3"><Badge variant="secondary">Potwierdzona</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
