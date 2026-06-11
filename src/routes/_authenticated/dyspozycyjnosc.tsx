import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listMyAvailability, setMyAvailability } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/dyspozycyjnosc")({
  head: () => ({ meta: [{ title: "Dyspozycyjność — Portal STP" }] }),
  component: AvailabilityPage,
});

const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];
const DOW_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

function toIso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function AvailabilityPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAvailability);
  const setFn = useServerFn(setMyAvailability);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  const range = useMemo(() => {
    const from = toIso(new Date(cursor.y, cursor.m, 1));
    const to = toIso(new Date(cursor.y, cursor.m + 1, 0));
    return { from, to };
  }, [cursor]);

  const { data } = useQuery({
    queryKey: ["my-availability", range.from, range.to],
    queryFn: () => listFn({ data: range }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, { type: "unavailable" | "preferred" }>();
    for (const row of (data ?? []) as any[]) map.set(row.day, { type: row.type });
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const items: ({ iso: string; day: number } | null)[] = [];
    for (let i = 0; i < startOffset; i++) items.push(null);
    for (let d = 1; d <= daysIn; d++) {
      items.push({ iso: toIso(new Date(cursor.y, cursor.m, d)), day: d });
    }
    return items;
  }, [cursor]);

  const cycle = async (iso: string) => {
    const cur = byDay.get(iso)?.type ?? null;
    const next = cur === null ? "unavailable" : cur === "unavailable" ? "preferred" : null;
    try {
      await setFn({ data: { day: iso, type: next } });
      qc.invalidateQueries({ queryKey: ["my-availability"] });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    }
  };

  const shift = (delta: number) => {
    const m = cursor.m + delta;
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Moja dyspozycyjność</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>←</Button>
          <div className="font-mono text-sm w-40 text-center">
            {MONTHS_PL[cursor.m]} {cursor.y}
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(1)}>→</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-card border border-border" /> Dostępny</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-destructive/15 border border-destructive/40" /> Niedostępny</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-primary/15 border border-primary/40" /> Preferowany</span>
        <span className="text-muted-foreground">Kliknij dzień, aby zmienić.</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {DOW_PL.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const entry = byDay.get(c.iso);
            const cls =
              entry?.type === "unavailable"
                ? "bg-destructive/15 border-destructive/40 text-destructive-foreground/90"
                : entry?.type === "preferred"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-card border-border hover:bg-muted/50";
            return (
              <button
                type="button"
                key={c.iso}
                onClick={() => cycle(c.iso)}
                className={`aspect-square rounded-md border text-sm font-mono transition ${cls}`}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
