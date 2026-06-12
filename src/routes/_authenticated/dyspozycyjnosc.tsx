import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listMyAvailability, setMyAvailability } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/dyspozycyjnosc")({
  head: () => ({ meta: [{ title: "Dyspozycyjność — Portal STP" }] }),
  component: AvailabilityPage,
});

const DAYS = [
  { idx: 1, short: "Pn", long: "Poniedziałek" },
  { idx: 2, short: "Wt", long: "Wtorek" },
  { idx: 3, short: "Śr", long: "Środa" },
  { idx: 4, short: "Cz", long: "Czwartek" },
  { idx: 5, short: "Pt", long: "Piątek" },
  { idx: 6, short: "Sb", long: "Sobota" },
  { idx: 0, short: "Nd", long: "Niedziela" },
];

const WEEKS_AHEAD = 12;

// Two-state model:
// available = row exists with type='preferred'
// unavailable = no row (or type='unavailable')
type DayState = "available" | "unavailable";

function toIso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function AvailabilityPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAvailability);
  const setFn = useServerFn(setMyAvailability);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(today.getDate() + WEEKS_AHEAD * 7 - 1);
    return { from: toIso(today), to: toIso(end), today };
  }, []);

  const { data } = useQuery({
    queryKey: ["my-availability", range.from, range.to],
    queryFn: () => listFn({ data: { from: range.from, to: range.to } }),
  });

  // Infer per-weekday state from the next occurrence.
  const pattern = useMemo(() => {
    const map = new Map<string, DayState>();
    for (const row of (data ?? []) as any[]) {
      map.set(row.day, row.type === "preferred" ? "available" : "unavailable");
    }
    const result: Record<number, DayState> = { 0: "unavailable", 1: "unavailable", 2: "unavailable", 3: "unavailable", 4: "unavailable", 5: "unavailable", 6: "unavailable" };
    const seen = new Set<number>();
    for (let i = 0; i < WEEKS_AHEAD * 7 && seen.size < 7; i++) {
      const d = new Date(range.today);
      d.setDate(range.today.getDate() + i);
      const w = d.getDay();
      if (seen.has(w)) continue;
      const iso = toIso(d);
      if (map.has(iso)) result[w] = map.get(iso) ?? "unavailable";
      seen.add(w);
    }
    return result;
  }, [data, range]);

  const toggle = async (weekday: number) => {
    if (busy) return;
    const cur = pattern[weekday];
    const next: DayState = cur === "available" ? "unavailable" : "available";
    setBusy(true);
    try {
      const ops: Promise<any>[] = [];
      for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
        const d = new Date(range.today);
        d.setDate(range.today.getDate() + i);
        if (d.getDay() !== weekday) continue;
        // Available => set 'preferred'; Unavailable => clear row (null)
        ops.push(setFn({ data: { day: toIso(d), type: next === "available" ? "preferred" : null } }));
      }
      await Promise.all(ops);
      qc.invalidateQueries({ queryKey: ["my-availability"] });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Moja dyspozycyjność</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Domyślnie wszystkie dni są ustawione jako <strong>Niedostępny</strong>.
          Kliknij dzień, aby oznaczyć go jako <strong>Dostępny</strong>. Zmiana
          obejmie najbliższych {WEEKS_AHEAD} tygodni.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-muted border border-border" /> Niedostępny (domyślnie)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-emerald-500/20 border border-emerald-500/40" /> Dostępny
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
        {DAYS.map((d) => {
          const t = pattern[d.idx];
          const isAvail = t === "available";
          return (
            <button
              key={d.idx}
              type="button"
              disabled={busy}
              onClick={() => toggle(d.idx)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md border transition disabled:opacity-50 ${
                isAvail
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm w-8 text-left">{d.short}</span>
                <span className="font-medium">{d.long}</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                {isAvail ? "Dostępny" : "Niedostępny"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
