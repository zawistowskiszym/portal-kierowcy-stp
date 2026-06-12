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

// Monday-first order
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

type AvailType = "unavailable" | "preferred" | null;

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

  // Infer per-weekday type from the next occurrence in the window
  const pattern = useMemo(() => {
    const map = new Map<string, AvailType>();
    for (const row of (data ?? []) as any[]) map.set(row.day, row.type);
    const result: Record<number, AvailType> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    const seen = new Set<number>();
    for (let i = 0; i < WEEKS_AHEAD * 7 && seen.size < 7; i++) {
      const d = new Date(range.today);
      d.setDate(range.today.getDate() + i);
      const w = d.getDay();
      if (seen.has(w)) continue;
      const iso = toIso(d);
      if (map.has(iso)) {
        result[w] = map.get(iso) ?? null;
      }
      seen.add(w);
    }
    return result;
  }, [data, range]);

  const cycle = async (weekday: number) => {
    if (busy) return;
    const cur = pattern[weekday];
    const next: AvailType = cur === null ? "unavailable" : cur === "unavailable" ? "preferred" : null;
    setBusy(true);
    try {
      const ops: Promise<any>[] = [];
      for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
        const d = new Date(range.today);
        d.setDate(range.today.getDate() + i);
        if (d.getDay() !== weekday) continue;
        ops.push(setFn({ data: { day: toIso(d), type: next } }));
      }
      await Promise.all(ops);
      qc.invalidateQueries({ queryKey: ["my-availability"] });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  const labelFor = (t: AvailType) =>
    t === "unavailable" ? "Niedostępny" : t === "preferred" ? "Preferowany" : "Dostępny";

  const classFor = (t: AvailType) =>
    t === "unavailable"
      ? "bg-destructive/15 border-destructive/40 text-destructive"
      : t === "preferred"
        ? "bg-primary/15 border-primary/40 text-primary"
        : "bg-card border-border hover:bg-muted/50";

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Moja dyspozycyjność</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Wybierz dni tygodnia. Ustawienie zostanie zastosowane do najbliższych {WEEKS_AHEAD} tygodni.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-card border border-border" /> Dostępny</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-destructive/15 border border-destructive/40" /> Niedostępny</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-primary/15 border border-primary/40" /> Preferowany</span>
        <span className="text-muted-foreground">Kliknij dzień, aby zmienić.</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
        {DAYS.map((d) => {
          const t = pattern[d.idx];
          return (
            <button
              key={d.idx}
              type="button"
              disabled={busy}
              onClick={() => cycle(d.idx)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md border transition disabled:opacity-50 ${classFor(t)}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm w-8 text-left">{d.short}</span>
                <span className="font-medium">{d.long}</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">{labelFor(t)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
