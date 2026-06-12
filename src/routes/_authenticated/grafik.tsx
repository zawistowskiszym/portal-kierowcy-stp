import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getMyDutiesInRange } from "@/lib/portal.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  CalendarDays,
  FileText,
  AlertTriangle,
  Bus,
  Hash,
  Clock,
  StickyNote,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/grafik")({
  head: () => ({ meta: [{ title: "Mój grafik — Portal STP" }] }),
  component: GrafikPage,
});

// ── Main page ──────────────────────────────────────────────────────────────

function GrafikPage() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
      }),
    [today],
  );

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
  const [pisDialogDuty, setPisDialogDuty] = useState<any | null>(null);
  const selectedDuties = byDate.get(selectedIso) ?? [];

  const isToday = selectedIso === isoDate(today);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Mój grafik</h2>
        <p className="text-sm text-muted-foreground">
          Najbliższe 7 dni — wybierz dzień, aby zobaczyć szczegóły służby.
        </p>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const iso = isoDate(d);
          const items = byDate.get(iso) ?? [];
          const isSelected = iso === selectedIso;
          const isTodayDay = iso === isoDate(today);
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
              <div
                className={`text-[10px] font-bold uppercase ${isSelected ? "opacity-80" : "text-muted-foreground"}`}
              >
                {PL_DOW[d.getDay()]}{" "}
                {isTodayDay && !isSelected && (
                  <span className="text-brand-accent">• dziś</span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono leading-tight mt-1">
                {d.getDate()}
              </div>
              <div
                className={`text-[10px] font-mono ${isSelected ? "opacity-80" : "text-muted-foreground"}`}
              >
                {PL_MONTHS_SHORT[d.getMonth()]}
              </div>
              <div className="mt-2">
                {items.length > 0 ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-brand-foreground/20"
                        : "bg-brand/10 text-brand"
                    }`}
                  >
                    {items.length === 1 ? items[0].route : `${items.length} służb`}
                  </span>
                ) : (
                  <span
                    className={`text-[10px] ${isSelected ? "opacity-70" : "text-muted-foreground"}`}
                  >
                    wolne
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Duty cards */}
      <div className="space-y-4">
        {selectedDuties.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground shadow-sm">
            Brak przypisanej służby w wybranym dniu.
          </div>
        ) : (
          selectedDuties.map((d) => {
            const duration = durationLabel(d.start_time, d.end_time);
            const canStart = isToday;
            const isActive = d.live_status === "on_route";
            const isCompleted = d.live_status === "completed";

            return (
              <div
                key={d.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header */}
                <div className="bg-brand-accent px-4 py-3 flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wide text-xs text-brand-accent-foreground">
                    Szczegóły służby
                  </h3>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40 border text-[10px]">
                        ● W trasie
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="secondary" className="text-[10px]">
                        ✓ Zakończona
                      </Badge>
                    )}
                    <Badge variant="secondary" className="font-mono">
                      {d.duty_number}
                    </Badge>
                  </div>
                </div>

                {/* Info grid */}
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Field
                    icon={Hash}
                    label="Linia / służba"
                    value={`${d.route} / ${d.duty_number}`}
                    mono
                  />
                  <Field
                    icon={Bus}
                    label="Pojazd"
                    value={d.vehicle_label ?? "—"}
                    mono
                  />
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

                {/* Actions */}
                <div className="px-6 py-4 border-t border-border">
                  {/* Roblox start button — prominent, shown for today's duties */}
                  {canStart && !isCompleted && (
                    <div className="mb-4">
                      <button
                        onClick={() => setPisDialogDuty(d)}
                        className={[
                          "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-sm transition-all active:scale-[0.98]",
                          isActive
                            ? "bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/25"
                            : "bg-brand text-brand-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] hover:brightness-110",
                        ].join(" ")}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="size-4" />
                            Służba aktywna — zarządzaj
                          </>
                        ) : (
                          <>
                            <Play className="size-4" />
                            Rozpocznij służbę
                            <Gamepad2 className="size-4 opacity-70 ml-1" />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Secondary actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button asChild variant="outline" className="justify-start">
                      <Link
                        to="/sluzba/$dutyId/mapa"
                        params={{ dutyId: d.id }}
                      >
                        <MapPin className="size-4 mr-2" /> Mapa trasy
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <Link
                        to="/sluzba/$dutyId/rozklad"
                        params={{ dutyId: d.id }}
                        search={{
                          route: d.route,
                          start: d.start_time?.slice(0, 5),
                        }}
                      >
                        <CalendarDays className="size-4 mr-2" /> Rozkład jazdy
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <Link
                        to="/sluzba/$dutyId/raport"
                        params={{ dutyId: d.id }}
                      >
                        <FileText className="size-4 mr-2" /> Złóż raport
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="justify-start text-destructive hover:text-destructive"
                    >
                      <Link
                        to="/sluzba/$dutyId/zdarzenie"
                        params={{ dutyId: d.id }}
                      >
                        <AlertTriangle className="size-4 mr-2" /> Zdarzenie
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Roblox PIS dialog */}
      {pisDialogDuty && (
        <RobloxPISDialog
          duty={pisDialogDuty}
          open={!!pisDialogDuty}
          onOpenChange={(v) => { if (!v) setPisDialogDuty(null); }}
        />
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold mb-1">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`text-lg font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
