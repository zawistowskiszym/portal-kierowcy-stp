import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { listLines, getTimetables, upsertTimetable } from "@/lib/planning.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planowanie/rozklady")({
  component: TimetablesPage,
});

const DAY_TYPES = [
  { value: "weekday", label: "Dzień roboczy" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Niedziela / święto" },
] as const;

function TimetablesPage() {
  const linesFn = useServerFn(listLines);
  const { data: lines = [] } = useQuery({ queryKey: ["lines"], queryFn: () => linesFn({}) });
  const [lineId, setLineId] = useState<string>("");
  const [dayType, setDayType] = useState<"weekday" | "saturday" | "sunday">("weekday");

  useEffect(() => {
    if (!lineId && lines.length) setLineId(lines[0].id);
  }, [lines, lineId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          {lines.map((l: any) => (<option key={l.id} value={l.id}>Linia {l.line_number}</option>))}
        </select>
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {DAY_TYPES.map(d => (
            <button key={d.value}
              onClick={() => setDayType(d.value)}
              className={`px-3 py-1 text-xs rounded ${dayType === d.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      {lineId && <TimetableEditor lineId={lineId} dayType={dayType} key={`${lineId}-${dayType}`} />}
    </div>
  );
}

function TimetableEditor({ lineId, dayType }: { lineId: string; dayType: "weekday" | "saturday" | "sunday" }) {
  const qc = useQueryClient();
  const get = useServerFn(getTimetables);
  const upsert = useServerFn(upsertTimetable);

  const { data } = useQuery({
    queryKey: ["timetables", lineId],
    queryFn: () => get({ data: { line_id: lineId } }),
  });

  const tt = data?.timetables.find((t: any) => t.day_type === dayType);
  const windowsAll = data?.windows ?? [];
  const windows = tt ? windowsAll.filter((w: any) => w.timetable_id === tt.id) : [];

  const [first, setFirst] = useState("05:00");
  const [last, setLast] = useState("23:00");
  const [layA, setLayA] = useState(5);
  const [layB, setLayB] = useState(5);
  const [rows, setRows] = useState<Array<{ start_time: string; end_time: string; headway_min: number }>>([
    { start_time: "05:00", end_time: "09:00", headway_min: 15 },
  ]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      if (tt) {
        setFirst(tt.first_departure?.slice(0, 5) ?? "05:00");
        setLast(tt.last_departure?.slice(0, 5) ?? "23:00");
        setLayA(tt.layover_a_min ?? 5);
        setLayB(tt.layover_b_min ?? 5);
        if (windows.length) {
          setRows(windows.map((w: any) => ({
            start_time: w.start_time.slice(0, 5),
            end_time: w.end_time.slice(0, 5),
            headway_min: w.headway_min,
          })));
        }
      }
      setLoaded(true);
    }
  }, [data, tt, windows, loaded]);

  const save = useMutation({
    mutationFn: () => upsert({
      data: {
        line_id: lineId, day_type: dayType,
        first_departure: first + ":00", last_departure: last + ":00",
        layover_a_min: layA, layover_b_min: layB,
        windows: rows.map(r => ({ start_time: r.start_time + ":00", end_time: r.end_time + ":00", headway_min: r.headway_min })),
      },
    }),
    onSuccess: () => {
      toast.success("Zapisano rozkład");
      qc.invalidateQueries({ queryKey: ["timetables", lineId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="grid sm:grid-cols-4 gap-3">
        <div><Label>Pierwszy odjazd</Label><Input type="time" value={first} onChange={(e) => setFirst(e.target.value)} /></div>
        <div><Label>Ostatni odjazd</Label><Input type="time" value={last} onChange={(e) => setLast(e.target.value)} /></div>
        <div><Label>Przerwa na A (min)</Label><Input type="number" min={0} value={layA} onChange={(e) => setLayA(Number(e.target.value))} /></div>
        <div><Label>Przerwa na B (min)</Label><Input type="number" min={0} value={layB} onChange={(e) => setLayB(Number(e.target.value))} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Okna częstotliwości</Label>
          <Button size="sm" variant="outline" onClick={() => setRows([...rows, { start_time: "09:00", end_time: "15:00", headway_min: 20 }])}>
            <Plus className="size-4 mr-1" /> Dodaj okno
          </Button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input type="time" value={r.start_time} onChange={(e) => { const n = [...rows]; n[i] = { ...n[i], start_time: e.target.value }; setRows(n); }} />
              <span className="text-muted-foreground">–</span>
              <Input type="time" value={r.end_time} onChange={(e) => { const n = [...rows]; n[i] = { ...n[i], end_time: e.target.value }; setRows(n); }} />
              <span className="text-xs text-muted-foreground">co</span>
              <Input type="number" min={1} className="w-20" value={r.headway_min} onChange={(e) => { const n = [...rows]; n[i] = { ...n[i], headway_min: Number(e.target.value) }; setRows(n); }} />
              <span className="text-xs text-muted-foreground">min</span>
              <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Zapisywanie…" : "Zapisz rozkład"}
        </Button>
      </div>
    </div>
  );
}
