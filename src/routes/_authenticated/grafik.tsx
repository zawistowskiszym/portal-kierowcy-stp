import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getMyDutiesInRange } from "@/lib/portal.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, CalendarDays, FileText, AlertTriangle, Bus, Hash, Clock, StickyNote, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grafik")({
  head: () => ({ meta: [{ title: "Mój grafik — Portal STP" }] }),
  component: GrafikPage,
});

const PL_DOW = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const PL_MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function GrafikPage() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  }), [today]);

  const from = isoDate(days[0]);
  const to = isoDate(days[6]);

  const fn = useServerFn(getMyDutiesInRange);
  const { data } = useQuery({
    queryKey: ["grafik-7d", from, to],
    queryFn: () => fn({ data: { from, to } }),
  });
  const duties = (data ?? []) as any[];
  const byDate = new Map<string, any[]>();
  for (const d of duties) {
    const arr = byDate.get(d.duty_date) ?? [];
    arr.push(d);
    byDate.set(d.duty_date, arr);
  }

  const [selectedIso, setSelectedIso] = useState<string>(isoDate(today));
  const selectedDuties = byDate.get(selectedIso) ?? [];


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Mój grafik</h2>
        <p className="text-sm text-muted-foreground">Najbliższe 7 dni — wybierz dzień, aby zobaczyć szczegóły służby.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const iso = isoDate(d);
          const items = byDate.get(iso) ?? [];
          const isSelected = iso === selectedIso;
          const isToday = iso === isoDate(today);
          return (
            <button
              key={iso}
              onClick={() => setSelectedIso(iso)}
              className={[
                "p-3 rounded-xl border text-left transition-all",
                isSelected
                  ? "bg-brand text-brand-foreground border-brand shadow-md scale-[1.02]"
                  : "bg-card border-border hover:border-brand/40 hover:shadow-sm",
              ].join(" ")}
            >
              <div className={`text-[10px] font-bold uppercase ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                {PL_DOW[d.getDay()]} {isToday && !isSelected && <span className="text-brand-accent">• dziś</span>}
              </div>
              <div className="text-2xl font-bold font-mono leading-tight mt-1">
                {d.getDate()}
              </div>
              <div className={`text-[10px] font-mono ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                {PL_MONTHS_SHORT[d.getMonth()]}
              </div>
              <div className="mt-2">
                {items.length > 0 ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-brand-foreground/20" : "bg-brand/10 text-brand"
                  }`}>
                    {items.length === 1 ? items[0].route : `${items.length} służb`}
                  </span>
                ) : (
                  <span className={`text-[10px] ${isSelected ? "opacity-70" : "text-muted-foreground"}`}>wolne</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {selectedDuties.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground shadow-sm">
            Brak przypisanej służby w wybranym dniu.
          </div>
        ) : selectedDuties.map((d) => {
          const duration = durationLabel(d.start_time, d.end_time);
          return (
            <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-brand-accent px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wide text-xs text-brand-accent-foreground">
                  Szczegóły służby
                </h3>
                <Badge variant="secondary" className="font-mono">{d.duty_number}</Badge>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <Field icon={Hash} label="Linia / brygada" value={`${d.route} / ${d.duty_number}`} mono />
                <Field icon={Bus} label="Pojazd" value={d.vehicle_label ?? "—"} mono />
                <Field icon={Building2} label="Zajezdnia" value={d.depot} />
                <Field icon={Clock} label="Czas służby" value={duration ?? "—"} />
              </div>

              {d.notes && (
                <div className="px-6 py-4 bg-muted/40 border-t border-border">
                  <div className="flex items-start gap-2 text-sm">
                    <StickyNote className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">
                        Informacje dodatkowe
                      </div>
                      <div>{d.notes}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-6 py-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/sluzba/$dutyId/mapa" params={{ dutyId: d.id }}>
                    <MapPin className="size-4 mr-2" /> Mapa trasy
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link
                    to="/sluzba/$dutyId/rozklad"
                    params={{ dutyId: d.id }}
                    search={{ route: d.route, start: d.start_time?.slice(0, 5) }}
                  >
                    <CalendarDays className="size-4 mr-2" /> Rozkład jazdy
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/sluzba/$dutyId/raport" params={{ dutyId: d.id }}>
                    <FileText className="size-4 mr-2" /> Złóż raport
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start text-destructive hover:text-destructive">
                  <Link to="/sluzba/$dutyId/zdarzenie" params={{ dutyId: d.id }}>
                    <AlertTriangle className="size-4 mr-2" /> Zdarzenie drogowe
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold mb-1">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`text-lg font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
