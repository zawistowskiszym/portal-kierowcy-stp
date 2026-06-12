import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRobloxLive } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s temu`;
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  return `${Math.floor(s / 3600)} h temu`;
}

const STATUS_LABEL: Record<string, string> = {
  on_duty: "Na służbie",
  off_duty: "Po służbie",
  on_break: "Przerwa",
  available: "Dostępny",
  unavailable: "Niedostępny",
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between font-mono text-xs">
        <span className="text-muted-foreground">{value} / {total} przystanków</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-brand-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RobloxLivePanel() {
  const fn = useServerFn(getMyRobloxLive);
  const { data, isLoading } = useQuery({
    queryKey: ["pulpit", "roblox-live"],
    queryFn: () => fn(),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const d: any = data ?? {};
  const duty = d.duty;
  const pos = d.position;
  const pres = d.presence;

  const onDuty = !!duty?.pis_route || pres?.status === "on_duty" || pres?.status === "active";
  const isFresh = duty?.pis_updated_at && Date.now() - new Date(duty.pis_updated_at).getTime() < 60_000;
  const stopIdx = typeof duty?.pis_stop_index === "number" ? duty.pis_stop_index : null;
  const stopTotal = typeof duty?.pis_total_stops === "number" ? duty.pis_total_stops : null;

  return (
    <section className="col-span-12 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-brand-accent px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold uppercase tracking-wide text-xs text-brand-accent-foreground">
          Bieżąca służba — dane z gry
        </h2>
        <span className="flex items-center gap-2 text-[10px] text-brand-accent-foreground/90 font-mono">
          <span className={`h-2 w-2 rounded-full ${isFresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"}`} />
          {isFresh ? "LIVE" : "BRAK SYGNAŁU"}
        </span>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Ładowanie…</div>
      ) : !onDuty && !duty?.pis_route ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Nie jesteś teraz na służbie. Po wejściu do gry i rozpoczęciu kursu pojawią się tu dane na żywo.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5">
              <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Linia</p>
              <p className="text-4xl font-bold font-mono leading-none">
                {duty?.pis_route ?? duty?.route ?? "—"}
              </p>
              {duty?.duty_number && (
                <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Brygada {duty.duty_number}
                </p>
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Kierunek</p>
              <p className="text-xl font-bold leading-tight">
                {duty?.pis_headsign ?? "—"}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Obecny przystanek</p>
              <p className="text-base font-bold leading-tight">
                {duty?.pis_current_stop ?? "—"}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Następny przystanek</p>
              <p className="text-base font-bold leading-tight">
                {duty?.pis_next_stop ?? "—"}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border space-y-3">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Postęp trasy</p>
            {stopIdx !== null && stopTotal !== null && stopTotal > 0 ? (
              <ProgressBar value={stopIdx} total={stopTotal} />
            ) : (
              <p className="text-xs text-muted-foreground">Brak danych o postępie z gry.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-muted-foreground">
              <span>Status: <span className="font-bold text-foreground">{pres?.status ? STATUS_LABEL[pres.status] ?? pres.status : "—"}</span></span>
              {typeof pos?.speed_kmh === "number" && (
                <span>· {Math.round(pos.speed_kmh)} km/h</span>
              )}
              {typeof duty?.pis_delay_sec === "number" && (
                <Badge
                  variant="secondary"
                  className={
                    duty.pis_delay_sec > 180
                      ? "bg-destructive/15 text-destructive"
                      : duty.pis_delay_sec > 60
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  }
                >
                  {duty.pis_delay_sec > 0 ? "+" : ""}{Math.round(duty.pis_delay_sec / 60)} min
                </Badge>
              )}
              <span className="ml-auto">Aktualizacja {fmtAgo(duty?.pis_updated_at)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
