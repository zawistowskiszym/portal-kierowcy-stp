import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRobloxLive, requestVehicleSpawn } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bus, Loader2 } from "lucide-react";

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

const LIVE_LABEL: Record<string, string> = {
  scheduled: "Zaplanowana",
  in_progress: "W trakcie",
  on_break: "Przerwa",
  completed: "Zakończona",
  cancelled: "Anulowana",
};

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
  const cmds: any[] = d.commands ?? [];

  const liveActive = duty && (duty.live_status === "in_progress" || duty.live_status === "on_break");
  const isFresh = pos?.updated_at && Date.now() - new Date(pos.updated_at).getTime() < 60_000;

  const qc = useQueryClient();
  const spawnFn = useServerFn(requestVehicleSpawn);
  const pendingSpawn = cmds.find(
    (c) => c.type === "spawn_vehicle" && !c.acked_at,
  );
  const spawnMut = useMutation({
    mutationFn: () => spawnFn(),
    onSuccess: (res: any) => {
      toast.success(
        res?.reused
          ? "Zlecenie już oczekuje w kolejce gry."
          : "Wysłano zlecenie spawnu pojazdu. Pojazd pojawi się w grze w ciągu kilku sekund.",
      );
      qc.invalidateQueries({ queryKey: ["pulpit", "roblox-live"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Nie udało się zlecić spawnu."),
  });

  const canSpawn = !!duty?.vehicle_label;

  return (
    <section className="col-span-12 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-brand-accent px-4 py-3 flex justify-between items-center gap-3 flex-wrap">
        <h2 className="font-bold uppercase tracking-wide text-xs text-brand-accent-foreground">
          Roblox — telemetria na żywo
        </h2>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={!canSpawn || spawnMut.isPending}
            onClick={() => spawnMut.mutate()}
            title={
              canSpawn
                ? "Wyślij do gry polecenie spawnu Twojego pojazdu"
                : "Brak przypisanego pojazdu na dzisiejszą służbę"
            }
            className="h-7 gap-1.5"
          >
            {spawnMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bus className="h-3.5 w-3.5" />
            )}
            {pendingSpawn ? "Spawn w kolejce…" : "Spawnuj pojazd w grze"}
          </Button>
          <span className="flex items-center gap-2 text-[10px] text-brand-accent-foreground/90 font-mono">
            <span className={`h-2 w-2 rounded-full ${isFresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"}`} />
            {isFresh ? "LIVE" : "BRAK SYGNAŁU"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Ładowanie…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Presence */}
          <div className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Status kierowcy</p>
            <p className="text-lg font-bold">
              {pres?.status ? STATUS_LABEL[pres.status] ?? pres.status : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{fmtAgo(pres?.updated_at)}</p>
            {pres?.note && <p className="text-xs mt-2 italic">{pres.note}</p>}
          </div>

          {/* Duty live */}
          <div className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Służba</p>
            {duty ? (
              <>
                <p className="text-lg font-bold">
                  {LIVE_LABEL[duty.live_status as string] ?? duty.live_status ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {duty.duty_number} · {duty.route}
                </p>
                <p className="text-xs text-muted-foreground">{fmtAgo(duty.live_status_updated_at)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak aktywnej służby</p>
            )}
          </div>

          {/* PIS */}
          <div className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">PIS / Trasa</p>
            {duty?.pis_route ? (
              <>
                <p className="text-lg font-bold">
                  {duty.pis_route}
                  {duty.pis_headsign && (
                    <span className="text-sm text-muted-foreground font-normal"> → {duty.pis_headsign}</span>
                  )}
                </p>
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground">Obecny:</span> {duty.pis_current_stop ?? "—"}
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Następny:</span> {duty.pis_next_stop ?? "—"}
                </p>
                {typeof duty.pis_delay_sec === "number" && (
                  <Badge
                    variant="secondary"
                    className={
                      "mt-2 " +
                      (duty.pis_delay_sec > 180
                        ? "bg-destructive/15 text-destructive"
                        : duty.pis_delay_sec > 60
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")
                    }
                  >
                    {duty.pis_delay_sec > 0 ? "+" : ""}
                    {Math.round(duty.pis_delay_sec / 60)} min
                  </Badge>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{fmtAgo(duty.pis_updated_at)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych PIS</p>
            )}
          </div>

          {/* Position */}
          <div className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Pozycja w grze</p>
            {pos ? (
              <>
                <p className="text-lg font-bold font-mono">
                  {typeof pos.speed_kmh === "number" ? Math.round(pos.speed_kmh) : "—"}{" "}
                  <span className="text-sm text-muted-foreground font-normal">km/h</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  X {Math.round(pos.x)} · Y {Math.round(pos.y)}
                  {typeof pos.z === "number" && <> · Z {Math.round(pos.z)}</>}
                </p>
                {typeof pos.heading === "number" && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Kurs {Math.round(pos.heading)}°
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{fmtAgo(pos.updated_at)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak pozycji</p>
            )}
          </div>
        </div>
      )}

      {cmds.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">
            Ostatnie polecenia z dyspozytorni
          </p>
          <ul className="space-y-1">
            {cmds.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-xs">
                <span className="font-mono">{c.type}</span>
                <span className="text-muted-foreground">
                  {c.acked_at
                    ? `✓ potwierdzone ${fmtAgo(c.acked_at)}`
                    : c.delivered_at
                      ? `dostarczone ${fmtAgo(c.delivered_at)}`
                      : `oczekuje ${fmtAgo(c.created_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
