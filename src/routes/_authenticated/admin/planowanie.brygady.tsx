import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listLines, listBlocks, generateBlocks, getBlockTrips, generateDutiesFromBlocks,
} from "@/lib/planning.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planowanie/brygady")({
  component: BlocksPage,
});

const DAY_TYPES = [
  { value: "weekday", label: "Robocze" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Niedz./Św." },
] as const;

function BlocksPage() {
  const linesFn = useServerFn(listLines);
  const blocksFn = useServerFn(listBlocks);
  const genFn = useServerFn(generateBlocks);
  const genDutiesFn = useServerFn(generateDutiesFromBlocks);
  const qc = useQueryClient();

  const [lineId, setLineId] = useState<string>("");
  const [dayType, setDayType] = useState<"weekday" | "saturday" | "sunday">("weekday");

  const { data: lines = [] } = useQuery({ queryKey: ["lines"], queryFn: () => linesFn({}) });
  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks", lineId, dayType],
    queryFn: () => blocksFn({ data: { line_id: lineId || undefined, day_type: dayType } }),
  });

  const gen = useMutation({
    mutationFn: () => genFn({ data: { line_id: lineId, day_type: dayType } }),
    onSuccess: (r: any) => {
      toast.success(`Wygenerowano ${r.count} brygad. RT: ${r.round_trip_min} min`);
      qc.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const next30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(next30);
  const [replace, setReplace] = useState(false);
  const [maxDutyMin, setMaxDutyMin] = useState(480);
  const [splitBreakMin, setSplitBreakMin] = useState(30);

  const genDuties = useMutation({
    mutationFn: () => genDutiesFn({ data: {
      day_type: dayType, date_from: from, date_to: to,
      replace_existing: replace,
      max_duty_minutes: maxDutyMin,
      split_break_minutes: splitBreakMin,
    } }),
    onSuccess: (r: any) => toast.success(`Utworzono ${r.inserted} służb${r.max_parts_per_block > 1 ? ` (do ${r.max_parts_per_block} części/brygada)` : ""}`),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Linia (do generowania)</Label>
            <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">— wybierz —</option>
              {lines.map((l: any) => (<option key={l.id} value={l.id}>{l.line_number}</option>))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Typ dnia</Label>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              {DAY_TYPES.map(d => (
                <button key={d.value} onClick={() => setDayType(d.value)}
                  className={`px-3 py-1 text-xs rounded ${dayType === d.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => gen.mutate()} disabled={!lineId || gen.isPending}>
            <Sparkles className="size-4 mr-1" /> {gen.isPending ? "Generowanie…" : "Generuj brygady"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Generator obliczy czas obiegu, liczbę pojazdów i przypisze kursy do brygad zgodnie z ustawionym rozkładem i przerwami na krańcach.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2"><Calendar className="size-4" /> Generator służb</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label className="text-xs">Od</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">Do</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Maks. czas służby (min)</Label>
            <Input type="number" min={60} max={900} className="w-28" value={maxDutyMin} onChange={(e) => setMaxDutyMin(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Przerwa między częściami (min)</Label>
            <Input type="number" min={0} max={180} className="w-28" value={splitBreakMin} onChange={(e) => setSplitBreakMin(Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 pb-2">
            <Switch checked={replace} onCheckedChange={setReplace} />
            <span className="text-xs">Zastąp istniejące w zakresie</span>
          </label>
          <Button variant="outline" onClick={() => genDuties.mutate()} disabled={genDuties.isPending}>
            {genDuties.isPending ? "Tworzenie…" : "Utwórz służby z brygad"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Brygady dłuższe niż maksymalny czas służby zostaną podzielone na części (1a, 1b…) z zachowaniem przerwy między nimi, żeby jeden kierowca nie pracował całego dnia.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-sm">Brygady ({blocks.length})</h3>
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Brak brygad.</div>
        ) : (
          blocks.map((b: any) => <BlockRow key={b.id} block={b} />)
        )}
      </div>
    </div>
  );
}

function BlockRow({ block }: { block: any }) {
  const [open, setOpen] = useState(false);
  const get = useServerFn(getBlockTrips);
  const { data: trips = [] } = useQuery({
    queryKey: ["block-trips", block.id],
    queryFn: () => get({ data: { block_id: block.id } }),
    enabled: open,
  });
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <span className="font-mono font-bold">{(block.line_numbers as string[]).join("+")}/{block.block_number}</span>
          <span className="text-xs text-muted-foreground">{block.day_type}</span>
        </div>
        <span className="text-sm text-muted-foreground">{block.start_time?.slice(0, 5)}–{block.end_time?.slice(0, 5)}</span>
      </button>
      {open && (
        <div className="border-t border-border p-3 space-y-1">
          {trips.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ładowanie kursów…</p>
          ) : (
            trips.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-12">{t.departure_time.slice(0, 5)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="w-12">{t.arrival_time.slice(0, 5)}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t.line_number}</span>
                <span className="text-muted-foreground">{t.direction}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
